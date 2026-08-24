# Stream Processing Backend API Specification

## Overview
The stream processing system captures video frames from stream URLs, runs YOLO person detection, counts people, and sends updates to the frontend in real-time.

## API Endpoints

### 1. POST /api/streams/process
Start processing streams for a ghat.

**Request:**
```json
{
  "ghatId": "g1",
  "streamUrls": [
    "https://youtube.com/live/abc123",
    "rtsp://camera1/live",
    "http://stream-server/feed1"
  ],
  "captureInterval": 2000,
  "processingMode": "auto"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Processing started for ghat g1",
  "processingId": "proc_123_abc",
  "totalStreams": 3,
  "startTime": "2024-06-19T10:30:00Z"
}
```

**Error Response (400/500):**
```json
{
  "success": false,
  "error": "No valid stream URLs provided"
}
```

### 2. POST /api/streams/stop/{ghatId}
Stop processing streams for a ghat.

**Response:**
```json
{
  "success": true,
  "message": "Processing stopped for ghat g1",
  "finalCounts": {
    "liveStreamCount": 42,
    "recordedStreamCount": 150
  }
}
```

### 3. GET /api/streams/counts/{ghatId}
Get current people counts for a ghat.

**Response:**
```json
{
  "ghatId": "g1",
  "liveCount": 45,
  "totalCount": 180,
  "isProcessing": true,
  "lastUpdate": "2024-06-19T10:32:15Z",
  "streamsProcessed": 3,
  "activeStreams": 2,
  "failedStreams": 1
}
```

### 4. GET /api/streams/status/{ghatId}
Get detailed processing status for a ghat.

**Response:**
```json
{
  "ghatId": "g1",
  "isProcessing": true,
  "streams": [
    {
      "url": "https://youtube.com/live/abc123",
      "status": "processing",
      "peopleCount": 42,
      "lastFrame": "2024-06-19T10:32:15Z",
      "framesCaptured": 123,
      "averageLatency": 1200
    },
    {
      "url": "rtsp://camera1/live",
      "status": "processing",
      "peopleCount": 35,
      "lastFrame": "2024-06-19T10:32:15Z",
      "framesCaptured": 121,
      "averageLatency": 1100
    },
    {
      "url": "http://stream-server/feed1",
      "status": "failed",
      "error": "Connection timeout",
      "failedAt": "2024-06-19T10:31:00Z"
    }
  ],
  "aggregatedCount": 77,
  "processingStartTime": "2024-06-19T10:30:00Z"
}
```

## Implementation Guide

### Backend Processing Logic

```python
# Pseudo-code for backend stream processor

class StreamProcessor:
    def __init__(self):
        self.yolo_model = load_yolo_model()  # Load YOLOv8 or similar
        self.processing_tasks = {}

    def start_processing(self, ghat_id, stream_urls, capture_interval=2000):
        """Start background processing of streams"""
        task = {
            'ghat_id': ghat_id,
            'stream_urls': stream_urls,
            'capture_interval': capture_interval,
            'total_count': 0,
            'live_count': 0,
            'is_processing': True,
            'stream_status': {}
        }
        
        for url in stream_urls:
            # Start processing each stream in background thread/coroutine
            self.process_stream(ghat_id, url, task)
        
        self.processing_tasks[ghat_id] = task
        return task

    def process_stream(self, ghat_id, stream_url, task):
        """Process a single stream"""
        try:
            cap = cv2.VideoCapture(stream_url)
            frame_count = 0
            
            while task['is_processing']:
                ret, frame = cap.read()
                if not ret:
                    # End of video or stream disconnected
                    break
                
                # Capture frame at interval
                if frame_count % (self.capture_interval // 33) == 0:
                    people_count = self.detect_people(frame)
                    
                    # Update counts
                    task['live_count'] = people_count
                    task['total_count'] += people_count
                    
                    # Send update to frontend
                    self.send_count_update(ghat_id, people_count)
                
                frame_count += 1
            
            cap.release()
            task['stream_status'][stream_url] = 'completed'
            
        except Exception as e:
            task['stream_status'][stream_url] = f'failed: {str(e)}'
            print(f"Error processing stream {stream_url}: {e}")

    def detect_people(self, frame):
        """Run YOLO detection on frame"""
        results = self.yolo_model.predict(frame)
        # Count detections where class == 'person'
        people = [det for det in results[0].boxes if det.cls == 0]  # 0 = person class
        return len(people)

    def send_count_update(self, ghat_id, count):
        """Send update to frontend via WebSocket or HTTP"""
        update = {
            'ghatId': ghat_id,
            'liveCount': count,
            'timestamp': datetime.now().isoformat(),
            'isProcessing': True
        }
        # Send via WebSocket: ws.send(json.dumps(update))
        # Or HTTP: frontend polls GET /api/streams/counts/{ghatId}
```

### Key Requirements

1. **Asynchronous Processing**: Streams must be processed in background threads/tasks
2. **Frame Capture**: Capture frames at specified interval (default 2 seconds)
3. **Person Detection**: Use YOLO (YOLOv8 or similar) to detect people
4. **Count Aggregation**: 
   - For live streams: keep running total
   - For recorded videos: accumulate total count until end
5. **Real-time Updates**: Send counts to frontend frequently (every 1-2 seconds)
6. **Error Handling**: Skip failed streams, continue with others
7. **Resource Management**: 
   - Limit concurrent processing tasks
   - Release video capture resources properly
   - Timeout long-running tasks

### Frontend Integration

The frontend:
- Sends start/stop requests to these endpoints
- Polls GET /api/streams/counts/{ghatId} every 1 second
- Updates UI with live and total counts
- Handles network errors gracefully
- Shows processing status (active/stopped/failed)

### Performance Considerations

- **Latency**: Aim for <2 second update delays
- **CPU**: Process streams in separate threads/workers
- **Memory**: Cache YOLO model, release frames after processing
- **Network**: Consider compression for count updates
- **Scaling**: Use job queues (Celery, RQ) for multiple ghats

## Error Handling

- Invalid stream URL → skip and continue
- YOLO detection failure → skip frame
- Stream disconnection → mark as failed, try reconnect
- Processing timeout → stop task gracefully
- Network error → retry with exponential backoff

## Testing

```python
# Test with mock stream URLs
test_urls = [
    "http://localhost:8080/test-video.mp4",
    "rtsp://localhost:554/test-stream"
]

# Start processing
response = POST /api/streams/process
{
    "ghatId": "test_g1",
    "streamUrls": test_urls
}

# Poll for updates
while True:
    response = GET /api/streams/counts/test_g1
    print(f"Live: {response['liveCount']}, Total: {response['totalCount']}")
    sleep(1)
```

## Future Enhancements

- WebSocket support for real-time bidirectional updates
- Stream health metrics (FPS, latency, resolution)
- Configurable detection confidence thresholds
- Support for custom detection models
- Analytics and performance metrics
- Rate limiting and quotas
