const seminarRepository = require("../repositories/seminarRepository");

async function getPublicSeminars() {
    return seminarRepository.findPublicSeminars();
}

async function getAllSeminars() {
    return seminarRepository.findAllSeminars();
}

async function createSeminar(payload) {
    return seminarRepository.createSeminar(payload);
}

async function updateSeminar(payload) {
    return seminarRepository.updateSeminar(payload);
}

async function deleteSeminar(seminarId) {
    return seminarRepository.deleteSeminar(seminarId);
}

module.exports = {
    getPublicSeminars,
    getAllSeminars,
    createSeminar,
    updateSeminar,
    deleteSeminar
};
