const memberService = require("../services/memberService");
const userRepository = require("../repositories/userRepository");

async function getPublicMembers(req, res) {
    try {
        const query = typeof req.query.q === "string" ? req.query.q : "";
        const section = typeof req.query.section === "string" ? req.query.section : "";
        const members = await memberService.getPublicMembers({ query, section });
        res.json(members);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load members" });
    }
}

async function getPublicMemberDetail(req, res) {
    const memberId = Number(req.params.id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
        return res.status(400).json({ message: "Invalid member id" });
    }

    try {
        const detail = await memberService.getPublicMemberDetail(memberId);
        if (!detail) {
            return res.status(404).json({ message: "Member detail not found" });
        }

        return res.json(detail);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to load member detail" });
    }
}

async function getProfile(req, res) {
    try {
        const profile = await memberService.getProfileByUserId(req.user.id);
        const userInfo = await userRepository.findByIdFull(req.user.id);

        res.json({
            message: "This is protected profile data",
            user: {
                id: req.user.id,
                role: req.user.role,
                email: userInfo?.email || ""
            },
            member: profile
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load profile" });
    }
}

async function updateProfile(req, res) {
    const { name, bio, photo_asset_id, career } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    if (photo_asset_id !== undefined && photo_asset_id !== null && photo_asset_id !== "" && !Number.isInteger(Number(photo_asset_id))) {
        return res.status(400).json({ message: "photo_asset_id must be an integer" });
    }

    if (career !== undefined && !Array.isArray(career)) {
        return res.status(400).json({ message: "career must be an array" });
    }

    try {
        const member = await memberService.updateOwnProfile(req.user.id, {
            name: String(name).trim(),
            bio: bio ? String(bio).trim() : "",
            photo_asset_id: photo_asset_id === undefined || photo_asset_id === null || photo_asset_id === "" ? null : Number(photo_asset_id),
            career: Array.isArray(career)
                ? career.map((item) => String(item || "").trim()).filter(Boolean)
                : []
        });

        return res.json({ member });
    } catch (err) {
        if (err && err.code === "23503") {
            return res.status(400).json({ message: "Invalid photo_asset_id" });
        }
        console.error(err);
        return res.status(500).json({ message: "Failed to update profile" });
    }
}

function isArrayOrUndefined(value) {
    return value === undefined || Array.isArray(value);
}

function isObjectOrUndefined(value) {
    return value === undefined || (value && typeof value === "object" && !Array.isArray(value));
}

function normalizeStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}

function normalizeLinks(value) {
    if (!Array.isArray(value)) return [];

    return value
        .filter((item) => item && typeof item === "object")
        .map((item) => {
            const parsedIconAssetId = Number(item.icon_asset_id);

            return {
                label: String(item.label || "").trim(),
                url: String(item.url || "").trim(),
                color: String(item.color || "").trim(),
                icon_asset_id: Number.isInteger(parsedIconAssetId) && parsedIconAssetId > 0 ? parsedIconAssetId : null
            };
        })
        .filter((item) => item.label && item.url);
}

function isAdminProfileContext(role, section) {
    const normalizedRole = String(role || "").trim().toLowerCase();
    const normalizedSection = String(section || "").trim().toLowerCase();
    return normalizedRole === "admin" || ["director", "researcher", "researchers"].includes(normalizedSection);
}

async function resolveOwnProfileContext(user) {
    const memberProfile = await memberService.getProfileByUserId(user.id);
    const section = String(memberProfile && memberProfile.section ? memberProfile.section : "").trim().toLowerCase();
    return ["director", "researcher", "researchers"].includes(section);
}

async function getOwnPublicPage(req, res) {
    try {
        const useAdminProfile = await resolveOwnProfileContext(req.user);
        const detail = useAdminProfile
            ? await memberService.getOwnAdminPublicPageByUserId(req.user.id)
            : await memberService.getOwnPublicPageByUserId(req.user.id);
        return res.json(detail);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to load your public page" });
    }
}

async function updateOwnPublicPage(req, res) {
    const isAdminRole = await resolveOwnProfileContext(req.user);
    
    const {
        name,
        quote,
        hero_photo_asset_id,
        links,
        education,
        research_experience,
        awards_grants,
        journal_publications,
        conference_proceedings,
        book_chapters,
        patents,
        academic_activities,
        projects
    } = req.body;

    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    if (hero_photo_asset_id !== undefined && hero_photo_asset_id !== null && hero_photo_asset_id !== "" && !Number.isInteger(Number(hero_photo_asset_id))) {
        return res.status(400).json({ message: "hero_photo_asset_id must be an integer" });
    }

    // Validate fields based on user role
    if (isAdminRole) {
        // Admin can edit admin_profile_details with full fields
        if (!isArrayOrUndefined(links) || !isArrayOrUndefined(education) || !isArrayOrUndefined(research_experience)
            || !isArrayOrUndefined(awards_grants) || !isArrayOrUndefined(journal_publications)
            || !isArrayOrUndefined(conference_proceedings) || !isArrayOrUndefined(book_chapters)
            || !isArrayOrUndefined(patents)) {
            return res.status(400).json({ message: "List fields must be arrays" });
        }

        if (!isObjectOrUndefined(academic_activities) || !isObjectOrUndefined(projects)) {
            return res.status(400).json({ message: "academic_activities and projects must be objects" });
        }

        if (academic_activities && ((academic_activities.advisor && !Array.isArray(academic_activities.advisor))
            || (academic_activities.conference_committee && !Array.isArray(academic_activities.conference_committee))
            || (academic_activities.peer_review && !Array.isArray(academic_activities.peer_review)))) {
            return res.status(400).json({ message: "academic_activities fields must be arrays" });
        }

        if (projects && projects.principal_investigator && !Array.isArray(projects.principal_investigator)) {
            return res.status(400).json({ message: "projects.principal_investigator must be an array" });
        }
    } else {
        // Regular member can only edit member_profile_details with limited fields
        if (!isArrayOrUndefined(links) || !isArrayOrUndefined(education) || !isArrayOrUndefined(research_experience)
            || !isArrayOrUndefined(awards_grants) || !isArrayOrUndefined(journal_publications)
            || !isArrayOrUndefined(conference_proceedings)) {
            return res.status(400).json({ message: "List fields must be arrays" });
        }

        if (!isObjectOrUndefined(projects)) {
            return res.status(400).json({ message: "projects must be an object" });
        }

        if (projects && projects.principal_investigator && !Array.isArray(projects.principal_investigator)) {
            return res.status(400).json({ message: "projects.principal_investigator must be an array" });
        }
    }

    try {
        let detail;
        
        if (isAdminRole) {
            // Update admin profile
            detail = await memberService.updateOwnAdminPublicPageByUserId(req.user.id, {
                name: String(name).trim(),
                quote: quote ? String(quote).trim() : "",
                hero_photo_asset_id: hero_photo_asset_id === undefined || hero_photo_asset_id === null || hero_photo_asset_id === "" ? null : Number(hero_photo_asset_id),
                links: normalizeLinks(links),
                education: normalizeStringArray(education),
                research_experience: normalizeStringArray(research_experience),
                awards_grants: normalizeStringArray(awards_grants),
                journal_publications: normalizeStringArray(journal_publications),
                conference_proceedings: normalizeStringArray(conference_proceedings),
                book_chapters: normalizeStringArray(book_chapters),
                patents: normalizeStringArray(patents),
                academic_activities: {
                    advisor: normalizeStringArray(academic_activities && academic_activities.advisor),
                    conference_committee: normalizeStringArray(academic_activities && academic_activities.conference_committee),
                    peer_review: normalizeStringArray(academic_activities && academic_activities.peer_review)
                },
                projects: {
                    principal_investigator: normalizeStringArray(projects && projects.principal_investigator)
                }
            });
        } else {
            // Update member profile
            detail = await memberService.updateOwnPublicPageByUserId(req.user.id, {
                name: String(name).trim(),
                quote: quote ? String(quote).trim() : "",
                hero_photo_asset_id: hero_photo_asset_id === undefined || hero_photo_asset_id === null || hero_photo_asset_id === "" ? null : Number(hero_photo_asset_id),
                links: normalizeLinks(links),
                education: normalizeStringArray(education),
                research_experience: normalizeStringArray(research_experience),
                awards_grants: normalizeStringArray(awards_grants),
                journal_publications: normalizeStringArray(journal_publications),
                conference_proceedings: normalizeStringArray(conference_proceedings),
                projects: {
                    principal_investigator: normalizeStringArray(projects && projects.principal_investigator)
                }
            });
        }

        return res.json(detail);
    } catch (err) {
        if (err && err.code === "23503") {
            return res.status(400).json({ message: "Invalid hero_photo_asset_id" });
        }

        console.error(err);
        return res.status(500).json({ message: "Failed to update your public page" });
    }
}

module.exports = {
    getPublicMembers,
    getPublicMemberDetail,
    getProfile,
    updateProfile,
    getOwnPublicPage,
    updateOwnPublicPage
};
