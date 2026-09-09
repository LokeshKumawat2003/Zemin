import json
import os
import sys

from nudenet import NudeDetector


CRITICAL_CLASSES = {
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "ANUS_EXPOSED",
}

HIGH_RISK_CLASSES = {
    "FEMALE_BREAST_EXPOSED",
    "BUTTOCKS_EXPOSED",
    "MALE_BREAST_EXPOSED",
}

SENSITIVE_CLASSES = {
    "FEMALE_GENITALIA_COVERED",
    "FEMALE_BREAST_COVERED",
    "BUTTOCKS_COVERED",
    "ANUS_COVERED",
    "MALE_GENITALIA_COVERED",
}

SUPPORTING_CLASSES = {
    "BELLY_EXPOSED",
    "BELLY_COVERED",
    "ARMPITS_EXPOSED",
    "ARMPITS_COVERED",
    "FEET_EXPOSED",
    "FEET_COVERED",
}

ALL_NSFW_CLASSES = CRITICAL_CLASSES | HIGH_RISK_CLASSES | SENSITIVE_CLASSES | SUPPORTING_CLASSES

DEFAULT_THRESHOLD = 0.18
DEFAULT_LIVE_THRESHOLD = 0.15
DEFAULT_LIVE_CRITICAL_THRESHOLD = 0.08
DEFAULT_LIVE_MULTI_HIT_THRESHOLD = 0.12
DEFAULT_LIVE_MULTI_HIT_COUNT = 2

_DETECTOR = None


def get_detector():
    global _DETECTOR
    if _DETECTOR is None:
        _DETECTOR = NudeDetector()
    return _DETECTOR


def _score(detection):
    return float(detection.get("score", 0))


def _class_name(detection):
    return detection.get("class")


def evaluate_detections(detections, mode="default"):
    is_live = mode == "live"
    threshold = float(
        os.getenv(
            "NSFW_LIVE_SCORE_THRESHOLD" if is_live else "NSFW_SCORE_THRESHOLD",
            DEFAULT_LIVE_THRESHOLD if is_live else DEFAULT_THRESHOLD,
        )
    )
    critical_threshold = float(
        os.getenv("NSFW_LIVE_CRITICAL_THRESHOLD", DEFAULT_LIVE_CRITICAL_THRESHOLD)
    )
    multi_hit_threshold = float(
        os.getenv("NSFW_LIVE_MULTI_HIT_THRESHOLD", DEFAULT_LIVE_MULTI_HIT_THRESHOLD)
    )
    multi_hit_count = int(os.getenv("NSFW_LIVE_MULTI_HIT_COUNT", DEFAULT_LIVE_MULTI_HIT_COUNT))

    flagged = []
    for detection in detections:
        cls = _class_name(detection)
        score = _score(detection)
        if cls not in ALL_NSFW_CLASSES:
            continue

        if cls in CRITICAL_CLASSES and score >= (critical_threshold if is_live else threshold):
            flagged.append(detection)
        elif cls in HIGH_RISK_CLASSES and score >= threshold:
            flagged.append(detection)
        elif cls in SENSITIVE_CLASSES and score >= (threshold + (0.03 if is_live else 0.05)):
            flagged.append(detection)
        elif cls in SUPPORTING_CLASSES and score >= (threshold + (0.05 if is_live else 0.08)):
            flagged.append(detection)

    if is_live and not flagged:
        medium_hits = [
            detection
            for detection in detections
            if _class_name(detection) in ALL_NSFW_CLASSES
            and _score(detection) >= multi_hit_threshold
        ]
        if len(medium_hits) >= multi_hit_count:
            flagged = medium_hits

    return {
        "isNsfw": bool(flagged),
        "mode": mode,
        "threshold": threshold,
        "criticalThreshold": critical_threshold if is_live else threshold,
        "detections": flagged,
    }


def scan_path(image_path, mode="default"):
    if not 0 <= float(os.getenv("NSFW_SCORE_THRESHOLD", DEFAULT_THRESHOLD)) <= 1:
        raise ValueError("NSFW_SCORE_THRESHOLD must be between 0 and 1")

    detections = get_detector().detect(image_path)
    return evaluate_detections(detections, mode)


def main():
    if len(sys.argv) != 2:
        raise ValueError("An image path is required")
    mode = os.getenv("NSFW_SCAN_MODE", "default")
    print(json.dumps(scan_path(sys.argv[1], mode)))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
