const bcrypt = require("bcrypt");
const memberRepository = require("../repositories/memberRepository");
const memberProfileDetailRepository = require("../repositories/memberProfileDetailRepository");
const adminProfileDetailRepository = require("../repositories/adminProfileDetailRepository");
const userRepository = require("../repositories/userRepository");
const imageAssetRepository = require("../repositories/imageAssetRepository");
const uploadService = require("./uploadService");
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

function normalizeLinkObjects(links) {
    return asArray(links)
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const parsedIconAssetId = Number(item.icon_asset_id);

            return {
                label: String(item.label || "").trim(),
                url: String(item.url || "").trim(),
                color: String(item.color || "").trim(),
                icon_asset_id: Number.isInteger(parsedIconAssetId) && parsedIconAssetId > 0 ? parsedIconAssetId : null,
                icon_url: String(item.icon_url || "").trim()
            };
        })
        .filter((item) => item.label && item.url);
}

function extractLinkIconAssetIds(links) {
    const ids = new Set();

    normalizeLinkObjects(links).forEach((item) => {
        const iconAssetId = Number(item.icon_asset_id);
        if (Number.isInteger(iconAssetId) && iconAssetId > 0) {
            ids.add(iconAssetId);
        }
    });

    return ids;
}

async function resolveLinksWithIconUrls(links, db) {
    const normalizedLinks = normalizeLinkObjects(links);
    const iconAssetIds = [...extractLinkIconAssetIds(normalizedLinks)];
    const iconUrlByAssetId = new Map();

    for (const iconAssetId of iconAssetIds) {
        const asset = await imageAssetRepository.findById(iconAssetId, db);
        iconUrlByAssetId.set(iconAssetId, asset && asset.public_url ? String(asset.public_url).trim() : "");
    }

    return normalizedLinks.map((item) => {
        const iconAssetId = Number(item.icon_asset_id);
        const resolvedUrl = Number.isInteger(iconAssetId) ? iconUrlByAssetId.get(iconAssetId) : "";

        return {
            label: item.label,
            url: item.url,
            color: item.color,
            icon_asset_id: Number.isInteger(iconAssetId) && iconAssetId > 0 ? iconAssetId : null,
            icon_url: String(resolvedUrl || item.icon_url || "").trim()
        };
    });
}

async function cleanupReplacedLinkIconAssets(previousLinks, nextLinks, db) {
    const previousIds = extractLinkIconAssetIds(previousLinks);
    const nextIds = extractLinkIconAssetIds(nextLinks);

    for (const previousId of previousIds) {
        if (!nextIds.has(previousId)) {
            await uploadService.deleteImageAssetIfUnused(previousId, db);
        }
    }
}

async function buildDetailResponse(detail, member, db) {
    const normalizedResearchExperience = asArray(detail.research_experience);
    const normalizedLinks = await resolveLinksWithIconUrls(detail.links, db);

    return {
        member_id: member.member_id,
        section: member.section || "researchers",
        name: detail.name || "",
        hero_photo_asset_id: detail.hero_photo_asset_id || null,
        hero_photo_url: detail.hero_photo_url || "",
        quote: detail.quote || "",
        links: normalizedLinks,
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

async function buildAdminDetailResponse(detail, member, db) {
    const normalizedResearchExperience = asArray(detail.research_experience || detail.working_experience);
    const normalizedLinks = await resolveLinksWithIconUrls(detail.links, db);

    return {
        member_id: member.member_id,
        section: member.section || "researchers",
        name: detail.name || "",
        hero_photo_asset_id: detail.hero_photo_asset_id || null,
        hero_photo_url: detail.hero_photo_url || "",
        quote: detail.quote || "",
        links: normalizedLinks,
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

async function cleanupReplacedImageAsset(previousAssetId, nextAssetId, db) {
    const previousId = Number(previousAssetId);
    const nextId = Number(nextAssetId);

    if (!Number.isInteger(previousId) || previousId <= 0) {
        return;
    }

    if (previousId === nextId) {
        return;
    }

    await uploadService.deleteImageAssetIfUnused(previousId, db);
}

async function ensureOwnedMemberByUserId(userId, db) {
    let member = await memberRepository.findByUserId(userId, db);
    if (member && Number.isInteger(Number(member.member_id))) {
        return member;
    }

    const user = await userRepository.findByIdFull(userId, db);
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
    }, db);

    member = await memberRepository.findByUserId(userId, db);
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
    return withTransaction(async (client) => {
        const member = await ensureOwnedMemberByUserId(userId, client);
        if (!member) {
            return null;
        }

        const previousDetail = await memberProfileDetailRepository.findByMemberId(member.member_id, client);
        const updatedDetail = await memberProfileDetailRepository.upsertByMemberId(member.member_id, fields, client);
        if (!updatedDetail) {
            return null;
        }

        await cleanupReplacedImageAsset(previousDetail && previousDetail.hero_photo_asset_id, updatedDetail.hero_photo_asset_id, client);
        await cleanupReplacedLinkIconAssets(previousDetail && previousDetail.links, updatedDetail.links, client);

        return buildDetailResponse(updatedDetail, member);
    });
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
    return withTransaction(async (client) => {
        const member = await ensureOwnedMemberByUserId(userId, client);
        if (!member) {
            return null;
        }

        const previousDetail = await adminProfileDetailRepository.findByMemberId(member.member_id, client);
        const updatedDetail = await adminProfileDetailRepository.upsertByMemberId(member.member_id, {
            ...fields,
            working_experience: asArray(fields.research_experience)
        }, client);
        if (!updatedDetail) {
            return null;
        }

        await cleanupReplacedImageAsset(previousDetail && previousDetail.hero_photo_asset_id, updatedDetail.hero_photo_asset_id, client);
        await cleanupReplacedLinkIconAssets(previousDetail && previousDetail.links, updatedDetail.links, client);

        return buildAdminDetailResponse(updatedDetail, member);
    });
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
    return withTransaction(async (client) => {
        const previousMember = await memberRepository.findByUserId(userId, client);
        const updatedMember = await memberRepository.updateMemberProfile(userId, {
            ...fields,
            photoAssetId: fields.photo_asset_id
        }, client);

        if (!updatedMember) {
            return null;
        }

        await cleanupReplacedImageAsset(previousMember && previousMember.photo_asset_id, updatedMember.photo_asset_id, client);
        await cleanupReplacedLinkIconAssets(previousMember && previousMember.links, updatedMember.links, client);
        return updatedMember;
    });
}

async function createStandaloneMemberProfile(fields) {
    return memberRepository.createStandaloneMemberProfile({
        ...fields,
        photoAssetId: fields.photo_asset_id
    });
}

async function updateStandaloneMemberProfile(memberId, fields) {
    return withTransaction(async (client) => {
        const previousMember = await memberRepository.findByMemberId(memberId, client);
        const updatedMember = await memberRepository.updateByMemberId(memberId, {
            ...fields,
            photoAssetId: fields.photo_asset_id
        }, client);

        if (!updatedMember) {
            return null;
        }

        await cleanupReplacedImageAsset(previousMember && previousMember.photo_asset_id, updatedMember.photo_asset_id, client);
        await cleanupReplacedLinkIconAssets(previousMember && previousMember.links, updatedMember.links, client);
        return updatedMember;
    });
}

async function deleteMemberProfileById(memberId) {
    return withTransaction(async (client) => {
        const existingMember = await memberRepository.findByMemberId(memberId, client);
        if (!existingMember) {
            return false;
        }

        const deleted = await memberRepository.deleteByMemberId(memberId, client);
        if (!deleted) {
            return false;
        }

        await uploadService.deleteImageAssetIfUnused(existingMember.photo_asset_id, client);

        const linkIconAssetIds = extractLinkIconAssetIds(existingMember.links);
        for (const assetId of linkIconAssetIds) {
            await uploadService.deleteImageAssetIfUnused(assetId, client);
        }

        return true;
    });
}

async function deleteMemberByUserId(userId) {
    return withTransaction(async (client) => {
        const existingMember = await memberRepository.findByUserId(userId, client);
        if (!existingMember || !Number.isInteger(Number(existingMember.member_id))) {
            return false;
        }

        const memberId = Number(existingMember.member_id);
        const memberDetail = await memberProfileDetailRepository.findByMemberId(memberId, client);
        const adminDetail = await adminProfileDetailRepository.findByMemberId(memberId, client);

        await memberRepository.deleteByUserId(userId, client);
        const deletedUser = await userRepository.deleteById(userId, client);
        if (!deletedUser) {
            return false;
        }

        const assetIds = new Set();
        const memberPhotoAssetId = Number(existingMember.photo_asset_id);
        const memberHeroAssetId = Number(memberDetail && memberDetail.hero_photo_asset_id);
        const adminHeroAssetId = Number(adminDetail && adminDetail.hero_photo_asset_id);
        const memberLinksIconAssetIds = extractLinkIconAssetIds(existingMember.links);
        const memberLinkIconAssetIds = extractLinkIconAssetIds(memberDetail && memberDetail.links);
        const adminLinkIconAssetIds = extractLinkIconAssetIds(adminDetail && adminDetail.links);

        if (Number.isInteger(memberPhotoAssetId) && memberPhotoAssetId > 0) {
            assetIds.add(memberPhotoAssetId);
        }

        if (Number.isInteger(memberHeroAssetId) && memberHeroAssetId > 0) {
            assetIds.add(memberHeroAssetId);
        }

        if (Number.isInteger(adminHeroAssetId) && adminHeroAssetId > 0) {
            assetIds.add(adminHeroAssetId);
        }

        for (const assetId of memberLinksIconAssetIds) {
            assetIds.add(assetId);
        }

        for (const assetId of memberLinkIconAssetIds) {
            assetIds.add(assetId);
        }

        for (const assetId of adminLinkIconAssetIds) {
            assetIds.add(assetId);
        }

        for (const assetId of assetIds) {
            await uploadService.deleteImageAssetIfUnused(assetId, client);
        }

        return true;
    });
}

async function getProfileByUserId(userId) {
    return memberRepository.findProfileByUserId(userId);
}

async function updateOwnProfile(userId, fields) {
    return withTransaction(async (client) => {
        const previousMember = await memberRepository.findByUserId(userId, client);

        const updatedMember = await memberRepository.upsertProfileByUserId(userId, {
            name: fields.name,
            bio: fields.bio,
            photoAssetId: fields.photo_asset_id,
            career: fields.career
        }, client);

        if (!updatedMember) {
            return null;
        }

        await cleanupReplacedImageAsset(previousMember && previousMember.photo_asset_id, updatedMember.photo_asset_id, client);

        return updatedMember;
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
