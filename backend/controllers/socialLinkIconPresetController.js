const socialLinkIconPresetService = require("../services/socialLinkIconPresetService");

function validatePresetPayload(body = {}) {
    const presets = Array.isArray(body && body.presets) ? body.presets : body;

    if (!Array.isArray(presets)) {
        return "presets must be an array";
    }

    if (presets.length === 0) {
        return "presets cannot be empty";
    }

    for (const item of presets) {
        if (!item || typeof item !== "object") {
            return "each preset must be an object";
        }

        if (!String(item.label || "").trim()) {
            return "preset label is required";
        }

        if (item.icon_asset_id !== undefined && item.icon_asset_id !== null && item.icon_asset_id !== "") {
            const parsed = Number(item.icon_asset_id);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                return "icon_asset_id must be a positive integer";
            }
        }
    }

    return null;
}

async function getPublicSocialLinkIconPresets(req, res) {
    try {
        const rows = await socialLinkIconPresetService.getPublicSocialLinkIconPresets();
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load social link icon presets" });
    }
}

async function getSocialLinkIconPresetsForAdmin(req, res) {
    try {
        const rows = await socialLinkIconPresetService.getSocialLinkIconPresetsForAdmin();
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load social link icon presets" });
    }
}

async function saveSocialLinkIconPresets(req, res) {
    const validationError = validatePresetPayload(req.body || {});
    if (validationError) {
        return res.status(400).json({ message: validationError });
    }

    try {
        const saved = await socialLinkIconPresetService.saveSocialLinkIconPresets(req.body || {}, req.user.id);
        return res.json(saved);
    } catch (error) {
        if (error && error.code === "23503") {
            return res.status(400).json({ message: "Invalid icon_asset_id" });
        }

        console.error(error);
        return res.status(500).json({ message: "Failed to save social link icon presets" });
    }
}

module.exports = {
    getPublicSocialLinkIconPresets,
    getSocialLinkIconPresetsForAdmin,
    saveSocialLinkIconPresets
};
