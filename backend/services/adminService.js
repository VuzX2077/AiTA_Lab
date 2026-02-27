const publicationService = require("./publicationService");
const memberService = require("./memberService");

async function getPendingPublications() {
    return publicationService.getPendingPublications();
}

async function approvePublication(publicationId) {
    return publicationService.approvePublication(publicationId);
}

async function deletePublication(publicationId) {
    return publicationService.deletePublicationByAdmin(publicationId);
}

async function getMembers() {
    return memberService.getMembers();
}

async function createMember(payload) {
    return memberService.createMemberWithUser(payload);
}

async function deleteMember(userId) {
    return memberService.deleteMemberByUserId(userId);
}

module.exports = {
    getPendingPublications,
    approvePublication,
    deletePublication,
    getMembers,
    createMember,
    deleteMember
};