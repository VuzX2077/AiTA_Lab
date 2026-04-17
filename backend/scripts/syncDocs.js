const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..", "..");
const frontendDir = path.join(rootDir, "frontend");
const docsDir = path.join(rootDir, "docs");
const docsCssDir = path.join(docsDir, "css");
const docsJsDir = path.join(docsDir, "js");
const docsPagesDir = path.join(docsDir, "pages");
const assetVersion = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);

const routeReplacements = [
    ["href=\"/\"", "href=\"./index.html\""],
    ["href=\"/news\"", "href=\"./news.html\""],
    ["href=\"/newsDetail\"", "href=\"./newsDetail.html\""],
    ["href=\"/members\"", "href=\"./members.html\""],
    ["href=\"/publications\"", "href=\"./publications.html\""],
    ["href=\"/researches\"", "href=\"./researches.html\""],
    ["href=\"/lecturers\"", "href=\"./lecturers.html\""],
    ["href=\"/seminars\"", "href=\"./seminars.html\""],
    ["href=\"/archives\"", "href=\"./archives.html\""],
    ["href=\"/contact\"", "href=\"./contact.html\""],
    ["href=\"/memberDetail\"", "href=\"./memberDetail.html\""],
    ["href=\"/login\"", "href=\"./login.html\""],
    ["href=\"/register\"", "href=\"./register.html\""],
    ["href=\"/adminDashboard\"", "href=\"./adminDashboard.html\""],
    ["href=\"/memberDashboard\"", "href=\"./memberDashboard.html\""]
];

const defaultConfigJs = `(function () {
    // Set API_BASE_URL to your deployed backend URL when publishing docs on GitHub Pages.
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const existingConfig = window.APP_CONFIG || {};
    const apiBaseUrl = typeof existingConfig.API_BASE_URL === "string"
        ? existingConfig.API_BASE_URL.replace(/\\/$/, "")
        : (isLocalhost ? "http://localhost:3000" : "");

    window.APP_CONFIG = {
        ...existingConfig,
        API_BASE_URL: apiBaseUrl
    };

    window.getApiUrl = function (path) {
        const normalizedPath = path.startsWith("/") ? path : \`/\${path}\`;
        return window.APP_CONFIG.API_BASE_URL
            ? \`\${window.APP_CONFIG.API_BASE_URL}\${normalizedPath}\`
            : normalizedPath;
    };

    window.getPageUrl = function (page) {
        const normalizedPage = page.replace(/^\.\//, "");
        const isNestedPage = window.location.pathname.includes("/pages/");
        return isNestedPage ? \`../../\${normalizedPage}\` : \`./\${normalizedPage}\`;
    };
})();
`;

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function getHtmlFileNames(dirPath) {
    if (!fs.existsSync(dirPath)) {
        return [];
    }

    return fs.readdirSync(dirPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".html"))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b));
}

function buildPageMappings() {
    const mappings = [];
    const publicPagesDir = path.join(frontendDir, "pages", "public");

    for (const fileName of getHtmlFileNames(publicPagesDir)) {
        mappings.push({ source: ["public", fileName], target: fileName });
    }

    const fixedPages = [
        { source: ["auth", "login.html"], target: "login.html" },
        { source: ["auth", "register.html"], target: "register.html" },
        { source: ["member", "memberDashboard.html"], target: "memberDashboard.html" },
        { source: ["admin", "adminDashboard.html"], target: "adminDashboard.html" }
    ];

    for (const mapping of fixedPages) {
        const sourcePath = path.join(frontendDir, "pages", ...mapping.source);
        if (fs.existsSync(sourcePath)) {
            mappings.push(mapping);
        }
    }

    return mappings;
}

function copyDirectory(sourceDir, targetDir) {
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.cpSync(sourceDir, targetDir, { recursive: true });
}

function copyFrontendJs() {
    ensureDir(docsJsDir);
    for (const entry of fs.readdirSync(docsJsDir)) {
        if (entry === "config.js") {
            continue;
        }

        fs.rmSync(path.join(docsJsDir, entry), { recursive: true, force: true });
    }

    const frontendJsDir = path.join(frontendDir, "js");
    for (const entry of fs.readdirSync(frontendJsDir)) {
        fs.cpSync(path.join(frontendJsDir, entry), path.join(docsJsDir, entry), { recursive: true });
    }
}

function ensureConfigJs() {
    const configPath = path.join(docsJsDir, "config.js");
    if (!fs.existsSync(configPath) || !fs.readFileSync(configPath, "utf8").trim()) {
        fs.writeFileSync(configPath, defaultConfigJs);
    }
}

function normalizeHtml(content) {
    let normalized = content
        .replace(/href="\.\.\/\.\.\/css\//g, 'href="/css/')
        .replace(/src="\.\.\/\.\.\/js\//g, 'src="/js/')
        .replace(/href="css\//g, 'href="/css/')
        .replace(/src="js\//g, 'src="/js/');

    for (const [from, to] of routeReplacements) {
        normalized = normalized.replaceAll(from, to);
    }

    normalized = normalized.replace(/<script src="(?:\/)?js\/config\.js"><\/script>\s*/g, "");

    if (normalized.includes('<script src="/js/')) {
        normalized = normalized.replace(
            /<script src="\/js\//,
            '<script src="/js/config.js"></script>\n<script src="/js/'
        );
    } else if (normalized.includes('<script src="js/')) {
        normalized = normalized.replace(
            /<script src="js\//,
            '<script src="/js/config.js"></script>\n<script src="/js/'
        );
    }

    // Cache-bust local static assets so mobile browsers on DirectAdmin do not keep stale files.
    normalized = normalized
        .replace(/href="(\/css\/[^"]+\.css)(?:\?[^\"]*)?"/g, `href="$1?v=${assetVersion}"`)
        .replace(/src="(\/js\/[^"]+\.js)(?:\?[^\"]*)?"/g, `src="$1?v=${assetVersion}"`)
        .replace(/href="(css\/[^"]+\.css)(?:\?[^\"]*)?"/g, `href="$1?v=${assetVersion}"`)
        .replace(/src="(js\/[^"]+\.js)(?:\?[^\"]*)?"/g, `src="$1?v=${assetVersion}"`);

    return normalized;
}

function writeRootPages() {
    const pageMappings = buildPageMappings();
    const expectedRootFiles = new Set(pageMappings.map((mapping) => mapping.target));
    expectedRootFiles.add("register.html");
    expectedRootFiles.add("index.html");

    for (const fileName of getHtmlFileNames(docsDir)) {
        if (!expectedRootFiles.has(fileName)) {
            fs.rmSync(path.join(docsDir, fileName), { force: true });
        }
    }

    for (const mapping of pageMappings) {
        const sourcePath = path.join(frontendDir, "pages", ...mapping.source);
        const targetPath = path.join(docsDir, mapping.target);

        if (!fs.existsSync(sourcePath)) {
            fs.rmSync(targetPath, { force: true });
            continue;
        }

        const html = fs.readFileSync(sourcePath, "utf8");
        fs.writeFileSync(targetPath, normalizeHtml(html));
    }

    const registerSource = path.join(frontendDir, "pages", "auth", "register.html");
    const registerTarget = path.join(docsDir, "register.html");

    if (fs.existsSync(registerSource)) {
        const registerHtml = fs.readFileSync(registerSource, "utf8").trim();
        if (registerHtml) {
            fs.writeFileSync(registerTarget, normalizeHtml(registerHtml));
            return;
        }
    }

    fs.writeFileSync(
        registerTarget,
        `<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register - AiTA Lab</title>
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/components.css">
    <link rel="stylesheet" href="css/auth.css">
</head>

<body class="login-page">
    <div class="login-container">
        <div class="login-card">
            <h2>Register</h2>
            <p>Registration is not available in the GitHub Pages static version yet.</p>
            <p class="back-home">
                <a href="./index.html">← Back to Home</a>
            </p>
        </div>
    </div>
</body>

</html>
`
    );

}

function writePageRedirect(relativeDir, fileName, targetFile) {
    const filePath = path.join(docsPagesDir, relativeDir, fileName);
    ensureDir(path.dirname(filePath));

    const redirectTarget = `../../${targetFile}`;
    fs.writeFileSync(
        filePath,
        `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="0; url=${redirectTarget}">
    <title>Redirecting...</title>
</head>
<body>
    <p>Redirecting to <a href="${redirectTarget}">${redirectTarget}</a>.</p>
</body>
</html>
`
    );
}

function writeRedirectPages() {
    fs.rmSync(docsPagesDir, { recursive: true, force: true });

    const pageMappings = buildPageMappings();

    for (const mapping of pageMappings) {
        const [section, fileName] = mapping.source;
        writePageRedirect(section, fileName, mapping.target);
    }
}

function syncDocs() {
    ensureDir(docsDir);
    copyDirectory(path.join(frontendDir, "css"), docsCssDir);
    copyFrontendJs();
    ensureConfigJs();

    const frontendScriptPath = path.join(frontendDir, "script.js");
    if (fs.existsSync(frontendScriptPath)) {
        fs.cpSync(frontendScriptPath, path.join(docsDir, "script.js"));
    }

    writeRootPages();
    writeRedirectPages();

    console.log("Docs synced from frontend to docs/.");
}

syncDocs();