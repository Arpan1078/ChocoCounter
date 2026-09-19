from pathlib import Path
from datetime import datetime
import cv2
import re

def take_pictures(phone_ip): #requires: IP Webcam app server setup on phone
    URL = f"http://{phone_ip}:8080/videofeed"
    OUTPUT_DIR = Path("captures")

    OUTPUT_DIR.mkdir(exist_ok=True)

    cap = cv2.VideoCapture(URL)

    if not cap.isOpened():
        raise RuntimeError(f"Could not open IP Webcam stream: {URL}")

    print("Press s to save an image, q or Esc to quit.")

    while True:
        ok, frame = cap.read()

        if not ok or frame is None:
            print("Could not read camera frame.")
            break

        height, width = frame.shape[:2]

        # Do not resize before display: preserves the stream's full frame.
        cv2.imshow("IP Webcam", frame)

        key = cv2.waitKey(1) & 0xFF

        if key == ord("s"):
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = OUTPUT_DIR / f"chocopic_{timestamp}_{width}x{height}.jpg"

            saved = cv2.imwrite(
                str(filename),
                frame,
                [cv2.IMWRITE_JPEG_QUALITY, 95],
            )

            if saved:
                print(f"Saved: {filename}")
            else:
                print(f"Failed to save: {filename}")

        elif key in (ord("q"), 27):
            break

    cap.release()
    cv2.destroyAllWindows()
    


def main():
    ...


    #take photo of chocolate box using phone camera - proof of concept
    phone_ip = input("enter phone IPCamera server IP: ")
    if re.match(r"^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$", phone_ip):
        take_pictures(phone_ip)


if __name__ == "__main__":
    main()