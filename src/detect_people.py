#!/usr/bin/env python3
"""
YOLO Person Detection Script

Detects people in an image using YOLOv8 and outputs the count.

Usage:
    python detect_people.py <image_path>

Requirements:
    pip install ultralytics opencv-python

Output:
    Prints the number of people detected to stdout
"""

import sys
import cv2
from ultralytics import YOLO

def detect_people(image_path: str) -> int:
    """
    Detect people in an image using YOLOv8
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Number of people detected
    """
    try:
        # Load YOLOv8 nano model (faster, less memory)
        # Use yolov8n.pt for speed, yolov8m.pt for accuracy
        model = YOLO("yolov8n.pt")
        
        # Run inference
        results = model.predict(source=image_path, conf=0.5, verbose=False)
        
        # Count people (class 0 is 'person' in COCO dataset)
        people_count = 0
        for r in results:
            boxes = r.boxes
            for box in boxes:
                if int(box.cls[0]) == 0:  # Class 0 = person
                    people_count += 1
        
        return people_count
        
    except Exception as e:
        print(f"Error in detection: {e}", file=sys.stderr)
        return 0

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No image path provided", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    try:
        count = detect_people(image_path)
        print(count)
        sys.exit(0)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
