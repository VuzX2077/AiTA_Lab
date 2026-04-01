const homeNewsRepository = require("../repositories/homeNewsRepository");
const uploadService = require("./uploadService");
const { withTransaction } = require("../utils/withTransaction");

async function getPublicHomeNews(limit) {
    return homeNewsRepository.findPublished(limit);
}

async function getPublicHomeNewsPaged(page, limit) {
    return homeNewsRepository.findPublishedPaged(page, limit);
}

async function getPublicHomeNewsById(id) {
    return homeNewsRepository.findPublishedById(id);
}

async function getPublicHomeNewsBySlug(slug) {
    return homeNewsRepository.findPublishedBySlug(slug);
}

async function getPublicHomeNewsConnections(id, relatedLimit) {
    return homeNewsRepository.findPublishedConnections(id, relatedLimit);
}

async function getHomeNewsById(id) {
    return homeNewsRepository.findById(id);
}

async function getHomeNewsForAdmin() {
    return homeNewsRepository.findAll();
}

async function createHomeNews(payload) {
    return homeNewsRepository.createNews(payload);
}

async function updateHomeNews(payload) {
    return withTransaction(async (client) => {
        const existing = await homeNewsRepository.findById(payload.id, client);
        if (!existing) {
            return null;
        }

        const updated = await homeNewsRepository.updateNews(payload, client);
        if (!updated) {
            return null;
        }

        const previousImageAssetId = Number(existing.image_asset_id);
        const nextImageAssetId = Number(updated.image_asset_id);

        const previousSummaryImageAssetId = Number(existing.summary_image_asset_id);
        const nextSummaryImageAssetId = Number(updated.summary_image_asset_id);

        const replacedAssetIds = new Set();

        if (Number.isInteger(previousImageAssetId) && previousImageAssetId !== nextImageAssetId) {
            replacedAssetIds.add(previousImageAssetId);
        }

        if (Number.isInteger(previousSummaryImageAssetId) && previousSummaryImageAssetId !== nextSummaryImageAssetId) {
            replacedAssetIds.add(previousSummaryImageAssetId);
        }

        for (const replacedAssetId of replacedAssetIds) {
            await uploadService.deleteImageAssetIfUnused(replacedAssetId, client);
        }

        return updated;
    });
}

async function deleteHomeNews(id) {
    return withTransaction(async (client) => {
        const existing = await homeNewsRepository.findById(id, client);
        if (!existing) {
            return false;
        }

        const deleted = await homeNewsRepository.deleteNews(id, client);
        if (!deleted) {
            return false;
        }

        const assetIds = new Set();
        const imageAssetId = Number(existing.image_asset_id);
        const summaryImageAssetId = Number(existing.summary_image_asset_id);

        if (Number.isInteger(imageAssetId) && imageAssetId > 0) {
            assetIds.add(imageAssetId);
        }

        if (Number.isInteger(summaryImageAssetId) && summaryImageAssetId > 0) {
            assetIds.add(summaryImageAssetId);
        }

        for (const assetId of assetIds) {
            await uploadService.deleteImageAssetIfUnused(assetId, client);
        }

        return true;
    });
}

module.exports = {
    getPublicHomeNews,
    getPublicHomeNewsPaged,
    getPublicHomeNewsById,
    getPublicHomeNewsBySlug,
    getPublicHomeNewsConnections,
    getHomeNewsById,
    getHomeNewsForAdmin,
    createHomeNews,
    updateHomeNews,
    deleteHomeNews
};