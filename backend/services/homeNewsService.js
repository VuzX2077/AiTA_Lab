const homeNewsRepository = require("../repositories/homeNewsRepository");

async function getPublicHomeNews(limit) {
    return homeNewsRepository.findPublished(limit);
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
    getHomeNewsForAdmin,
    createHomeNews,
    updateHomeNews,
    deleteHomeNews
};