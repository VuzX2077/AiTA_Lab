const publicationRepository = require("../repositories/publicationRepository");

function extractDoiFromText(value) {
    const source = String(value || "").trim();
    if (!source) {
        return "";
    }

    const variants = [source];
    try {
        variants.push(decodeURIComponent(source));
    } catch (error) {
        // Ignore malformed URI sequences and keep raw source.
    }

    const doiPattern = /\b10\.\d{4,9}\/[\-._;()/:A-Z0-9]+/i;

    for (const variant of variants) {
        const match = String(variant).match(doiPattern);
        if (match && match[0]) {
            return match[0].replace(/[\s),.;]+$/g, "");
        }
    }

    return "";
}

function isPrivateOrLocalHostname(hostname) {
    const normalized = String(hostname || "").trim().toLowerCase();
    if (!normalized) {
        return true;
    }

    if (["localhost", "127.0.0.1", "::1"].includes(normalized)) {
        return true;
    }

    if (normalized.endsWith(".local")) {
        return true;
    }

    if (/^127\./.test(normalized) || /^10\./.test(normalized) || /^192\.168\./.test(normalized)) {
        return true;
    }

    const private172 = normalized.match(/^172\.(\d{1,3})\./);
    if (private172) {
        const octet = Number(private172[1]);
        if (octet >= 16 && octet <= 31) {
            return true;
        }
    }

    return false;
}

async function resolveDoiFromLink(link) {
    if (typeof link !== "string" || !link.trim()) {
        return { doi: "" };
    }

    let parsed;
    try {
        parsed = new URL(link.trim());
    } catch (error) {
        const err = new Error("Link must be a valid URL");
        err.statusCode = 400;
        throw err;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        const err = new Error("Link must start with http:// or https://");
        err.statusCode = 400;
        throw err;
    }

    if (isPrivateOrLocalHostname(parsed.hostname)) {
        const err = new Error("Private or local URLs are not allowed");
        err.statusCode = 400;
        throw err;
    }

    const directFromUrl = extractDoiFromText(`${parsed.pathname} ${parsed.search}`);
    if (directFromUrl) {
        return { doi: directFromUrl };
    }

    for (const value of parsed.searchParams.values()) {
        const fromParam = extractDoiFromText(value);
        if (fromParam) {
            return { doi: fromParam };
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    let response;
    try {
        response = await fetch(parsed.toString(), {
            method: "GET",
            redirect: "follow",
            signal: controller.signal,
            headers: {
                "User-Agent": "AiTA-Lab DOI Resolver/1.0",
                "Accept": "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5"
            }
        });
    } catch (error) {
        if (error && error.name === "AbortError") {
            return { doi: "", message: "Lookup timed out" };
        }
        return { doi: "", message: "Could not access publication page" };
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        return { doi: "", message: "Publication page is not accessible" };
    }

    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    if (contentType && !contentType.includes("html") && !contentType.includes("text")) {
        return { doi: "", message: "Unsupported content type for DOI extraction" };
    }

    const html = await response.text();

    const metaPatterns = [
        /<meta[^>]+name=["']citation_doi["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']citation_doi["'][^>]*>/i,
        /<meta[^>]+name=["']dc\.identifier["'][^>]+content=["']doi:([^"']+)["'][^>]*>/i,
        /<meta[^>]+property=["']og:doi["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+name=["']doi["'][^>]+content=["']([^"']+)["'][^>]*>/i
    ];

    for (const pattern of metaPatterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            const cleaned = extractDoiFromText(String(match[1]).replace(/^doi:/i, ""));
            if (cleaned) {
                return { doi: cleaned };
            }
        }
    }

    const fromHtml = extractDoiFromText(html);
    if (fromHtml) {
        return { doi: fromHtml };
    }

    return { doi: "", message: "DOI not found from provided link" };
}

async function getPublicationsPublic() {
    return publicationRepository.findApprovedPublications();
}

async function getPublications(role, userId) {
    return publicationRepository.findVisiblePublications(role, userId);
}

async function getMyPublications(userId) {
    return publicationRepository.findByAuthorId(userId);
}

async function createPublication(payload) {
    return publicationRepository.createPublication(payload);
}

async function updateOwnPublication({ publicationId, userId, ...payload }) {
    const ownPublication = await publicationRepository.findOwnedPublication(publicationId, userId);

    if (!ownPublication) {
        return null;
    }

    return publicationRepository.updateOwnedPublication({
        publicationId,
        ...payload
    });
}

async function deleteOwnPublication(publicationId, userId) {
    return publicationRepository.deleteOwnedPublication(publicationId, userId);
}

module.exports = {
    getPublicationsPublic,
    getPublications,
    getMyPublications,
    createPublication,
    updateOwnPublication,
    deleteOwnPublication,
    resolveDoiFromLink
};