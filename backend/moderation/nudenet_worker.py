import json
import sys

from nudenet_scan import scan_path


def main():
    sys.stdout.write(json.dumps({"ready": True}) + "\n")
    sys.stdout.flush()

    for line in sys.stdin:
        payload = line.strip()
        if not payload:
            continue

        request_id = None
        image_path = payload
        mode = "default"
        try:
            parsed = json.loads(payload)
            request_id = parsed.get("id")
            image_path = parsed.get("path")
            mode = parsed.get("mode") or "default"
        except json.JSONDecodeError:
            pass

        try:
            result = scan_path(image_path, mode)
            response = {"id": request_id, **result}
        except Exception as error:
            response = {"id": request_id, "error": str(error)}

        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
