const homepageContentRepository = require("../repositories/homepageContentRepository");
const uploadService = require("./uploadService");

function normalizeText(value, fallback = "") {
    if (typeof value !== "string") {
        return fallback;
    }

    return value.trim();
}

function normalizeOptionalUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        return "";
    }

    return value.trim();
}

async function getPublicHomepageContent() {
    const row = await homepageContentRepository.findPublic();
    if (row) {
        return row;
    }

    return {
        hero_title: "AI Technology and Application Research Lab",
        intro_paragraph_1: "",
        intro_paragraph_2: "",
        github_url: "",
        facebook_url: "",
        hero_image_url_1: "",
        hero_image_url_2: "",
        hero_image_url_3: "",
        footer_text: "Copyright © 2025 AI Technology and Application Research Lab @ FPTU - HCMC — All right Reserved."
    };
}

async function getHomepageContentForAdmin() {
    return getPublicHomepageContent();
}

async function saveHomepageContent(payload, actorId) {
    const previous = await homepageContentRepository.findForAdmin();

    const normalizedPayload = {
        hero_title: normalizeText(payload.hero_title, "AI Technology and Application Research Lab"),
        intro_paragraph_1: normalizeText(payload.intro_paragraph_1, ""),
        intro_paragraph_2: normalizeText(payload.intro_paragraph_2, ""),
        github_url: normalizeOptionalUrl(payload.github_url),
        facebook_url: normalizeOptionalUrl(payload.facebook_url),
        hero_image_url_1: normalizeOptionalUrl(payload.hero_image_url_1),
        hero_image_url_2: normalizeOptionalUrl(payload.hero_image_url_2),
        hero_image_url_3: normalizeOptionalUrl(payload.hero_image_url_3),
        footer_text: normalizeText(payload.footer_text, "Copyright © 2025 AI Technology and Application Research Lab @ FPTU - HCMC — All right Reserved.")
    };

    const saved = await homepageContentRepository.upsert(normalizedPayload, actorId);

    const replacedUrls = [
        [previous && previous.hero_image_url_1, normalizedPayload.hero_image_url_1],
        [previous && previous.hero_image_url_2, normalizedPayload.hero_image_url_2],
        [previous && previous.hero_image_url_3, normalizedPayload.hero_image_url_3]
    ]
        .filter(([oldUrl, newUrl]) => oldUrl && oldUrl !== newUrl)
        .map(([oldUrl]) => oldUrl);

    for (const oldUrl of replacedUrls) {
        try {
            await uploadService.deleteImageAssetByPublicUrlIfUnused(oldUrl);
        } catch (error) {
            console.error("Failed to cleanup replaced homepage image:", oldUrl, error);
        }
    }

    return saved;
}

module.exports = {
    getPublicHomepageContent,
    getHomepageContentForAdmin,
    saveHomepageContent
};
