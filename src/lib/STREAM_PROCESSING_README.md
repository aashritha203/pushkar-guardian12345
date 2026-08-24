# Stream Processing System - Complete Guide

## Overview

The stream processing system enables automatic people counting from video/stream URLs. It captures video frames, runs YOLO person detection, and displays live/total counts in real-time.

**Key Features:**
- ✅ Multiple stream URLs per ghat
- ✅ Automatic frame capture (2-second intervals)
- ✅ YOLO-based person detection
- ✅ Live count updates for active streams
- ✅ Recorded video support (total count)
- ✅ Real-time dashboard updates
- ✅ Non-blocking async processing
- ✅ Error handling & stream fallback

## Architecture

```
Frontend (React)
├── StreamCountsPanel (start/stop UI)
├── GhatTable (display counts)
├── useStreamProcessing (hook)
└── streamProcessor (client service)
        ↓ HTTP/Polling
Backend API
├── POST /api/streams/process (start)
├── POST /api/streams/stop (stop)
├── GET /api/streams/counts (poll updates)
└── GET /api/streams/status (detailed status)
        ↓
Video Processing Engine
├── Frame Capture (2 sec intervals)
├── YOLO Detection (person detection)
└── Count Aggregation
        ↓
Database (optional: store counts)
```

## Frontend Components

### 1. StreamCountsPanel Component
Displays all ghats with stream URLs and provides start/stop controls.

**Location:** `src/components/dashboard/StreamCountsPanel.tsx`

**Features:**
- Lists ghats with stream URLs
- Start/stop processing buttons
- Real-time count display
- Expandable URL list

**Usage:**
```tsx
import { StreamCountsPanel } from "@/components/dashboard/StreamCountsPanel";

// In your dashboard
<StreamCountsPanel />
```

### 2. useStreamProcessing Hook
React hook for managing stream processing per ghat.

**Location:** `src/hooks/use-stream-processing.ts`

**Usage:**
```tsx
import { useStreamProcessing } from "@/hooks/use-stream-processing";

function MyComponent() {
  const {
    hasStreamUrls,
    isProcessing,
    liveCount,
    totalCount,
    streamUrls,
    startProcessing,
    stopProcessing,
  } = useStreamProcessing("ghat_id");

  return (
    <div>
      <p>Live: {liveCount}</p>
      <p>Total: {totalCount}</p>
      <button onClick={startProcessing} disabled={isProcessing}>
        {isProcessing ? "Processing..." : "Start"}
      </button>
    </div>
  );
}
```

### 3. Stream Count Display in Table
GhatTable now includes a "Streams" column showing:
- Live count (if processing)
- Total count (if processing)
- URL count (if not processing)

## Backend Implementation

### API Endpoints Required

The frontend expects these endpoints. Implement them in your backend:

```
POST   /api/streams/process
POST   /api/streams/stop/:ghatId
GET    /api/streams/counts/:ghatId
GET    /api/streams/status/:ghatId
```

**See:** `src/lib/STREAM_PROCESSING_API.md` for full specifications

### Quick Start with Mock Server

For development/testing, use the mock implementation:

```ts
// server.ts
import {
  handleStartProcessing,
  handleStopProcessing,
  handleGetCounts,
  handleGetStatus,
} from "@/lib/mock-stream-processor";

// Register routes
app.post("/api/streams/process", handleStartProcessing);
app.post("/api/streams/stop/:ghatId", handleStopProcessing);
app.get("/api/streams/counts/:ghatId", handleGetCounts);
app.get("/api/streams/status/:ghatId", handleGetStatus);
```

### Real Implementation (Python/Flask Example)

```python
from flask import Flask, request, jsonify
import cv2
import threading
from ultralytics import YOLO

app = Flask(__name__)
yolo_model = YOLO("yolov8n.pt")

processing_tasks = {}

@app.route("/api/streams/process", methods=["POST"])
def start_processing():
    data = request.json
    ghat_id = data["ghatId"]
    stream_urls = data["streamUrls"]
    
    # Start async processing
    task = {
        "ghat_id": ghat_id,
        "stream_urls": stream_urls,
        "is_processing": True,
        "counts": {},
    }
    processing_tasks[ghat_id] = task
    
    # Process each stream in background thread
    for url in stream_urls:
        thread = threading.Thread(target=process_stream, args=(ghat_id, url))
        thread.daemon = True
        thread.start()
    
    return jsonify({"success": True, "message": f"Processing started for {ghat_id}"})

def process_stream(ghat_id, stream_url):
    cap = cv2.VideoCapture(stream_url)
    frame_count = 0
    
    while processing_tasks[ghat_id]["is_processing"]:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Capture every 2 seconds (~60 frames at 30fps)
        if frame_count % 60 == 0:
            results = yolo_model.predict(frame)
            people_count = len([r for r in results[0].boxes if r.cls == 0])
            
            # Store count
            processing_tasks[ghat_id]["counts"][stream_url] = people_count
            print(f"Ghat {ghat_id}: {people_count} people detected")
        
        frame_count += 1
    
    cap.release()

@app.route("/api/streams/counts/<ghat_id>", methods=["GET"])
def get_counts(ghat_id):
    task = processing_tasks.get(ghat_id)
    if not task:
        return jsonify({"error": "No processing task"}), 404
    
    live_count = sum(task["counts"].values())
    
    return jsonify({
        "ghatId": ghat_id,
        "liveCount": live_count,
        "totalCount": live_count,  # In real impl, accumulate over time
        "isProcessing": task["is_processing"],
        "timestamp": datetime.now().isoformat(),
    })

@app.route("/api/streams/stop/<ghat_id>", methods=["POST"])
def stop_processing(ghat_id):
    if ghat_id in processing_tasks:
        processing_tasks[ghat_id]["is_processing"] = False
        del processing_tasks[ghat_id]
    
    return jsonify({"success": True, "message": f"Processing stopped for {ghat_id}"})
```

## Usage Flow

### 1. Add Stream URLs to Ghat
```tsx
// In Add Monitoring Point form
<textarea placeholder="Enter URLs (one per line)">
  https://youtube.com/live/abc123
  rtsp://camera1/live
</textarea>
```

### 2. View in Dashboard
- StreamCountsPanel shows ghat with start button
- Table shows URL count

### 3. Start Processing
```tsx
// Click "Start" button
await liveService.startStreamProcessing("ghat_id");
```

### 4. Monitor Updates
- Frontend polls `/api/streams/counts/{ghatId}` every 1 second
- UI updates with live/total counts
- Processing status shown in real-time

### 5. Stop Processing
```tsx
// Click "Stop" button
await liveService.stopStreamProcessing("ghat_id");
```

## Data Flow

```
1. User clicks "Start" in StreamCountsPanel
   ↓
2. Frontend calls liveService.startStreamProcessing(ghatId)
   ↓
3. Sends POST /api/streams/process with stream URLs
   ↓
4. Backend starts async frame capture + YOLO detection
   ↓
5. Frontend polls GET /api/streams/counts/{ghatId} every 1s
   ↓
6. Backend returns current people counts
   ↓
7. Frontend updates Ghat with liveStreamCount and recordedStreamCount
   ↓
8. UI re-renders with latest counts
   ↓
9. User clicks "Stop"
   ↓
10. Frontend sends POST /api/streams/stop/{ghatId}
    ↓
11. Backend stops processing, returns final counts
```

## Type Definitions

### Updated Ghat Interface
```ts
interface Ghat {
  // ... existing fields
  streamUrls?: string[];           // Array of stream URLs
  liveStreamCount?: number;        // Current live count
  recordedStreamCount?: number;    // Total recorded count
  isProcessingStreams?: boolean;   // Processing status
}
```

### StreamCountUpdate
```ts
interface StreamCountUpdate {
  ghatId: string;
  liveCount?: number;
  totalCount?: number;
  isProcessing?: boolean;
  timestamp: string;
}
```

## Performance Considerations

### Frontend
- **Polling Interval**: 1 second (configurable in `stream-processor.ts`)
- **Update Batching**: All updates batched per ghat
- **Memory**: Minimal (only storing counts)
- **CPU**: Negligible (simple HTTP requests)

### Backend
- **Frame Capture**: 2 seconds (configurable)
- **YOLO Model**: Load once, reuse for all frames
- **Threading**: Process each URL in separate thread
- **Memory**: ~500MB for YOLO model + frame buffers
- **CPU**: ~50% per stream (depends on hardware)

### Optimization Tips
- Use thread pool executor for multiple streams
- Cache YOLO model in memory
- Resize frames before detection (480p instead of 1080p)
- Use batching for multiple detections
- Consider GPU acceleration (CUDA/OpenCL)

## Error Handling

### Frontend Errors
- Network error: Retry with exponential backoff
- API not found: Show "Stream processing unavailable"
- Invalid response: Log error, continue polling

### Backend Errors
- Invalid URL: Skip URL, process others
- Detection failure: Skip frame, continue
- Stream disconnect: Try reconnect, mark as failed
- Processing timeout: Stop task gracefully

## Testing

### Manual Testing
1. Add a ghat with stream URLs
2. Click "Start Processing" in StreamCountsPanel
3. Observe count updates in real-time
4. Click "Stop Processing"
5. Verify final counts are displayed

### Unit Testing
```ts
// Test stream processing start
it("should start stream processing", async () => {
  const ghatId = "test_g1";
  const urls = ["https://example.com/video.mp4"];
  
  await liveService.startStreamProcessing(ghatId);
  
  const status = liveService.getStreamProcessingStatus(ghatId);
  expect(status.isProcessing).toBe(true);
});

// Test count updates
it("should update counts from backend", async () => {
  // Mock fetch response
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        ghatId: "test_g1",
        liveCount: 42,
        totalCount: 150,
      }),
    })
  );
  
  const status = liveService.getStreamProcessingStatus("test_g1");
  expect(status.liveCount).toBe(42);
});
```

## Troubleshooting

### No counts appearing
- Check backend API endpoints are registered
- Verify stream URLs are valid
- Check network tab in DevTools
- Look at backend logs for errors

### Processing starts but no updates
- Check polling interval (should be 1s)
- Verify backend returns correct response format
- Check browser console for JS errors
- Try mock implementation first

### High CPU usage
- Reduce YOLO model size (use nano version)
- Lower frame resolution
- Increase capture interval (>2 seconds)
- Process fewer streams in parallel

### Memory issues
- Unload YOLO model when not processing
- Clear frame buffers after processing
- Limit concurrent processing tasks
- Monitor with backend profiler

## Future Enhancements

- [ ] WebSocket for real-time bidirectional updates
- [ ] Stream health metrics (FPS, latency, quality)
- [ ] Custom detection confidence thresholds
- [ ] Support for custom detection models
- [ ] Analytics dashboard for stream performance
- [ ] Batch processing for multiple ghats
- [ ] Alert notifications for count thresholds
- [ ] Export count history as CSV/JSON

## References

- **YOLO Documentation**: https://docs.ultralytics.com
- **OpenCV Documentation**: https://docs.opencv.org
- **Stream Processing Architecture**: See STREAM_PROCESSING_API.md
- **Frontend Implementation**: See src/lib/stream-processor.ts

## Support

For issues or questions:
1. Check this documentation
2. Review STREAM_PROCESSING_API.md
3. Check error logs (frontend console + backend logs)
4. Test with mock implementation first
