document.addEventListener("DOMContentLoaded", function () {
  const qrReader = document.getElementById("qr-reader");
  const result = document.getElementById("result");

  function onScanSuccess(decodedText) {
    result.textContent = decodedText;
  }

  function onScanFailure(error) {
    console.warn(`QR code scanning failed: ${error}`);
  }

  async function getBackCamera() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.find((device) => device.kind === "videoinput" && device.label.toLowerCase().includes("back"));
  }

  async function initializeScanner() {
    const backCamera = await getBackCamera();
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    };

    if (backCamera) {
      config.videoConstraints = {
        deviceId: backCamera.deviceId,
        facingMode: "environment",
      };
    }

    const html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, /* verbose= */ false);
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
  }

  initializeScanner();
});
