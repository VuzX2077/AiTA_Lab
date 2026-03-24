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

async function getMemberProfile(memberId) {
    return memberRepository.findByMemberId(memberId);
}

async function getPublicMembers({ query, section } = {}) {
    return memberRepository.findPublicMembers({ query, section });
}

async function createMemberWithUser({ email, password, role, name, position, bio, section, photo_asset_id, career, links }) {
    return withTransaction(async (client) => {
        const exists = await userRepository.existsByEmail(email, client);

        if (exists) {
            return { conflict: true };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.createUser({ email, password: hashedPassword, role }, client);
        const member = await memberRepository.createMemberProfile({
            name, position, bio, section, photoAssetId: photo_asset_id, career, links,
            userId: user.id
        }, client);

        return { conflict: false, user, member };
    });
}

async function updateMemberProfile(userId, fields) {
    return memberRepository.updateMemberProfile(userId, {
        ...fields,
        photoAssetId: fields.photo_asset_id
    });
}

async function createStandaloneMemberProfile(fields) {
    return memberRepository.createStandaloneMemberProfile({
        ...fields,
        photoAssetId: fields.photo_asset_id
    });
}

async function updateStandaloneMemberProfile(memberId, fields) {
    return memberRepository.updateByMemberId(memberId, {
        ...fields,
        photoAssetId: fields.photo_asset_id
    });
}

async function deleteMemberProfileById(memberId) {
    return memberRepository.deleteByMemberId(memberId);
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

async function updateOwnProfile(userId, fields) {
    return memberRepository.upsertProfileByUserId(userId, {
        name: fields.name,
        bio: fields.bio,
        photoAssetId: fields.photo_asset_id,
        career: fields.career
    });
}

module.exports = {
    getMembers,
    getMember,
    getMemberProfile,
    getPublicMembers,
    createMemberWithUser,
    createStandaloneMemberProfile,
    updateMemberProfile,
    updateStandaloneMemberProfile,
    deleteMemberByUserId,
    deleteMemberProfileById,
    getProfileByUserId,
    updateOwnProfile
};
