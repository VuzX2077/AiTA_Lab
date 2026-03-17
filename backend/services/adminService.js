const publicationRepository = require("../repositories/publicationRepository");
const userRepository = require("../repositories/userRepository");
const memberService = require("./memberService");

async function getPendingPublications() {
    return publicationRepository.findPendingPublications();
}

async function approvePublication(publicationId) {
    return publicationRepository.updateStatus(publicationId, "approved");
}

async function rejectPublication(publicationId) {
    return publicationRepository.updateStatus(publicationId, "rejected");
}

async function deletePublication(publicationId) {
    return publicationRepository.deleteById(publicationId);
}

async function getMembers() {
    return memberService.getMembers();
}

async function getMember(userId) {
    return memberService.getMember(userId);
}

async function createMember(payload) {
    return memberService.createMemberWithUser(payload);
}

async function updateMember(userId, fields) {
    return memberService.updateMemberProfile(userId, fields);
}

async function deleteMember(userId) {
    return memberService.deleteMemberByUserId(userId);
}

async function updateMemberRole(userId, role) {
    return userRepository.updateRole(userId, role);
}

module.exports = {
    getPendingPublications,
    approvePublication,
    rejectPublication,
    deletePublication,
    getMembers,
    getMember,
    createMember,
    updateMember,
    deleteMember,
    updateMemberRole
};
