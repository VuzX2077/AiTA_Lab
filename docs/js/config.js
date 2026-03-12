(function () {
    // Set API_BASE_URL to your deployed backend URL when publishing docs on GitHub Pages.
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const existingConfig = window.APP_CONFIG || {};
    const apiBaseUrl = typeof existingConfig.API_BASE_URL === "string"
        ? existingConfig.API_BASE_URL.replace(/\/$/, "")
        : (isLocalhost ? "http://localhost:3000" : "");

    window.APP_CONFIG = {
        ...existingConfig,
        API_BASE_URL: apiBaseUrl
    };

    window.getApiUrl = function (path) {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return window.APP_CONFIG.API_BASE_URL
            ? `${window.APP_CONFIG.API_BASE_URL}${normalizedPath}`
            : normalizedPath;
    };
})();