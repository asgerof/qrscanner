document.addEventListener("DOMContentLoaded", function () {
  const qrReader = document.getElementById("qr-reader");
  const result = document.getElementById("result");

  let isScanningContestant = false;
  let contestants = [];

  function onScanSuccess(decodedText) {
    result.textContent = decodedText;

    const lowerCaseDecodedText = decodedText.toLowerCase();

    if (!isScanningContestant) {
      const conttypePattern = /^conttype:\s*([^;]+)\s*;\s*(\d+)$/i;
      const match = decodedText.match(conttypePattern);
      if (match) {
        const contestType = match[1];
        const contestantAmount = parseInt(match[2]);

        const headerText = document.getElementById("header-text");
        headerText.textContent = contestType;

        createContestantLabels(contestantAmount);
        document.getElementById("add-contestant").disabled = false;
      }
    } else {
      const contestantPrefix = "contestant:";
      if (lowerCaseDecodedText.startsWith(contestantPrefix)) {
        const contestantName = decodedText.slice(contestantPrefix.length).trim();
        addContestantName(contestantName);
      }
      isScanningContestant = false;
      html5QrcodeScanner.clear();
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

    html5QrcodeScanner = new Html5QrcodeScanner("qr-reader", config, /* verbose= */ false);

    const startScanningButton = document.getElementById("start-scanning");
    startScanningButton.addEventListener("click", () => {
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
      startScanningButton.disabled = true;
    });

    const addContestantButton = document.getElementById("add-contestant");
    addContestantButton.addEventListener("click", () => {
      isScanningContestant = true;
      html5QrcodeScanner.render(onScanSuccess, onScanFailure);
    });
  }

  function createContestantLabels(amount) {
    const container = document.getElementById("contestants-container");
    container.innerHTML = "";

    for (let i = 1; i <= amount; i++) {
      const label = document.createElement("span");
      label.textContent = `Contestant ${i}`;
      label.id = `contestant-${i}`;

      const trashIcon = document.createElement("button");
      trashIcon.textContent = "🗑";
      trashIcon.onclick = function () {
        resetContestantLabel(i);
      };

      const wrapper = document.createElement("div");
      wrapper.appendChild(label);
      wrapper.appendChild(trashIcon);

      container.appendChild(wrapper);

      contestants[i - 1] = {
        labelElement: label,
        name: "",
      };
    }
  }

  function addContestantName(name) {
  const availableContestant = contestants.find((contestant) => !contestant.name);
  if (availableContestant) {
    availableContestant.labelElement.textContent = name;
    availableContestant.name = name;
  }
}
function resetContestantLabel(index) {
  const contestant = contestants[index - 1];
  contestant.labelElement.textContent = `Contestant ${index}`;
  contestant.name = "";
}
}
