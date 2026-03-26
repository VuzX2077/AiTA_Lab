const homeNewsRepository = require("../repositories/homeNewsRepository");

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
    return homeNewsRepository.updateNews(payload);
}

async function deleteHomeNews(id) {
    return homeNewsRepository.deleteNews(id);
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