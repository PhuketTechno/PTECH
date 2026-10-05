document.addEventListener("DOMContentLoaded", () => {
    const iframe = document.getElementById('gas-iframe');

    // Fetch the URL from the JSON config
    fetch('config.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.appScriptUrl) {
                // Set the iframe source to the Apps Script URL
                iframe.src = data.appScriptUrl;
            } else {
                console.error("appScriptUrl is missing in config.json");
            }
        })
        .catch(error => {
            console.error("Error loading config.json:", error);
        });
});
