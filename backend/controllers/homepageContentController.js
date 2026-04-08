const homepageContentService = require("../services/homepageContentService");

function isValidHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }

    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function validatePayload(body = {}) {
    const heroTitle = String(body.hero_title || "").trim();
    const introParagraph1 = String(body.intro_paragraph_1 || "").trim();
    const introParagraph2 = String(body.intro_paragraph_2 || "").trim();
    const footerText = String(body.footer_text || "").trim();

    if (!heroTitle) {
        return "hero_title is required";
    }

    if (!introParagraph1) {
        return "intro_paragraph_1 is required";
    }

    if (!introParagraph2) {
        return "intro_paragraph_2 is required";
    }

    if (!footerText) {
        return "footer_text is required";
    }

    const githubUrl = String(body.github_url || "").trim();
    const facebookUrl = String(body.facebook_url || "").trim();
    const heroImageUrl1 = String(body.hero_image_url_1 || "").trim();
    const heroImageUrl2 = String(body.hero_image_url_2 || "").trim();
    const heroImageUrl3 = String(body.hero_image_url_3 || "").trim();

    if (githubUrl && !isValidHttpUrl(githubUrl)) {
        return "github_url must be a valid http(s) URL";
    }

    if (facebookUrl && !isValidHttpUrl(facebookUrl)) {
        return "facebook_url must be a valid http(s) URL";
    }

    if (heroImageUrl1 && !isValidHttpUrl(heroImageUrl1)) {
        return "hero_image_url_1 must be a valid http(s) URL";
    }

    if (heroImageUrl2 && !isValidHttpUrl(heroImageUrl2)) {
        return "hero_image_url_2 must be a valid http(s) URL";
    }

    if (heroImageUrl3 && !isValidHttpUrl(heroImageUrl3)) {
        return "hero_image_url_3 must be a valid http(s) URL";
    }

    return null;
}

async function getPublicHomepageContent(req, res) {
    try {
        const row = await homepageContentService.getPublicHomepageContent();
        return res.json(row);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load homepage content" });
    }
}

async function getHomepageContentForAdmin(req, res) {
    try {
        const row = await homepageContentService.getHomepageContentForAdmin();
        return res.json(row);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load homepage content" });
    }
}

async function saveHomepageContent(req, res) {
    const validationError = validatePayload(req.body || {});
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const saved = await homepageContentService.saveHomepageContent(req.body || {}, req.user.id);
        return res.json(saved);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to save homepage content" });
    }
}

async function replaceHomepageHeroImage(req, res) {
    const slot = Number(req.params.slot);
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) {
        return res.status(400).json({ message: "slot must be 1, 2, or 3" });
    }

    const imageUrl = String(req.body && req.body.image_url ? req.body.image_url : "").trim();
    if (imageUrl && !isValidHttpUrl(imageUrl)) {
        return res.status(400).json({ message: "image_url must be a valid http(s) URL" });
    }

    try {
        const saved = await homepageContentService.replaceHomepageHeroImage(slot, imageUrl, req.user.id);
        return res.json(saved);
    } catch (error) {
        if (error && error.message === "Invalid hero image slot") {
            return res.status(400).json({ message: error.message });
        }

        console.error(error);
        return res.status(500).json({ message: "Failed to replace homepage hero image" });
    }
}

module.exports = {
    getPublicHomepageContent,
    getHomepageContentForAdmin,
    saveHomepageContent,
    replaceHomepageHeroImage
};
