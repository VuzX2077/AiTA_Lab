const lecturerService = require("../services/lecturerService");

function isValidPhotoAssetId(value) {
    return value === undefined || value === null || value === "" || Number.isInteger(Number(value));
}

function isValidSubjects(value) {
    return value === undefined || Array.isArray(value) || typeof value === "string";
}

function isValidMemberId(value) {
    return value === undefined || value === null || value === "" || Number.isInteger(Number(value));
}

async function getPublicLecturers(req, res) {
    try {
        const rows = await lecturerService.getPublicLecturers();
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load lecturers" });
    }
}

async function getAdminLecturers(req, res) {
    try {
        const rows = await lecturerService.getAllLecturers();
        return res.json(rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load lecturers" });
    }
}

async function createLecturer(req, res) {
    const { name, teaching_subjects, photo_asset_id, display_order, member_id } = req.body || {};

    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    if (!isValidSubjects(teaching_subjects)) {
        return res.status(400).json({ message: "teaching_subjects must be an array or newline string" });
    }

    if (!isValidPhotoAssetId(photo_asset_id)) {
        return res.status(400).json({ message: "photo_asset_id must be an integer" });
    }

    if (!isValidMemberId(member_id)) {
        return res.status(400).json({ message: "member_id must be an integer" });
    }

    if (display_order !== undefined && !Number.isInteger(Number(display_order))) {
        return res.status(400).json({ message: "display_order must be an integer" });
    }

    try {
        const lecturer = await lecturerService.createLecturer(req.body, req.user.id);
        return res.status(201).json({ lecturer });
    } catch (error) {
        if (error && error.code === "MEMBER_NOT_FOUND") {
            return res.status(400).json({ message: "Linked member not found" });
        }

        if (error && error.code === "23505") {
            return res.status(409).json({ message: "This member is already linked to another lecturer" });
        }

        if (error && error.code === "23503") {
            return res.status(400).json({ message: "Invalid photo_asset_id" });
        }

        console.error(error);
        return res.status(500).json({ message: "Failed to create lecturer" });
    }
}

async function updateLecturer(req, res) {
    const id = Number(req.params.id);
    const { name, teaching_subjects, photo_asset_id, display_order, member_id } = req.body || {};

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid lecturer id" });
    }

    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    if (!isValidSubjects(teaching_subjects)) {
        return res.status(400).json({ message: "teaching_subjects must be an array or newline string" });
    }

    if (!isValidPhotoAssetId(photo_asset_id)) {
        return res.status(400).json({ message: "photo_asset_id must be an integer" });
    }

    if (!isValidMemberId(member_id)) {
        return res.status(400).json({ message: "member_id must be an integer" });
    }

    if (display_order !== undefined && !Number.isInteger(Number(display_order))) {
        return res.status(400).json({ message: "display_order must be an integer" });
    }

    try {
        const lecturer = await lecturerService.updateLecturer(id, req.body, req.user.id);
        if (!lecturer) {
            return res.status(404).json({ message: "Lecturer not found" });
        }

        return res.json({ lecturer });
    } catch (error) {
        if (error && error.code === "MEMBER_NOT_FOUND") {
            return res.status(400).json({ message: "Linked member not found" });
        }

        if (error && error.code === "23505") {
            return res.status(409).json({ message: "This member is already linked to another lecturer" });
        }

        if (error && error.code === "23503") {
            return res.status(400).json({ message: "Invalid photo_asset_id" });
        }

        console.error(error);
        return res.status(500).json({ message: "Failed to update lecturer" });
    }
}

async function deleteLecturer(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid lecturer id" });
    }

    try {
        const deleted = await lecturerService.deleteLecturer(id);
        if (!deleted) {
            return res.status(404).json({ message: "Lecturer not found" });
        }

        return res.json({ message: "Lecturer deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete lecturer" });
    }
}

module.exports = {
    getPublicLecturers,
    getAdminLecturers,
    createLecturer,
    updateLecturer,
    deleteLecturer
};
