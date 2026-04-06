const homepageContentRepository = require("../repositories/homepageContentRepository");

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

    return homepageContentRepository.upsert(normalizedPayload, actorId);
}

module.exports = {
    getPublicHomepageContent,
    getHomepageContentForAdmin,
    saveHomepageContent
};
