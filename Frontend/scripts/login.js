document.addEventListener('DOMContentLoaded', () => {
    const errorMessageDiv = document.getElementById('error-message');

    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
        errorMessageDiv.textContent = error;
    }
});