(function () {
    document.addEventListener("DOMContentLoaded", function () {
        const qrReader = document.getElementById("qr-reader");
        const result = document.getElementById("result");
        const startContestButton = document.getElementById("start-contest");

        let contestType;
        let contestants = [];
        let html5QrcodeScanner;
        let contestEffect;
        let isScanningForEffectTarget = false;

        let scanState = "idle";

        function onScanSuccess(qrCodeMessage) {
            result.textContent = qrCodeMessage;

            // Patterns
            const conttypePattern = /^conttype:\s*([^;]+):\s*(\d+)$/i;
            const contestantPrefix = "contestant:";
            const effectPattern = /^effect:(.*):(.*)$/i;

            // Parse the message based on patterns
            let parsedContestType = qrCodeMessage.match(conttypePattern);
            let isContestant = qrCodeMessage.toLowerCase().startsWith(contestantPrefix);
            let parsedEffect = qrCodeMessage.match(effectPattern);

            if (scanState === "awaitingContestantForEffect") {
                if (isContestant) {
                    let targetContestantName = qrCodeMessage.slice(contestantPrefix.length);
                    let targetContestant = contestants.find(c => c.name === targetContestantName);
                    if (targetContestant) {
                        targetContestant.effect = contestEffect;
                        scanState = "idle";
                        contestEffect = null;
                    }
                }
                html5QrcodeScanner.clear();
                if (scanState === "awaitingContestantForEffect") {
                    // If still awaiting a contestant, continue scanning
                    setTimeout(() => {
                        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
                    }, 1000); // Start the scanner again after 1 second
                }
                return;
            }

            // Handle contest type
            if (parsedContestType) {
                let contestTitle = parsedContestType[1];
                let contestantCount = parseInt(parsedContestType[2]);
                document.getElementById("header-text").textContent = contestTitle;
                contestType = contestTitle;
                createContestantLabels(contestantCount);
            }
            // Handle contestant
            else if (isContestant) {
                if (!contestType) {
                    alert("A Contest Card needs to be scanned before adding contestants.");
                } else {
                    let contestantName = qrCodeMessage.slice(contestantPrefix.length);
                    addContestantName(contestantName);
                }
            }
            // Handle effect
            else if (parsedEffect) {
                let effectText = parsedEffect[1];
                let effectTarget = parsedEffect[2];

                if (effectTarget === "contest") {
                    contestEffect = effectText;
                }
                else if (effectTarget === "contestant") {
                    contestEffect = effectText;
                    scanState = "awaitingContestantForEffect";
                    setTimeout(() => {
                        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
                    }, 1000); // Start the scanner again after 1 second
                }
            }

            if (scanState != "awaitingContestantForEffect") {
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
            // Request permission to use the camera up front
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (error) {
                console.warn(`Failed to get access to the camera: ${error}`);
                return;
            }

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
            });

            startContestButton.addEventListener("click", () => {
                let effectText = "";

                if (contestEffect != "") {
                    effectText = "This effect is active: " + contestEffect;
                }

                const prompt = "Pretend to be ProbabilityBot who estimates probabilities of different scenarios. \n" +
                    "Consider the following hypothetical scenario: " + contestants.map(c => c.name).join(", ") + " are competing in the discipline: " + contestType + "." + effectText + "\n" +
                    "I want you to consider and estimate the probability (0.00 - 1.00 - should total 100%) for each contestant of winning the contest to the best of your abilities.\n" +
                    "Reply in the following JSON format without explanation:{\"contestants\": [{ \"C\": \"C1\", \"P\": \"P1\" },{ \"C\": \"C2\", \"P\": \"P2\" },...{ \"C\": \"CN\", \"P\": \"PN\" }]}: ";
                getProbabilitiesFromChatGPT(prompt);
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

        async function getProbabilitiesFromChatGPT(prompt) {
            const rawResponseElement = document.getElementById("chatgpt-response-raw");
            const commentaryResponseElement = document.getElementById("chatgpt-response-commentary");
            const winnerResponseElement = document.getElementById("chatgpt-response-winner");
            const spinnerElement = document.getElementById("loading-spinner");

            if (prompt) {
                // show the loading spinner
                spinnerElement.style.display = "block";

                try {
                    // First request
                    const firstResponse = await sendChatGPTRequest(prompt);
                    const jsonString = extractJsonFromString(firstResponse);
                    const winner = getRandomWinner(jsonString);

                    // Display the raw ChatGPT response
                    rawResponseElement.textContent = `Raw ChatGPT Response: ${firstResponse}`;

                    winnerResponseElement.textContent = `The winner is: ${winner}`;

                    // Second request (based on the previous response)
                    const secondPrompt = `Imagine a radio competition between ${contestants.map(c => c.name).join(", ")} in the discipline: ${contestType}. The predetermined winner is ${winner}. First, briefly introduce each contestant in less than 40 words total. Then, provide a humorous radio commentary of the competition in less than 150 words. Ensure the commentary is enclosed within brackets like this: {<commentary>}.`;
                    const secondResponse = await sendChatGPTRequest(secondPrompt);

                    // Display the second ChatGPT response
                    commentaryResponseElement.textContent = `Commentary: ${secondResponse}`;

                } catch (error) {
                    winnerResponseElement.textContent = error.message;
                }

                // hide the loading spinner
                spinnerElement.style.display = "none";
            }
        }

        async function sendChatGPTRequest(prompt) {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (response.ok) {
                const data = await response.json();
                return data.response;
            } else {
                throw new Error(`Error: ${response.statusText}`);
            }
        }



        function extractJsonFromString(str) {
            const jsonPattern = /{[\s\S]*}/;
            const match = str.match(jsonPattern);
            if (match) {
                return match[0];
            } else {
                throw new Error("Could not find JSON in the response.");
            }
        }

        function getRandomWinner(jsonString) {
            const parsedData = JSON.parse(jsonString);
            const contestants = parsedData.contestants;

            const totalPercentage = contestants.reduce((accumulator, contestant) => {
                return accumulator + parseFloat(contestant.P);
            }, 0);

            if (Math.abs(totalPercentage - 1) > 0.0001) {
                throw new Error("The total winning percentage should be 1.00.");
            }

            const randomValue = Math.random() * totalPercentage;
            let accumulatedPercentage = 0;

            for (const contestant of contestants) {
                accumulatedPercentage += parseFloat(contestant.P);
                if (randomValue <= accumulatedPercentage) {
                    return contestant.C;
                }
            }
            // This should never be reached if the total percentage is 1.00.
            throw new Error("Failed to select a random winner.");
        }

        initializeScanner();

    });
})();