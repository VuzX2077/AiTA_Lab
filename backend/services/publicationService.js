const publicationRepository = require("../repositories/publicationRepository");

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
    deleteOwnPublication
};