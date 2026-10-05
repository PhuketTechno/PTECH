document.addEventListener("DOMContentLoaded", () => {
    const iframe = document.getElementById('gas-iframe');

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
