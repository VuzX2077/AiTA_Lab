(function () {
    const isLocalhost =
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1";

    window.APP_CONFIG = {
        API_BASE_URL: isLocalhost
            ? "http://localhost:3000"
            : "https://aita-lab.onrender.com"
    };

    window.getApiUrl = function (path) {
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return `${window.APP_CONFIG.API_BASE_URL}${normalizedPath}`;
    };

    window.getPageUrl = function (page) {
        const normalizedPage = page.replace(/^\.\//, "");
        const isNestedPage = window.location.pathname.includes("/pages/");
        return isNestedPage ? `../../${normalizedPage}` : `./${normalizedPage}`;
    };
})();