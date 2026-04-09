const socialLinkIconPresetRepository = require("../repositories/socialLinkIconPresetRepository");
const imageAssetRepository = require("../repositories/imageAssetRepository");
const uploadService = require("./uploadService");

const DEFAULT_PRESETS = [
    { label: "Personal Page", color: "#1565c0", icon_asset_id: null, icon_url: "" },
    { label: "ORCID", color: "#a6ce39", icon_asset_id: null, icon_url: "" },
    { label: "Google Scholar", color: "#4285f4", icon_asset_id: null, icon_url: "" },
    { label: "Scopus Author ID", color: "#e07b34", icon_asset_id: null, icon_url: "" },
    { label: "Web of Science", color: "#193e7c", icon_asset_id: null, icon_url: "" },
    { label: "ResearchGate", color: "#00b5a0", icon_asset_id: null, icon_url: "" }
];

function normalizePresets(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set();

    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const label = String(item.label || "").trim();
            const color = String(item.color || "").trim();
            const parsedIconAssetId = Number(item.icon_asset_id);
            const iconAssetId = Number.isInteger(parsedIconAssetId) && parsedIconAssetId > 0 ? parsedIconAssetId : null;

            return {
                label,
                color,
                icon_asset_id: iconAssetId,
                icon_url: String(item.icon_url || "").trim()
            };
        })
        .filter((item) => {
            if (!item.label) {
                return false;
            }

            const key = item.label.toLowerCase();
            if (seen.has(key)) {
                return false;
            }

            seen.add(key);
            return true;
        });
}

function extractIconAssetIds(presets) {
    const ids = new Set();

    normalizePresets(presets).forEach((item) => {
        const iconAssetId = Number(item.icon_asset_id);
        if (Number.isInteger(iconAssetId) && iconAssetId > 0) {
            ids.add(iconAssetId);
        }
    });

    return ids;
}

async function resolvePresetIconUrls(presets, db) {
    const normalized = normalizePresets(presets);
    const iconAssetIds = [...extractIconAssetIds(normalized)];
    const iconUrlByAssetId = new Map();

    for (const iconAssetId of iconAssetIds) {
        const asset = await imageAssetRepository.findById(iconAssetId, db);
        iconUrlByAssetId.set(iconAssetId, asset && asset.public_url ? String(asset.public_url).trim() : "");
    }

    return normalized.map((item) => {
        const iconAssetId = Number(item.icon_asset_id);
        const iconUrl = Number.isInteger(iconAssetId) ? iconUrlByAssetId.get(iconAssetId) : "";

        return {
            label: item.label,
            color: item.color,
            icon_asset_id: Number.isInteger(iconAssetId) && iconAssetId > 0 ? iconAssetId : null,
            icon_url: String(iconUrl || item.icon_url || "").trim()
        };
    });
}

async function getPublicSocialLinkIconPresets() {
    const row = await socialLinkIconPresetRepository.findPublic();

    if (!row) {
        return DEFAULT_PRESETS;
    }

    const resolved = await resolvePresetIconUrls(row.presets);
    return resolved.length ? resolved : DEFAULT_PRESETS;
}

async function getSocialLinkIconPresetsForAdmin() {
    return getPublicSocialLinkIconPresets();
}

async function saveSocialLinkIconPresets(payload, actorId) {
    const previous = await socialLinkIconPresetRepository.findForAdmin();
    const previousPresetList = previous && Array.isArray(previous.presets) ? previous.presets : DEFAULT_PRESETS;

    const nextPresetList = normalizePresets(payload && Array.isArray(payload.presets) ? payload.presets : payload);
    const normalizedNextPresetList = nextPresetList.length ? nextPresetList : DEFAULT_PRESETS;

    const saved = await socialLinkIconPresetRepository.upsertPresets(normalizedNextPresetList, actorId);

    const previousIds = extractIconAssetIds(previousPresetList);
    const nextIds = extractIconAssetIds(normalizedNextPresetList);

    for (const previousId of previousIds) {
        if (!nextIds.has(previousId)) {
            await uploadService.deleteImageAssetIfUnused(previousId);
        }
    }

    const resolved = await resolvePresetIconUrls(saved && Array.isArray(saved.presets) ? saved.presets : normalizedNextPresetList);
    return resolved;
}

module.exports = {
    DEFAULT_PRESETS,
    getPublicSocialLinkIconPresets,
    getSocialLinkIconPresetsForAdmin,
    saveSocialLinkIconPresets
};
