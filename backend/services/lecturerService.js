const lecturerRepository = require("../repositories/lecturerRepository");
const memberRepository = require("../repositories/memberRepository");
const uploadService = require("./uploadService");
const { withTransaction } = require("../utils/withTransaction");

function normalizeSubjects(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item || "").trim()).filter(Boolean);
            }
        } catch (error) {
            return trimmed.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
        }
    }

    return [];
}

function normalizePayload(payload, actorId) {
    return {
        member_id: payload && payload.member_id !== undefined && payload.member_id !== null && payload.member_id !== ""
            ? Number(payload.member_id)
            : null,
        name: String(payload && payload.name ? payload.name : "").trim(),
        specialization: String(payload && payload.specialization ? payload.specialization : "").trim(),
        teaching_subjects: normalizeSubjects(payload && payload.teaching_subjects),
        bio: String(payload && payload.bio ? payload.bio : "").trim(),
        photo_asset_id: payload && payload.photo_asset_id !== undefined && payload.photo_asset_id !== null && payload.photo_asset_id !== ""
            ? Number(payload.photo_asset_id)
            : null,
        is_published: payload && payload.is_published !== undefined
            ? Boolean(payload.is_published)
            : true,
        display_order: Number.isInteger(Number(payload && payload.display_order))
            ? Number(payload.display_order)
            : 0,
        actor_id: actorId || null
    };
}

async function ensureLinkedMemberExists(memberId, db) {
    if (!Number.isInteger(memberId) || memberId <= 0) {
        return;
    }

    const member = await memberRepository.findByMemberId(memberId, db);
    if (!member) {
        const error = new Error("Linked member not found");
        error.code = "MEMBER_NOT_FOUND";
        throw error;
    }
}

async function getPublicLecturers() {
    return lecturerRepository.findPublic();
}

async function getAllLecturers() {
    return lecturerRepository.findAll();
}

async function createLecturer(payload, actorId) {
    return withTransaction(async (client) => {
        const normalized = normalizePayload(payload, actorId);
        await ensureLinkedMemberExists(normalized.member_id, client);
        return lecturerRepository.create(normalized, client);
    });
}

async function updateLecturer(id, payload, actorId) {
    return withTransaction(async (client) => {
        const existing = await lecturerRepository.findById(id, client);
        if (!existing) {
            return null;
        }

        const normalized = normalizePayload(payload, actorId);
        await ensureLinkedMemberExists(normalized.member_id, client);
        const updated = await lecturerRepository.updateById(id, normalized, client);

        if (!updated) {
            return null;
        }

        await uploadService.deleteImageAssetIfUnused(existing.photo_asset_id, client);
        return updated;
    });
}

async function deleteLecturer(id) {
    return withTransaction(async (client) => {
        const deleted = await lecturerRepository.deleteById(id, client);
        if (!deleted) {
            return false;
        }

        await uploadService.deleteImageAssetIfUnused(deleted.photo_asset_id, client);
        return true;
    });
}

module.exports = {
    getPublicLecturers,
    getAllLecturers,
    createLecturer,
    updateLecturer,
    deleteLecturer
};
