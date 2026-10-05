document.addEventListener("DOMContentLoaded", () => {
    const iframe = document.getElementById('gas-iframe');
    const spinnerLoader = document.getElementById('spinner-loader');

    // Hide the spinner loader when the iframe is fully loaded
    iframe.addEventListener('load', () => {
        // Only hide if the src is actually set to a remote URL
        if (iframe.src && iframe.src !== window.location.href && iframe.src !== 'about:blank') {
            spinnerLoader.style.opacity = '0';
            setTimeout(() => {
                spinnerLoader.style.display = 'none';
            }, 500); // Wait for fade out transition
        }
    });

    // Fetch the configuration
    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Override the HTML document title if provided in config.json
            if (data.title) {
                document.title = data.title;
            }

            // Load the App Script URL into the iframe
            if (data.appScriptUrl) {
                iframe.src = data.appScriptUrl;
            } else {
                console.error("appScriptUrl is missing in config.json");
            }
        })
        .catch(error => {
            console.error("Error loading config.json:", error);
        });
});
