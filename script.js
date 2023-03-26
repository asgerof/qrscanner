document.addEventListener("DOMContentLoaded", function () {
  const qrReader = document.getElementById("qr-reader");
  const result = document.getElementById("result");

function onScanSuccess(decodedText) {
  result.textContent = decodedText;

  const conttypePrefix = "conttype:";
  if (decodedText.toLowerCase().startsWith(conttypePrefix)) {
    const contestType = decodedText.slice(conttypePrefix.length).trim();
    const headerText = document.getElementById("header-text");
    headerText.textContent = contestType;
  }
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

    const startScanningButton = document.getElementById("start-scanning");
    startScanningButton.addEventListener("click", () => {
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      startScanningButton.disabled = true;
    });
  }

  initializeScanner();
});
