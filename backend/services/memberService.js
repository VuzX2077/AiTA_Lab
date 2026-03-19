const bcrypt = require("bcrypt");
const memberRepository = require("../repositories/memberRepository");
const userRepository = require("../repositories/userRepository");
const { withTransaction } = require("../utils/withTransaction");

async function getMembers() {
    return memberRepository.findAll();
}

async function getMember(userId) {
    return memberRepository.findByUserId(userId);
}

async function getPublicMembers({ query, section } = {}) {
    return memberRepository.findPublicMembers({ query, section });
}

async function createMemberWithUser({ email, password, role, name, position, bio, section, photo_url, career, links }) {
    return withTransaction(async (client) => {
        const exists = await userRepository.existsByEmail(email, client);

        if (exists) {
            return { conflict: true };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.createUser({ email, password: hashedPassword, role }, client);
        const member = await memberRepository.createMemberProfile({
            name, position, bio, section, photo_url, career, links,
            userId: user.id
        }, client);

        return { conflict: false, user, member };
    });
}

async function updateMemberProfile(userId, fields) {
    return memberRepository.updateMemberProfile(userId, fields);
}

async function deleteMemberByUserId(userId) {
    return withTransaction(async (client) => {
        await memberRepository.deleteByUserId(userId, client);
        return userRepository.deleteById(userId, client);
    });
}

async function getProfileByUserId(userId) {
    return memberRepository.findProfileByUserId(userId);
}

module.exports = {
    getMembers,
    getMember,
    getPublicMembers,
    createMemberWithUser,
    updateMemberProfile,
    deleteMemberByUserId,
    getProfileByUserId
};
