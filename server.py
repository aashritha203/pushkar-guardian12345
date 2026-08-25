import os
import sys
import time
import threading
import subprocess
import datetime

import base64

import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO

import firebase_admin
from firebase_admin import credentials, db, auth as admin_auth

import smtplib
from email.mime.text import MIMEText
import random
import torch
torch.set_num_threads(1)

SMTP_EMAIL = "aashritha203@gmail.com"
SMTP_APP_PASSWORD = os.environ.get("SMTP_APP_PASSWORD", "")

_otp_store = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes

if not firebase_admin._apps:
    try:
        import os
        key_path = "serviceAccountKey.json"
        if not os.path.exists(key_path) and os.path.exists("serviceAccountKey.json.json"):
            key_path = "serviceAccountKey.json.json"
        cred = credentials.Certificate(key_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://pushkaralu-crowd-monitor-default-rtdb.firebaseio.com'
        })
    except Exception as e:
        print(f"[server] Warning: Firebase init failed - {e}")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

_lock = threading.Lock()
_ghat_threads = {}
_ghat_stop_events = {}
_ghat_counts = {}
_ghat_statuses = {}
_ghat_snapshots = {}

TEST_ALERT_THRESHOLD = 10  # TEMPORARY test value — change to real capacity logic later
_alert_sent_state = {}  # ghat_id -> True/False (whether already alerted for current crossing)

ALERT_PHONE_NUMBERS = ["+919999999999"] # Mock operator number

def _get_subscribers_for_ghat(ghat_id):
    try:
        ref = db.reference(f'alert_subscriptions/{ghat_id}')
        data = ref.get()
        if not data:
            return []
        return list(data.keys())  # phone numbers
    except Exception as e:
        print(f"[alert] Failed to fetch subscribers for {ghat_id}: {e}")
        return []

def _send_sms_via_msg91(number, message):
    # Simulated SMS send for testing
    print(f"[MSG91-MOCK] Sending SMS to {number}: {message}")

def _send_user_alert(ghat_id, ghat_name, count):
    message = f"⚠️ High Crowd Alert: {ghat_name} currently has {count} people. Please consider an alternative ghat."
    numbers = _get_subscribers_for_ghat(ghat_id)
    print(f"[alert] Notifying {len(numbers)} subscribers of {ghat_name}")
    for number in numbers:
        _send_sms_via_msg91(number, message)

def _send_admin_alert(ghat_name, count):
    message = f"🚨 Crowd threshold exceeded at {ghat_name} — {count} people detected."
    for number in ALERT_PHONE_NUMBERS:  # operator numbers list
        _send_sms_via_msg91(number, message)


def _send_otp_email(to_email):
    otp = str(random.randint(100000, 999999))
    _otp_store[to_email] = {
        "otp": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS
    }

    import datetime
    subject = f"Godavari Pushkaralu Login OTP - {datetime.datetime.now().strftime('%H:%M:%S')}"
    body = f"Your OTP code is: {otp}\n\nThis code expires in 5 minutes."

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_APP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[otp] Failed to send OTP email: {e}")
        return False


SNAPSHOT_INTERVAL = 15

print("[server] Loading YOLO model...")
try:
    model = YOLO("yolov8x.pt")
    print("[server] YOLOv8x loaded.")
except Exception:
    print("[server] Falling back to yolov8n.pt...")
    try:
        model = YOLO("yolov8n.pt")
        print("[server] yolov8n loaded.")
    except Exception as exc:
        print(f"[server] FATAL: No YOLO model found — {exc}")
        sys.exit(1)


def _grab_live_frame(youtube_url: str, seek_seconds: int):
    """
    Grabs ONE frame from a YouTube stream at a given seek position.
    """
    cap = None
    try:
        # Step 1: Get a progressive MP4 URL (format 18)
        print(f"[snapshot] Fetching stream URL...")
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--no-playlist",
            "--no-warnings",
            "--format", "bestvideo[protocol^=m3u8]/18/best[ext=mp4]/best",
            "--dump-json",
            youtube_url,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        try:
            import json
            info = json.loads(result.stdout)
            stream_url = info.get("url")
            is_live = info.get("is_live", False)
        except Exception:
            raise RuntimeError(f"yt-dlp failed to extract stream info. stderr: {result.stderr[:200]}")

        if not stream_url:
            raise RuntimeError("yt-dlp returned no URL.")

        # Step 2: Extract frame (handle m3u8 specially to avoid cv2 seek hangs)
        if ".m3u8" in stream_url:
            if is_live:
                print("[snapshot] True live HLS stream detected, using ffmpeg for live edge...")
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-live_start_index", "-1",
                    "-i", stream_url,
                    "-vframes", "1",
                    "-f", "image2pipe",
                    "-vcodec", "mjpeg",
                    "-"
                ]
            else:
                # Get duration from yt-dlp info if available, else assume large
                duration_s = info.get("duration", 0)
                actual_seek = seek_seconds
                if duration_s > 0:
                    safe_dur = max(10, int(duration_s - 10))
                    actual_seek = actual_seek % safe_dur
                print(f"[snapshot] VOD HLS stream detected, using ffmpeg to seek to {actual_seek}s...")
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-ss", str(actual_seek),
                    "-i", stream_url,
                    "-vframes", "1",
                    "-f", "image2pipe",
                    "-vcodec", "mjpeg",
                    "-"
                ]
            
            import numpy as np
            proc = subprocess.run(ffmpeg_cmd, capture_output=True, timeout=15)
            if proc.returncode == 0 and proc.stdout:
                frame = cv2.imdecode(np.frombuffer(proc.stdout, np.uint8), cv2.IMREAD_COLOR)
                if frame is not None:
                    print(f"[snapshot] Grabbed HLS frame! shape={frame.shape}")
                    return frame
            raise RuntimeError(f"ffmpeg extraction failed: {proc.stderr.decode()[:200]}")

        # Non-m3u8 streams (e.g. standard MP4) can use cv2 normally
        cap = cv2.VideoCapture(stream_url, cv2.CAP_FFMPEG)
        if not cap.isOpened():
            raise RuntimeError("cv2.VideoCapture could not open stream URL")

        total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        duration_s = total_frames / fps if fps > 0 else 0

        actual_seek = seek_seconds
        if duration_s > 0:
            safe_dur = max(10, int(duration_s - 10))
            actual_seek = actual_seek % safe_dur

        seek_ok = cap.set(cv2.CAP_PROP_POS_MSEC, actual_seek * 1000)
        print(f"[snapshot] DVR: {duration_s:.0f}s | Seek to {actual_seek}s: {'OK' if seek_ok else 'FAIL'}")

        ret, frame = cap.read()
        if not ret or frame is None:
            raise RuntimeError(f"cap.read() failed at seek={actual_seek}s")

        print(f"[snapshot] Grabbed frame! shape={frame.shape}")
        return frame

    except Exception as e:
        print(f"[snapshot] _grab_live_frame FAILED: {e}")
        return None
    finally:
        if cap is not None:
            cap.release()


def _run_inference(frame):
    h, w = frame.shape[:2]
    
    # Run inference directly on the full clear frame
    results = model.predict(
        frame,
        conf=0.40,      # raise from 0.25 to 0.40 — only count high-confidence detections
        iou=0.50,       # stricter NMS
        classes=[0],    # person only
        verbose=False,
        imgsz=1280,
        augment=False,
    )

    all_boxes = []
    all_scores = []

    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            score = float(box.conf[0])
            
            bw = int(x2 - x1)
            bh = int(y2 - y1)
            
            all_boxes.append([int(x1), int(y1), bw, bh])
            all_scores.append(score)

    # Global NMS
    final_indices = []
    if len(all_boxes) > 0:
        indices = cv2.dnn.NMSBoxes(all_boxes, all_scores, score_threshold=0.40, nms_threshold=0.50)
        
        if len(indices) > 0:
            indices = np.array(indices).flatten()
            
            # re-apply NMS on filtered results
            filtered_boxes = [all_boxes[idx] for idx in indices]
            filtered_scores = [all_scores[idx] for idx in indices]
            
            indices2 = cv2.dnn.NMSBoxes(filtered_boxes, filtered_scores, score_threshold=0.40, nms_threshold=0.60)
            
            if len(indices2) > 0:
                indices2 = np.array(indices2).flatten()
                final_indices = [indices[idx] for idx in indices2]

    valid_boxes = []
    for i in final_indices:
        x, y, bw, bh = all_boxes[i]
        # person must be roughly vertical (height > width)
        if bh < bw * 0.7:  # too wide to be a person, skip
            continue
        # person must be reasonable size (not tiny noise)
        if bh < 15 or bw < 8:  # too small, skip
            continue
        # confidence must be above 0.40
        if all_scores[i] < 0.40:
            continue
        valid_boxes.append(i)
        
    count = len(valid_boxes)
    annotated = frame.copy()

    for idx in valid_boxes:
        x, y, bw, bh = all_boxes[idx]
        score = all_scores[idx]
        
        x1, y1, x2, y2 = x, y, x + bw, y + bh
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            annotated, f"{score:.2f}",
            (x1, max(y1 - 5, 10)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 0), 1,
        )

    # Resize back to target_w for output stream to save bandwidth
    target_w = 1280
    scale = target_w / w
    target_h = int(h * scale)
    annotated_resized = cv2.resize(annotated, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
    
    cv2.rectangle(annotated_resized, (0, 0), (320, 48), (0, 0, 0), -1)
    cv2.putText(
        annotated_resized, f"Person count: {count}",
        (10, 32), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2,
    )
    return count, annotated_resized


def _snapshot_loop(raw_url: str, stop_evt: threading.Event, ghat_id: str):
    with _lock:
        _ghat_statuses[ghat_id] = "running"

    snapshot_index = 0
    base_seek = 30
    
    # Try to fetch point data from Firebase to get ghatName and cameraId
    ghatName = "Unknown Ghat"
    cameraId = ghat_id
    try:
        ref_data = db.reference(f'monitoring_points/{ghat_id}').get()
        if ref_data:
            ghatName = ref_data.get('ghatName', ghatName)
            cameraId = ref_data.get('cameraId', cameraId)
    except Exception as e:
        print(f"[{ghat_id}] Warning: Could not fetch ghat data from Firebase: {e}")

    while not stop_evt.is_set():
        tick_start = time.time()
        snapshot_index += 1
        seek_pos = base_seek + (snapshot_index - 1) * SNAPSHOT_INTERVAL
        print(f"\n[{ghat_id}] ── Snapshot #{snapshot_index} (seek={seek_pos}s) ──")

        count = 0
        status = "offline"
        
        try:
            frame = _grab_live_frame(raw_url, seek_pos)
            if frame is None:
                raise RuntimeError("Frame grab returned None")

            t0 = time.time()
            count, annotated = _run_inference(frame)
            infer_ms = int((time.time() - t0) * 1000)

            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 85])
            b64 = base64.b64encode(buffer).decode("utf-8")

            with _lock:
                _ghat_counts[ghat_id] = count
                _ghat_snapshots[ghat_id] = b64

            # --- TEST ALERT SYSTEM ---
            try:
                already_alerted = _alert_sent_state.get(ghat_id, False)

                if count > TEST_ALERT_THRESHOLD and not already_alerted:
                    _send_user_alert(ghat_id, ghatName, count)
                    _send_admin_alert(ghatName, count)
                    _alert_sent_state[ghat_id] = True
                    print(f"[test-alert] Sent test alert for {ghatName} at {count} people")
                elif count <= TEST_ALERT_THRESHOLD:
                    _alert_sent_state[ghat_id] = False
            except Exception as alert_err:
                print(f"[test-alert] Error sending alert: {alert_err}")
            # -------------------------

            status = "online"
            print(f"[{ghat_id}] ✓ #{snapshot_index} | Persons: {count} | seek={seek_pos}s | Inference: {infer_ms}ms | Next in {SNAPSHOT_INTERVAL}s")

        except Exception as exc:
            print(f"[{ghat_id}] ✗ #{snapshot_index} Error: {exc}")
            status = "offline"
            count = 0
            with _lock:
                _ghat_counts[ghat_id] = 0
                _ghat_snapshots[ghat_id] = None
                _ghat_statuses[ghat_id] = "offline"

        finally:
            try:
                now = datetime.datetime.now()
                timestamp = int(now.timestamp())
                date_str = now.strftime("%d-%m-%Y")
                time_str = now.strftime("%I:%M %p")

                payload = {
                    "headcount": count,
                    "timestamp": timestamp,
                    "date": date_str,
                    "time": time_str,
                    "ghatName": ghatName,
                    "cameraId": cameraId,
                    "streamURL": raw_url,
                    "status": status
                }
                
                # Push to detections
                db.reference(f'detections/{cameraId}').push(payload)
                
                # Overwrite latest_counts
                latest_payload = {
                    "headcount": count,
                    "timestamp": timestamp,
                    "cameraId": cameraId,
                    "ghatName": ghatName,
                    "status": status
                }
                db.reference(f'latest_counts/{cameraId}').set(latest_payload)
                
                # Also update headcount inside monitoring_points so it's visible there
                db.reference(f'monitoring_points/{ghat_id}').update({
                    "headcount": count,
                    "updatedAt": timestamp
                })
            except Exception as fb_exc:
                print(f"[{ghat_id}] ✗ Firebase Write Error: {fb_exc}")

        elapsed = time.time() - tick_start
        wait_time = max(0, SNAPSHOT_INTERVAL - elapsed)
        if wait_time > 0:
            print(f"[{ghat_id}] Cycle took {elapsed:.1f}s. Waiting {wait_time:.1f}s...")
        stop_evt.wait(wait_time)

    with _lock:
        _ghat_statuses[ghat_id] = "stopped"
    print(f"[{ghat_id}] Loop stopped.")


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "online"}), 200


@app.route("/send-otp", methods=["POST"])
def send_otp():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"success": False, "message": "Email is required"}), 400

    sent = _send_otp_email(email)
    if sent:
        return jsonify({"success": True, "message": "OTP sent to your email"}), 200
    return jsonify({"success": False, "message": "Failed to send OTP email"}), 500


@app.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(force=True, silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    otp_input = (data.get("otp") or "").strip()

    record = _otp_store.get(email)
    if not record:
        return jsonify({"success": False, "message": "No OTP requested for this email"}), 400

    if time.time() > record["expires_at"]:
        del _otp_store[email]
        return jsonify({"success": False, "message": "OTP expired. Please request a new one."}), 400

    if otp_input != record["otp"]:
        return jsonify({"success": False, "message": "Incorrect OTP"}), 400

    del _otp_store[email]  # OTP used, remove it
    
    try:
        try:
            user_record = admin_auth.get_user_by_email(email)
            uid = user_record.uid
        except admin_auth.UserNotFoundError:
            user_record = admin_auth.create_user(email=email)
            uid = user_record.uid
            
        custom_token = admin_auth.create_custom_token(uid)
        token_str = custom_token.decode('utf-8') if isinstance(custom_token, bytes) else custom_token
        
        return jsonify({"success": True, "message": "OTP verified", "token": token_str}), 200
    except Exception as e:
        print(f"[otp] Failed to create custom token: {e}")
        return jsonify({"success": False, "message": f"Failed to create secure session: {e}"}), 500


@app.route("/start-detection", methods=["POST"])
def start_detection():
    data = request.get_json(force=True, silent=True) or {}
    raw_url = (data.get("streamUrl") or "").strip()
    ghat_id = (data.get("ghatId") or "default").strip()

    if not raw_url:
        return jsonify({"success": False, "message": "streamUrl is required"}), 400

    # Extract existing thread and set stop event inside lock
    with _lock:
        existing_thread = _ghat_threads.get(ghat_id)
        existing_evt = _ghat_stop_events.get(ghat_id)
        if existing_thread and existing_thread.is_alive() and existing_evt:
            existing_evt.set()
            
    # Wait for the old thread to finish WITHOUT holding the lock (prevents deadlock)
    if existing_thread and existing_thread.is_alive() and existing_evt:
        print(f"[server] Stopping existing thread for {ghat_id}...")
        existing_thread.join(timeout=10)

    with _lock:
        # Setup new event and state
        stop_evt = threading.Event()
        _ghat_stop_events[ghat_id] = stop_evt
        _ghat_counts[ghat_id] = 0
        _ghat_statuses[ghat_id] = "starting"
        _ghat_snapshots[ghat_id] = None

        new_thread = threading.Thread(
            target=_snapshot_loop,
            args=(raw_url, stop_evt, ghat_id),
            daemon=True,
            name=f"SnapshotThread_{ghat_id}",
        )
        _ghat_threads[ghat_id] = new_thread
        new_thread.start()

    print(f"[server] Detection started for {ghat_id}: {raw_url[:80]}")
    return jsonify({
        "success": True,
        "message": f"Detection started for {ghat_id}. Snapshot every {SNAPSHOT_INTERVAL}s.",
    }), 200


@app.route("/get-count", methods=["GET"])
def get_count():
    ghat_id = request.args.get("ghatId", "default").strip()

    with _lock:
        count = _ghat_counts.get(ghat_id, 0)
        status = _ghat_statuses.get(ghat_id, "stopped")
        b64 = _ghat_snapshots.get(ghat_id, None)

    return jsonify({
        "count": count,
        "status": status,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "snapshot": f"data:image/jpeg;base64,{b64}" if b64 else None,
    }), 200


@app.route("/stop-detection", methods=["POST"])
def stop_detection():
    data = request.get_json(force=True, silent=True) or {}
    ghat_id = (data.get("ghatId") or "default").strip()

    with _lock:
        thread = _ghat_threads.get(ghat_id)
        evt = _ghat_stop_events.get(ghat_id)
        
        # IMMEDIATELY clear state so frontend instantly sees stopped state
        _ghat_statuses[ghat_id] = "stopped"
        _ghat_counts[ghat_id] = 0
        _ghat_snapshots[ghat_id] = None
        
    if thread and thread.is_alive() and evt:
        evt.set()
        print(f"[server] Stop signal sent for {ghat_id}. Thread will exit soon.")

    return jsonify({"success": True, "message": f"Detection stopped for {ghat_id}", "status": "stopped"}), 200


@app.route("/stop-all", methods=["POST"])
def stop_all():
    with _lock:
        for ghat_id, evt in _ghat_stop_events.items():
            evt.set()
        
        # Wait for all to finish
        for ghat_id, thread in _ghat_threads.items():
            if thread.is_alive():
                thread.join(timeout=5)
                print(f"[server] Detection stopped for {ghat_id}.")
                
        # Clear out 
        _ghat_threads.clear()
        _ghat_stop_events.clear()
        _ghat_statuses.clear()

    return jsonify({"success": True, "message": "All detection streams stopped"}), 200


if __name__ == "__main__":
    print("=" * 60)
    print("  Godavari Pushkaralu — AI Crowd Detection Server")
    print(f"  Snapshot interval : {SNAPSHOT_INTERVAL}s")
    print("  Frame grab        : yt-dlp + cv2 (no system ffmpeg needed)")
    print("  http://0.0.0.0:5000")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)