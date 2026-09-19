(function () {
  "use strict";

  function canvasToFile(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Could not create image file."));
            return;
          }

          resolve(
            new File([blob], filename, {
              type: "image/jpeg"
            })
          );
        },
        "image/jpeg",
        0.92
      );
    });
  }

  function mountCaptureDialog() {
    const dialog = document.getElementById("capture-dialog");

    if (!dialog || window.ChocoCounterCapture) {
      return;
    }

    const methodButtons = [...dialog.querySelectorAll("[data-capture-method]")];
    const panes = [...dialog.querySelectorAll("[data-capture-pane]")];

    const webcamVideo = document.getElementById("capture-webcam-video");
    const webcamStill = document.getElementById("capture-webcam-still");
    const webcamStart = document.getElementById("capture-webcam-start");
    const webcamSnap = document.getElementById("capture-webcam-snap");
    const webcamRetake = document.getElementById("capture-webcam-retake");

    const ipUrl = document.getElementById("capture-ip-url");
    const ipConnect = document.getElementById("capture-ip-connect");
    const ipPreview = document.getElementById("capture-ip-preview");
    const ipSnap = document.getElementById("capture-ip-snap");
    const ipRetake = document.getElementById("capture-ip-retake");

    const uploadInput = document.getElementById("capture-file-input");
    const uploadPreview = document.getElementById("capture-upload-preview");
    const uploadName = document.getElementById("capture-file-name");

    const status = document.getElementById("capture-status");
    const confirm = document.getElementById("capture-confirm");
    const skip = document.getElementById("capture-skip");

    let webcamStream = null;
    let selectedFile = null;
    let resolveOpen = null;

    function setStatus(message, type = "") {
      status.textContent = message;
      status.className = `capture-status ${type}`.trim();
    }

    function setSelectedFile(file, previewUrl) {
      selectedFile = file;
      confirm.disabled = !selectedFile;

      if (previewUrl) {
        const activePane = panes.find((pane) => !pane.hidden);

        if (activePane?.dataset.capturePane === "webcam") {
          webcamStill.src = previewUrl;
          webcamStill.hidden = false;
          webcamVideo.hidden = true;
          webcamRetake.hidden = false;
        }

        if (activePane?.dataset.capturePane === "ip-camera") {
          ipPreview.src = previewUrl;
          ipPreview.hidden = false;
          ipRetake.hidden = false;
        }

        if (activePane?.dataset.capturePane === "upload") {
          uploadPreview.src = previewUrl;
          uploadPreview.hidden = false;
        }
      }

      setStatus(
        "Photo selected. Choose Use this photo, or retake/select another image.",
        "success"
      );
    }

    function clearSelectedFile() {
      selectedFile = null;
      confirm.disabled = true;
    }

    function stopWebcam() {
      if (webcamStream) {
        webcamStream.getTracks().forEach((track) => track.stop());
        webcamStream = null;
      }

      webcamVideo.srcObject = null;
      webcamSnap.disabled = true;
    }

    function clearPreviews() {
      webcamStill.hidden = true;
      webcamStill.removeAttribute("src");
      webcamVideo.hidden = false;

      ipPreview.hidden = true;
      ipPreview.removeAttribute("src");

      uploadPreview.hidden = true;
      uploadPreview.removeAttribute("src");

      webcamRetake.hidden = true;
      ipRetake.hidden = true;
    }

    function setMethod(method) {
      clearSelectedFile();
      clearPreviews();
      stopWebcam();

      methodButtons.forEach((button) => {
        const active = button.dataset.captureMethod === method;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
      });

      panes.forEach((pane) => {
        pane.hidden = pane.dataset.capturePane !== method;
      });

      const messages = {
        webcam:
          "Connect a webcam or use this device’s camera, then select Start camera.",
        "ip-camera":
          "Start IP Webcam on Android and enter its same-network address.",
        upload:
          "Choose a clear photo of the completed box from this device."
      };

      setStatus(messages[method]);
    }

async function startWebcam() {
  clearSelectedFile();

  webcamStill.hidden = true;
  webcamStill.removeAttribute("src");

  try {
    stopWebcam();

    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });

    webcamVideo.srcObject = webcamStream;
    webcamVideo.hidden = false;

    await webcamVideo.play();

    webcamSnap.disabled = false;
    webcamRetake.hidden = true;

    setStatus(
      "Live camera ready. Position the completed box, then select Take photo.",
      "success"
    );
  } catch (error) {
    setStatus(
      `Could not access camera: ${
        error.message || "permission denied"
      }. Use Upload image instead.`,
      "error"
    );
  }
}

    async function captureWebcamPhoto() {
      if (!webcamVideo.videoWidth || !webcamVideo.videoHeight) {
        setStatus("Camera is not ready yet.", "error");
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = webcamVideo.videoWidth;
      canvas.height = webcamVideo.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        setStatus("Could not access image capture canvas.", "error");
        return;
      }

      context.drawImage(webcamVideo, 0, 0, canvas.width, canvas.height);

      try {
        const file = await canvasToFile(
          canvas,
          `box-webcam-${Date.now()}.jpg`
        );

        setSelectedFile(file, URL.createObjectURL(file));
        stopWebcam();
      } catch (error) {
        setStatus(error.message, "error");
      }
    }

    function normalizeIpBase(value) {
      let base = value.trim();

      if (!base) {
        throw new Error("Enter the IP Webcam address first.");
      }

      if (!/^https?:\/\//i.test(base)) {
        base = `http://${base}`;
      }

      const url = new URL(base);

      if (!url.port) {
        url.port = "8080";
      }

      return url.toString().replace(/\/$/, "");
    }

    function ipSnapshotUrl(base) {
      return `${base}/shot.jpg?ts=${Date.now()}`;
    }

    function ipVideoUrl(base) {
      return `${base}/videofeed`;
    }

    async function connectIpCamera() {
      clearSelectedFile();
      clearPreviews();

      try {
        const base = normalizeIpBase(ipUrl.value);
        const previewUrl = ipSnapshotUrl(base);

        ipPreview.src = previewUrl;
        ipPreview.hidden = false;

        await new Promise((resolve, reject) => {
          ipPreview.onload = resolve;
          ipPreview.onerror = () =>
            reject(
              new Error(
                "Could not load the phone image. Confirm the address, Wi-Fi, and IP Webcam server."
              )
            );
        });

        ipSnap.disabled = false;
        setStatus(
          "Phone camera connected. Position the box and select Take photo.",
          "success"
        );
      } catch (error) {
        ipPreview.hidden = true;
        ipSnap.disabled = true;
        setStatus(
          `${error.message} If HTTPS blocks the stream, use Upload image instead.`,
          "error"
        );
      }
    }

    async function captureIpCameraPhoto() {
      try {
        const base = normalizeIpBase(ipUrl.value);
        const sourceUrl = ipSnapshotUrl(base);

        setStatus("Capturing latest image from phone…");

        const response = await fetch(sourceUrl, {
          cache: "no-store",
          mode: "cors"
        });

        if (!response.ok) {
          throw new Error(`Phone returned ${response.status}`);
        }

        const blob = await response.blob();

        if (!blob.type.startsWith("image/")) {
          throw new Error("Phone did not return an image.");
        }

        const file = new File(
          [blob],
          `box-ip-webcam-${Date.now()}.jpg`,
          { type: blob.type || "image/jpeg" }
        );

        setSelectedFile(file, URL.createObjectURL(file));
      } catch (error) {
        setStatus(
          `Could not capture from IP Webcam: ${error.message}. Use Upload image if browser security blocks the phone server.`,
          "error"
        );
      }
    }

    function loadUpload(file) {
      clearSelectedFile();
      clearPreviews();

      if (!file) {
        uploadName.textContent = "JPEG, PNG, or WebP; 10 MB maximum.";
        return;
      }

      const accepted = [
        "image/jpeg",
        "image/png",
        "image/webp"
      ];

      if (!accepted.includes(file.type)) {
        setStatus("Choose a JPEG, PNG, or WebP image.", "error");
        uploadInput.value = "";
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        setStatus("Image must be 10 MB or smaller.", "error");
        uploadInput.value = "";
        return;
      }

      uploadName.textContent = `${file.name} — ${(file.size / 1024 / 1024).toFixed(1)} MB`;
      setSelectedFile(file, URL.createObjectURL(file));
    }

    function finish(value) {
      stopWebcam();

      if (dialog.open) {
        dialog.close();
      }

      const resolver = resolveOpen;
      resolveOpen = null;

      if (resolver) {
        resolver(value);
      }
    }

    methodButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMethod(button.dataset.captureMethod);
      });
    });

    webcamStart.addEventListener("click", startWebcam);
    webcamSnap.addEventListener("click", captureWebcamPhoto);

    webcamRetake.addEventListener("click", () => {
      clearSelectedFile();
      clearPreviews();
      startWebcam();
    });

    ipConnect.addEventListener("click", connectIpCamera);
    ipSnap.addEventListener("click", captureIpCameraPhoto);

    ipRetake.addEventListener("click", () => {
      clearSelectedFile();
      clearPreviews();
      connectIpCamera();
    });

    uploadInput.addEventListener("change", () => {
      loadUpload(uploadInput.files?.[0] || null);
    });

    confirm.addEventListener("click", () => {
      if (!selectedFile) {
        setStatus("Take or choose a photo first.", "error");
        return;
      }

      finish({ file: selectedFile, skipped: false });
    });

    skip.addEventListener("click", () => {
      finish({ file: null, skipped: true });
    });

    dialog.querySelectorAll("[data-capture-close]").forEach((button) => {
      button.addEventListener("click", () => finish(null));
    });

    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      finish(null);
    });

    window.ChocoCounterCapture = {
      open() {
        stopWebcam();
        clearSelectedFile();
        clearPreviews();
        uploadInput.value = "";
        uploadName.textContent = "JPEG, PNG, or WebP; 10 MB maximum.";
        setMethod("webcam");

        return new Promise((resolve) => {
          resolveOpen = resolve;
          dialog.showModal();
        });
      }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountCaptureDialog);
  } else {
    mountCaptureDialog();
  }
})();