const bcrypt = require("bcrypt");
const memberRepository = require("../repositories/memberRepository");
const userRepository = require("../repositories/userRepository");
const { withTransaction } = require("../utils/withTransaction");

async function getMembers() {
    return memberRepository.findAll();
}

async function createMemberWithUser({ email, password, role, name, position, bio }) {
    return withTransaction(async (client) => {
        const exists = await userRepository.existsByEmail(email, client);

        if (exists) {
            return { conflict: true };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userRepository.createUser({ email, password: hashedPassword, role }, client);
        const member = await memberRepository.createMemberProfile({
            name,
            position,
            bio,
            userId: user.id
        }, client);

        return {
            conflict: false,
            user,
            member
        };
    });
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
    createMemberWithUser,
    deleteMemberByUserId,
    getProfileByUserId
};