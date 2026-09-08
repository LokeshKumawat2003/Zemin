import json
import os
import sys

from nudenet import NudeDetector


EXPLICIT_CLASSES = {
    "ANUS_EXPOSED",
    "BUTTOCKS_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "MALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_COVERED",
    "MALE_GENITALIA_COVERED",
}

DEFAULT_THRESHOLD = 0.35


def main():
    if len(sys.argv) != 2:
        raise ValueError("An image path is required")

    threshold = float(os.getenv("NSFW_SCORE_THRESHOLD", DEFAULT_THRESHOLD))
    if not 0 <= threshold <= 1:
        raise ValueError("NSFW_SCORE_THRESHOLD must be between 0 and 1")

    detections = NudeDetector().detect(sys.argv[1])
    explicit = [
        detection
        for detection in detections
        if detection.get("class") in EXPLICIT_CLASSES
        and float(detection.get("score", 0)) >= threshold
    ]
    print(json.dumps({
        "isNsfw": bool(explicit),
        "threshold": threshold,
        "detections": explicit,
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)