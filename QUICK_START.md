# Quick Start Guide - Stream Processing

## 🚀 Option 1: Test Immediately (Mock - No Dependencies)

Perfect for UI testing and development. No FFmpeg or Python needed!

### Step 1: Use Mock Processor
Edit `src/stream-processing-routes.ts` and change the import:

**Current (lines 7-8):**
```ts
import { streamProcessingService } from "./server-stream-processor";
```

**Change to:**
```ts
import { mockStreamProcessingService as streamProcessingService } from "./mock-server-stream-processor";
```

That's it! The system will now simulate video processing.

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Test the Feature

1. **Go to Operator Page**
   - Navigate to http://localhost:5173/operator

2. **Add a Monitoring Point**
   - Ghat Name: "Test Ghat"
   - Camera ID: "CAM-001"
   - Live Stream URLs: (paste any text - URL validation is disabled in mock mode)
   - Click "Add New Point"

3. **Go to Dashboard**
   - See the "Stream Processing" panel on the right
   - Click the green "Start" button on the test ghat

4. **Watch Real-time Counts**
   - Live Count updates every 2 seconds
   - Total Count accumulates
   - Processing stops after ~20 updates (40 seconds)
   - See counts in both StreamCountsPanel and GhatTable

5. **Expected Output**
   ```
   Live Count: 35 people
   Total Count: 450 people (after 20 frames)
   ```

### Step 4: Test "Stop" Button
- Click the "Stop" button during processing
- Counts freeze at current values
- Processing status shows as stopped

### What's Happening (Under the Hood)
```
Every 2 seconds:
  ✓ Generate random people count (25-65)
  ✓ Update live count
  ✓ Add to total
  ✓ Emit update to frontend
  
Frontend polls every 1 second:
  ✓ GET /api/streams/counts/{ghatId}
  ✓ Receive updated counts
  ✓ Update UI components
  ✓ Show in StreamCountsPanel and GhatTable
```

---

## 🔧 Option 2: Real Video Processing (With FFmpeg + Python)

For production use with actual YouTube and stream processing.

### Prerequisites
- **FFmpeg** - Video frame extraction
- **Python 3.8+** - YOLO detection
- **2GB+ RAM** - For model and processing

### Installation (5 minutes)

**Windows:**
```bash
# Install FFmpeg
choco install ffmpeg

# Install Python packages
pip install ultralytics opencv-python pillow
```

**Mac:**
```bash
brew install ffmpeg
pip install ultralytics opencv-python pillow
```

**Linux:**
```bash
sudo apt-get install ffmpeg
pip install ultralytics opencv-python pillow
```

### Verify Installation

```bash
# Check FFmpeg
ffmpeg -version

# Check Python YOLO
python -c "from ultralytics import YOLO; print('✓ YOLO ready')"
```

### Step 1: Switch Back to Real Processor
Edit `src/stream-processing-routes.ts`:

```ts
// Change from mock back to real
import { streamProcessingService } from "./server-stream-processor";
```

### Step 2: Start Server
```bash
npm run dev
```

### Step 3: Add YouTube URL

In the Add Monitoring Point form:
- **Live Stream URLs:** Paste YouTube link (or RTSP/HTTP stream)
  - Example: `https://youtu.be/Oha-rKd7L1Q?si=l5w0ETz1cvo5ZqD`
- Click "Add New Point"

### Step 4: Click Start Processing

The system will:
1. Download video using yt-dlp
2. Extract frames every 2 seconds using FFmpeg
3. Run YOLO person detection on each frame
4. Accumulate total head count
5. Show real-time updates in UI

### Step 5: Monitor Progress

**In UI:**
- See "Live Count: XX" - current frame count
- See "Total Count: YYY" - accumulated count

**In Console:**
```
[StreamProcessor] Starting processing for ghat g1 with 1 URLs
[FFmpeg] Extracting frames from https://youtu.be/...
[YOLO] Detecting people in frame: /tmp/stream_g1_xxx/frame_0001.png
[StreamProcessor] Frame /tmp/...: 42 people detected
...
[StreamProcessor] Completed processing
```

---

## 📊 Comparison

| Feature | Mock | Real |
|---------|------|------|
| Setup Time | 30 seconds | 5 minutes |
| Dependencies | None | FFmpeg + Python |
| YouTube Support | ✓ (simulated) | ✓ (actual) |
| Accuracy | Random values | YOLO detection |
| UI Testing | ✓ Excellent | ✓ Excellent |
| Development | ✓ Fast | ✓ Realistic |
| Production | ✗ No | ✓ Yes |

---

## 🧪 Testing Scenarios

### Scenario 1: Single YouTube Video
1. Add ghat with YouTube URL
2. Click "Start"
3. Watch counts update every 2 seconds
4. After video ends, final count shown

### Scenario 2: Multiple Stream URLs
1. Add ghat with 2+ URLs in textarea:
   ```
   https://youtube.com/live/abc
   rtsp://camera/stream
   http://stream-server/feed
   ```
2. Click "Start"
3. Counts from all streams combined
4. Total = sum of all people detected

### Scenario 3: Stop During Processing
1. Add ghat and click "Start"
2. Wait for counts to update (5-10 seconds)
3. Click "Stop" button
4. Processing stops, counts freeze
5. Counts shown in table

### Scenario 4: Dashboard Display
1. Add multiple ghats with stream URLs
2. Click "Start" on each
3. See StreamCountsPanel with all counts
4. See GhatTable with "Streams" column updated
5. Real-time sync across components

---

## 📝 Understanding the API Flow

### When You Click "Start":

```
Frontend                          Backend
  |
  | POST /api/streams/process
  | { ghatId, streamUrls }
  |----------------------------->
  |                               [Start Processing]
  |<----{"success": true}
  |
  | Poll every 1 second
  | GET /api/streams/counts/{ghatId}
  |----------------------------->
  |<----{ liveCount, totalCount, isProcessing }
  |
  | Update UI with counts
  | Re-render components
  |
  [Repeat polling until stopped]
  |
  | User clicks "Stop"
  | POST /api/streams/stop/{ghatId}
  |----------------------------->
  |                               [Stop Processing]
  |<----{ finalCounts }
  |
  [Display final counts]
```

---

## 🐛 Common Issues & Solutions

### "API endpoints returning 404"
- Check `server.ts` was updated with route handlers
- Verify `stream-processing-routes.ts` imported correctly
- Restart dev server

### "FFmpeg command not found"
- FFmpeg not installed
- Not added to PATH
- Windows: Check `Environment Variables` → `Path`

### "Python module not found"
```bash
# Install missing packages
pip install ultralytics opencv-python
```

### "YOLO model download failed"
- First run needs internet (~35MB download)
- Model cached in `~/.yolov8/`
- Check disk space

### "Counts not updating in UI"
- Check browser DevTools Network tab
- Verify polling requests reaching backend
- Check console for JS errors
- Verify ghatId is correct

### "Processing too slow"
- Use YOLOv8 nano model (faster)
- Reduce frame extraction frequency
- Check CPU/memory usage
- Consider GPU acceleration

---

## 💡 Pro Tips

### For Development/Testing
1. Use mock processor for UI development
2. No wait time, instant feedback
3. Test without external dependencies
4. Perfect for form/component testing

### For Demo/Presentation
1. Have YouTube video pre-selected
2. Start processing to show real-time updates
3. Show counts in StreamCountsPanel and GhatTable
4. Demonstrate with actual people counting

### For Production
1. Install all dependencies
2. Use real processor with FFmpeg + Python
3. Set up logging and monitoring
4. Test with multiple ghats
5. Monitor system resources
6. Consider GPU acceleration for scale

---

## 🚀 Next Steps

### Immediate (Now)
- [ ] Start dev server
- [ ] Test mock processor with UI
- [ ] Add monitoring point with stream URLs
- [ ] Click "Start" and watch counts update
- [ ] Verify counts show in StreamCountsPanel and GhatTable

### Short Term (Today)
- [ ] Install FFmpeg and Python (optional)
- [ ] Switch to real processor (optional)
- [ ] Test with actual YouTube video
- [ ] Verify YOLO detection works

### Later (Production)
- [ ] Set up monitoring/logging
- [ ] Configure resource limits
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Tune for your hardware

---

## 📞 Support

Having issues? Check these files for detailed info:
- `BACKEND_SETUP.md` - Full setup guide
- `src/lib/STREAM_PROCESSING_README.md` - Complete reference
- `src/lib/STREAM_PROCESSING_API.md` - API specification

## Summary

**Right now:** Use mock processor (no setup needed)
- Just change 1 import line
- Test all UI components
- See real-time updates

**When ready:** Switch to real processor (FFmpeg + Python)
- Change 1 import line back
- Process actual videos
- Get real people counts
