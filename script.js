document.addEventListener("DOMContentLoaded", function () {
    console.log("DOMContentLoaded event fired");
    const qrReader = document.getElementById("qr-reader");
    const result = document.getElementById("result");
    const startContestButton = document.getElementById("start-contest");

    let isScanningContestant = false;
    let contestants = [];

    function onScanSuccess(decodedText) {
        result.textContent = decodedText;

        const lowerCaseDecodedText = decodedText.toLowerCase();

        if (!isScanningContestant) {
            const conttypePattern = /^conttype:\s*([^;]+);\s*(\d+)$/i;
            const match = decodedText.match(conttypePattern);
            if (match) {
                const contestType = match[1];
                const contestantAmount = parseInt(match[2]);

                const headerText = document.getElementById("header-text");
                headerText.textContent = contestType;

                createContestantLabels(contestantAmount);
                document.getElementById("add-contestant").disabled = false;
                updateStartContestButton();
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
        console.log("getBackCamera function started");
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.find((device) => device.kind === "videoinput" && device.label.toLowerCase().includes("back"));
        console.log("getBackCamera function completed");
    }

    async function initializeScanner() {
        console.log("initializeScanner function started");
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
        console.log("initializeScanner function completed");
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
            updateStartContestButton();
        }
    }

    function resetContestantLabel(index) {
        const contestant = contestants[index - 1];
        contestant.labelElement.textContent = `Contestant ${index}`;
        contestant.name = "";
        updateStartContestButton();
    }

    function updateStartContestButton() {
        const allContestantsAdded = contestants.every((contestant) => contestant.name);
        startContestButton.disabled = !allContestantsAdded;
    }


    initializeScanner();
    console.log("DOMContentLoaded Completed");
});