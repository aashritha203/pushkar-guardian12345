# Backend Setup Guide - Stream Processing

## Overview
The stream processing system processes YouTube videos and other stream URLs to detect and count people every 2 seconds.

## Requirements

### System Requirements
- Node.js 18+ (already have this)
- FFmpeg (for video frame extraction)
- Python 3.8+ (for YOLO detection)
- 2GB+ RAM minimum

### Python Dependencies
```bash
pip install ultralytics opencv-python
```

## Installation Steps

### Step 1: Install FFmpeg

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
# Add to PATH environment variable
```

**Mac:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt-get install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

### Step 2: Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install packages
pip install ultralytics opencv-python pillow

# Verify installation
python -c "from ultralytics import YOLO; print('YOLO ready')"
```

### Step 3: Verify Setup

Test the detection script:
```bash
# Download test image or use any image with people
python src/detect_people.py path/to/image.jpg
# Should output a number (count of people)
```

## How It Works

### When You Click "Start Processing":

1. **Frontend Request**
   - Sends POST to `/api/streams/process` with YouTube URL
   - Frontend starts polling for updates every 1 second

2. **Backend Processing**
   - Receives YouTube URL
   - Uses FFmpeg to extract frames every 2 seconds
   - For each frame:
     - Saves as PNG image
     - Runs `detect_people.py` to run YOLO detection
     - Counts people in frame
     - Aggregates total count

3. **Real-time Updates**
   - Frontend polls `/api/streams/counts/{ghatId}`
   - Backend returns: `{ liveCount, totalCount, isProcessing }`
   - UI updates with counts

4. **Final Result**
   - After video ends or user clicks "Stop"
   - Total count is shown
   - Cleanup of temporary files

## API Endpoints

### POST /api/streams/process
Start processing a stream URL

**Request:**
```json
{
  "ghatId": "g1",
  "streamUrls": ["https://youtu.be/Oha-rKd7L1Q?si=l5w0ETz1cvo5ZqD"],
  "captureInterval": 2000
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processing started for ghat g1",
  "processingId": "proc_g1_1234567890",
  "totalStreams": 1,
  "startTime": "2024-06-19T10:30:00Z"
}
```

### GET /api/streams/counts/{ghatId}
Get current people counts (polled by frontend)

**Response:**
```json
{
  "ghatId": "g1",
  "liveCount": 42,
  "totalCount": 156,
  "isProcessing": true,
  "timestamp": "2024-06-19T10:32:15Z"
}
```

### POST /api/streams/stop/{ghatId}
Stop processing a stream

**Response:**
```json
{
  "success": true,
  "message": "Processing stopped for ghat g1",
  "finalCounts": {
    "liveCount": 42,
    "totalCount": 560
  }
}
```

### GET /api/streams/status/{ghatId}
Get detailed processing status

**Response:**
```json
{
  "ghatId": "g1",
  "isProcessing": false,
  "totalCount": 560,
  "liveCount": 0,
  "framesCaptured": 25,
  "uptime": 45230,
  "streams": [
    {
      "url": "https://youtu.be/Oha-rKd7L1Q?si=l5w0ETz1cvo5ZqD",
      "status": "completed",
      "frameCount": 25,
      "peopleCount": 42,
      "lastUpdate": "2024-06-19T10:32:15Z"
    }
  ]
}
```

## Testing

### Test 1: Manual API Test
```bash
# Start processing
curl -X POST http://localhost:5173/api/streams/process \
  -H "Content-Type: application/json" \
  -d '{
    "ghatId": "g1",
    "streamUrls": ["https://youtu.be/Oha-rKd7L1Q?si=l5w0ETz1cvo5ZqD"]
  }'

# Get counts (wait a few seconds first)
curl http://localhost:5173/api/streams/counts/g1

# Stop processing
curl -X POST http://localhost:5173/api/streams/stop/g1
```

### Test 2: Via UI
1. Go to Operator page
2. Add new monitoring point with:
   - Ghat Name: Test Ghat
   - Camera ID: CAM-001
   - Live Stream URLs: Paste YouTube URL
3. Click "Add New Point"
4. Go to Dashboard → Stream Processing panel
5. Click "Start" button
6. Watch counts update in real-time
7. Click "Stop" when done

### Test 3: Check Logs
The system logs detailed information:
```
[StreamProcessor] Starting processing for ghat g1 with 1 URLs
[FFmpeg] Extracting frames from https://youtu.be/...
[YOLO] Detecting people in frame: /tmp/stream_g1_xxx/frame_0001.png
[StreamProcessor] Frame /tmp/...: 42 people detected
```

## Troubleshooting

### "ffmpeg command not found"
- FFmpeg not installed or not in PATH
- Windows: Add FFmpeg bin directory to PATH
- Mac/Linux: Verify with `which ffmpeg`

### "Python script not found"
- `detect_people.py` not in correct location
- Should be in `src/detect_people.py`
- Check file exists and is readable

### "YOLOv8 model download failed"
- First run downloads ~35MB model
- Requires internet connection
- Model cached in ~/.yolov8/
- Check disk space

### "No people detected (always 0)"
- Image quality too low
- People too small in frame
- Confidence threshold too high
- Try with different video/image

### High memory usage
- Processing multiple streams at once
- YOLO model takes ~500MB
- FFmpeg buffers frames
- Consider reducing number of concurrent streams

### Processing too slow
- Using full YOLOv8 (yolov8l.pt)
- Try nano version (yolov8n.pt) - faster
- Reduce frame extraction frequency
- Use lower resolution frames

## Performance Tips

1. **Use YOLOv8 Nano**
   - Edit `src/server-stream-processor.ts` line ~90
   - Change to: `model = YOLO("yolov8n.pt")`
   - ~50% faster, uses less memory

2. **Increase Capture Interval**
   - Default: 2 seconds (1 frame per 2 sec)
   - Increase to 5-10 seconds for less load
   - Edit capture interval in API request

3. **GPU Acceleration** (optional)
   - Install CUDA: https://developer.nvidia.com/cuda-downloads
   - Install PyTorch with CUDA support
   - YOLO will auto-detect and use GPU

4. **Reduce Resolution**
   - Add FFmpeg resize filter
   - `-vf "scale=640:480,fps=1/2"`
   - Speeds up detection, uses less memory

## Production Deployment

1. **Use Process Manager**
   ```bash
   npm install -g pm2
   pm2 start src/server.ts
   pm2 save
   ```

2. **Resource Limits**
   - Limit concurrent processing tasks
   - Queue system for multiple requests
   - Implement cleanup of old sessions

3. **Monitoring**
   - Log all API calls
   - Monitor CPU/memory usage
   - Alert on processing failures
   - Track detection accuracy

4. **Security**
   - Validate all URLs before processing
   - Implement rate limiting
   - Sanitize file paths
   - Validate YOLO model files

5. **Scaling**
   - Use worker threads for multiple ghats
   - Consider distributed processing
   - Cache YOLO model globally
   - Monitor disk space for temp files

## File Structure

```
src/
├── server.ts                      # Updated with API routes
├── server-stream-processor.ts     # Main processing logic
├── stream-processing-routes.ts    # API route handlers
├── detect_people.py               # YOLO detection script
└── lib/
    └── stream-processor.ts        # Frontend service (already exists)
```

## Next Steps

1. Install FFmpeg and Python dependencies
2. Test the setup with a sample video/URL
3. Monitor performance
4. Adjust YOLO model version for your hardware
5. Consider GPU acceleration for production
6. Set up monitoring and logging

## Support

For issues:
1. Check error logs in console
2. Verify FFmpeg installation: `ffmpeg -version`
3. Verify Python setup: `python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"`
4. Test detection script directly: `python src/detect_people.py image.jpg`
5. Check temporary files: `ls /tmp/stream_*` (or `%temp%\stream_*` on Windows)
