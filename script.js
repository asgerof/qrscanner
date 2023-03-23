document.addEventListener('DOMContentLoaded', function() {
    const qrReader = document.getElementById('qr-reader');
    const result = document.getElementById('result');

    function onScanSuccess(decodedText) {
        result.textContent = decodedText;
    }

    function onScanFailure(error) {
        console.warn(`QR code scanning failed: ${error}`);
    }

    const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});