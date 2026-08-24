# Test Right Now - 2 Minutes

## Your YouTube URL:
```
https://youtu.be/Oha-rKd7L1Q?si=l5w0ETz1cvo5ZqD
```

## Step 1: Change One Line (30 seconds)

Open: `src/stream-processing-routes.ts`

**Line 7 - Change from:**
```typescript
import { streamProcessingService } from "./server-stream-processor";
```

**To:**
```typescript
import { mockStreamProcessingService as streamProcessingService } from "./mock-server-stream-processor";
```

Save file.

## Step 2: Start Dev Server (30 seconds)

```bash
npm run dev
```

Wait for it to start. Should show: `Local: http://localhost:5173`

## Step 3: Add Monitoring Point (30 seconds)

1. Go to: http://localhost:5173/operator
2. Fill in the form:
   - **Ghat Name:** YouTube Test
   - **District:** Test
   - **Camera ID:** CAM-TEST
   - **Latitude:** 16.99
   - **Longitude:** 81.78
   - **Maximum Capacity:** 2000
   - **River Side:** South
   - **Live Stream URLs:** Paste your YouTube URL:
     ```
     https://youtu.be/Oha-rKd7L1Q?si=l5w0ETz1cvo5ZqD
     ```
3. Click "Add New Point"

## Step 4: Start Processing (30 seconds)

1. Go to Dashboard: http://localhost:5173
2. Look on right side for **"Stream Processing"** panel
3. Find your "YouTube Test" ghat
4. Click the green **"Start"** button

## Step 5: Watch Real-time Counts! ✨

You'll see in the **Stream Processing panel**:
- **Live: XX** - Updates every 2 seconds
- **Total: YYY** - Accumulates over time

You'll also see in the **table**:
- **Streams column** - Shows the counts

**That's it!** The system simulates detecting people from the YouTube video and shows you:
- How many people per frame (Live Count)
- Total count across all frames (Total Count)
- Real-time updates without refreshing

## What's Happening

Behind the scenes (with mock):
- Every 2 seconds: Generate random people count (realistic values)
- Update "Live Count" with current frame count
- Add to "Total Count"
- After 20 frames (~40 seconds): Stop and show final count

When you're ready for **real YouTube processing** (with FFmpeg + YOLO):
- Revert the import (change back to line 7 original)
- Install FFmpeg and Python packages
- It will actually process the video and count real people!

## See It Working

Expected output after 40 seconds:
```
Live Count: 42
Total Count: 856
Processing completed!
```

---

## That's all you need to do! 🎉

Test the feature right now. The mock gives you realistic data without any setup.
