const bcrypt = require("bcrypt");
const memberRepository = require("../repositories/memberRepository");
const memberProfileDetailRepository = require("../repositories/memberProfileDetailRepository");
const adminProfileDetailRepository = require("../repositories/adminProfileDetailRepository");
const userRepository = require("../repositories/userRepository");
const { withTransaction } = require("../utils/withTransaction");

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function normalizeActivities(value) {
    const fallback = {
        advisor: [],
        conference_committee: [],
        peer_review: []
    };

    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return fallback;
    }

    return {
        advisor: asArray(value.advisor),
        conference_committee: asArray(value.conference_committee),
        peer_review: asArray(value.peer_review)
    };
}

function normalizeProjects(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { principal_investigator: [] };
    }

    return {
        principal_investigator: asArray(value.principal_investigator)
    };
}

function buildDetailResponse(detail, member) {
    const normalizedResearchExperience = asArray(detail.research_experience);

    return {
        member_id: member.member_id,
        section: member.section || "researchers",
        name: detail.name || "",
        hero_photo_asset_id: detail.hero_photo_asset_id || null,
        hero_photo_url: detail.hero_photo_url || "",
        quote: detail.quote || "",
        links: asArray(detail.links),
        education: asArray(detail.education),
        research_experience: normalizedResearchExperience,
        awards_grants: asArray(detail.awards_grants),
        journal_publications: asArray(detail.journal_publications),
        conference_proceedings: asArray(detail.conference_proceedings),
        book_chapters: asArray(detail.book_chapters),
        patents: asArray(detail.patents),
        academic_activities: normalizeActivities(detail.academic_activities),
        projects: normalizeProjects(detail.projects)
    };
}

function buildAdminDetailResponse(detail, member) {
    const normalizedResearchExperience = asArray(detail.research_experience || detail.working_experience);

    return {
        member_id: member.member_id,
        section: member.section || "researchers",
        name: detail.name || "",
        hero_photo_asset_id: detail.hero_photo_asset_id || null,
        hero_photo_url: detail.hero_photo_url || "",
        quote: detail.quote || "",
        links: asArray(detail.links),
        education: asArray(detail.education),
        research_experience: normalizedResearchExperience,
        awards_grants: asArray(detail.awards_grants),
        journal_publications: asArray(detail.journal_publications),
        conference_proceedings: asArray(detail.conference_proceedings),
        book_chapters: asArray(detail.book_chapters),
        patents: asArray(detail.patents),
        academic_activities: normalizeActivities(detail.academic_activities),
        projects: normalizeProjects(detail.projects)
    };
}

async function ensureOwnedMemberByUserId(userId) {
    let member = await memberRepository.findByUserId(userId);
    if (member && Number.isInteger(Number(member.member_id))) {
        return member;
    }

    const user = await userRepository.findByIdFull(userId);
    if (!user) {
        return null;
    }

    const fallbackName = String(user.email || `member-${userId}`).split("@")[0] || `member-${userId}`;

    await memberRepository.createMemberProfile({
        name: fallbackName,
        position: "",
        bio: "",
        section: "researchers",
        photoAssetId: null,
        career: [],
        links: [],
        userId
    });

    member = await memberRepository.findByUserId(userId);
    return member && Number.isInteger(Number(member.member_id)) ? member : null;
}

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

async function getPublicMemberDetail(memberId) {
    const member = await memberRepository.findPublicMemberById(memberId);
    if (!member) {
        return null;
    }

    // Route to correct profile table based on member section (case-insensitive)
    const normalizedSection = String(member.section || "").trim().toLowerCase();
    const isAdminProfile = ["director", "researcher", "researchers"].includes(normalizedSection);
    const profileRepository = isAdminProfile ? adminProfileDetailRepository : memberProfileDetailRepository;

    let detail = await profileRepository.findByMemberId(memberId);
    if (!detail) {
        detail = await profileRepository.upsertBootstrapFromMember(member);
    }

    if (!detail) {
        return null;
    }

    return buildDetailResponse(detail, member);
}

async function getOwnPublicPageByUserId(userId) {
    const member = await ensureOwnedMemberByUserId(userId);
    if (!member) {
        return null;
    }

    let detail = await memberProfileDetailRepository.findByMemberId(member.member_id);
    if (!detail) {
        detail = await memberProfileDetailRepository.upsertBootstrapFromMember(member);
    }

    if (!detail) {
        return null;
    }

    return buildDetailResponse(detail, member);
}

async function updateOwnPublicPageByUserId(userId, fields) {
    const member = await ensureOwnedMemberByUserId(userId);
    if (!member) {
        return null;
    }

    const updatedDetail = await memberProfileDetailRepository.upsertByMemberId(member.member_id, fields);
    if (!updatedDetail) {
        return null;
    }

    return buildDetailResponse(updatedDetail, member);
}

async function getOwnAdminPublicPageByUserId(userId) {
    const member = await ensureOwnedMemberByUserId(userId);
    if (!member) {
        return null;
    }

    let detail = await adminProfileDetailRepository.findByMemberId(member.member_id);
    if (!detail) {
        detail = await adminProfileDetailRepository.upsertBootstrapFromMember(member);
    }

    if (!detail) {
        return null;
    }

    return buildAdminDetailResponse(detail, member);
}

async function updateOwnAdminPublicPageByUserId(userId, fields) {
    const member = await ensureOwnedMemberByUserId(userId);
    if (!member) {
        return null;
    }

    const updatedDetail = await adminProfileDetailRepository.upsertByMemberId(member.member_id, {
        ...fields,
        working_experience: asArray(fields.research_experience)
    });
    if (!updatedDetail) {
        return null;
    }

    return buildAdminDetailResponse(updatedDetail, member);
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
    getPublicMemberDetail,
    createMemberWithUser,
    createStandaloneMemberProfile,
    updateMemberProfile,
    updateStandaloneMemberProfile,
    deleteMemberByUserId,
    deleteMemberProfileById,
    getProfileByUserId,
    updateOwnProfile,
    getOwnPublicPageByUserId,
    updateOwnPublicPageByUserId,
    getOwnAdminPublicPageByUserId,
    updateOwnAdminPublicPageByUserId
};
