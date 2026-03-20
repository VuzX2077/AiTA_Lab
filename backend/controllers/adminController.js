const adminService = require("../services/adminService");

async function getPendingPublications(req, res) {
    try {
        const rows = await adminService.getPendingPublications();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load pending publications" });
    }
}

async function approvePublication(req, res) {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    try {
        const approved = await adminService.approvePublication(publicationId);
        if (!approved) {
            return res.status(404).json({ message: "Publication not found" });
        }

        res.json(approved);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to approve publication" });
    }
}

async function rejectPublication(req, res) {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    try {
        const rejected = await adminService.rejectPublication(publicationId);
        if (!rejected) {
            return res.status(404).json({ message: "Publication not found" });
        }

        res.json(rejected);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to reject publication" });
    }
}

async function deletePublication(req, res) {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    try {
        const deleted = await adminService.deletePublication(publicationId);
        if (!deleted) {
            return res.status(404).json({ message: "Publication not found" });
        }

        res.json({ message: "Publication deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete publication" });
    }
}

async function getMembers(req, res) {
    try {
        const rows = await adminService.getMembers();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load members" });
    }
}

async function getMemberById(req, res) {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
        return res.status(400).json({ message: "Invalid member id" });
    }

    try {
        const member = await adminService.getMember(userId);
        if (!member) {
            return res.status(404).json({ message: "Member not found" });
        }
        res.json(member);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: err.message || "Failed to load member",
            code: err.code || null
        });
    }
}

async function createMember(req, res) {
    const { email, password, role, name, position, bio, section, photo_asset_id, career, links } = req.body;
    const memberRole = role === "admin" ? "admin" : "user";
    const validSections = ["director", "researchers", "undergraduate", "alumni", "collaborators"];

    if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password and name are required" });
    }

    if (section && !validSections.includes(section)) {
        return res.status(400).json({ message: "Invalid section" });
    }

    if (career !== undefined && !Array.isArray(career)) {
        return res.status(400).json({ message: "career must be an array" });
    }

    if (links !== undefined && !Array.isArray(links)) {
        return res.status(400).json({ message: "links must be an array" });
    }

    if (photo_asset_id !== undefined && photo_asset_id !== null && !Number.isInteger(Number(photo_asset_id))) {
        return res.status(400).json({ message: "photo_asset_id must be an integer" });
    }

    try {
        const created = await adminService.createMember({
            email: email.trim(),
            password,
            role: memberRole,
            name: name.trim(),
            position: position ? position.trim() : "",
            bio: bio ? bio.trim() : "",
            section: section || "researchers",
            photo_asset_id: photo_asset_id === undefined || photo_asset_id === null || photo_asset_id === "" ? null : Number(photo_asset_id),
            career: career || [],
            links: links || []
        });

        if (created.conflict) {
            return res.status(409).json({ message: "Email already exists" });
        }

        res.status(201).json({
            user: created.user,
            member: created.member
        });
    } catch (err) {
        if (err && err.code === "23503") {
            return res.status(400).json({ message: "Invalid photo_asset_id" });
        }
        console.error(err);
        res.status(500).json({ message: "Failed to add member" });
    }
}

async function updateMember(req, res) {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
        return res.status(400).json({ message: "Invalid member id" });
    }

    const { name, position, bio, section, photo_asset_id, career, links } = req.body;
    const validSections = ["director", "researchers", "undergraduate", "alumni", "collaborators"];

    if (!name || !String(name).trim()) {
        return res.status(400).json({ message: "Name is required" });
    }

    if (section && !validSections.includes(section)) {
        return res.status(400).json({ message: "Invalid section" });
    }

    if (career !== undefined && !Array.isArray(career)) {
        return res.status(400).json({ message: "career must be an array" });
    }

    if (links !== undefined && !Array.isArray(links)) {
        return res.status(400).json({ message: "links must be an array" });
    }

    if (photo_asset_id !== undefined && photo_asset_id !== null && photo_asset_id !== "" && !Number.isInteger(Number(photo_asset_id))) {
        return res.status(400).json({ message: "photo_asset_id must be an integer" });
    }

    try {
        const updated = await adminService.updateMember(userId, {
            name: String(name).trim(),
            position: position ? String(position).trim() : "",
            bio: bio ? String(bio).trim() : "",
            section: section || "researchers",
            photo_asset_id: photo_asset_id === undefined || photo_asset_id === null || photo_asset_id === "" ? null : Number(photo_asset_id),
            career: career || [],
            links: links || []
        });

        if (!updated) {
            return res.status(404).json({ message: "Member not found" });
        }

        res.json({ member: updated });
    } catch (err) {
        if (err && err.code === "23503") {
            return res.status(400).json({ message: "Invalid photo_asset_id" });
        }
        console.error(err);
        res.status(500).json({ message: "Failed to update member" });
    }
}

async function deleteMember(req, res) {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
        return res.status(400).json({ message: "Invalid member id" });
    }

    if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    try {
        const deleted = await adminService.deleteMember(userId);

        if (!deleted) {
            return res.status(404).json({ message: "Member not found" });
        }

        res.json({ message: "Member deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete member" });
    }
}

async function updateMemberRole(req, res) {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!Number.isInteger(userId)) {
        return res.status(400).json({ message: "Invalid member id" });
    }

    if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot change your own role" });
    }

    if (role !== "admin" && role !== "user") {
        return res.status(400).json({ message: "Role must be either 'admin' or 'user'" });
    }

    try {
        const updated = await adminService.updateMemberRole(userId, role);

        if (!updated) {
            return res.status(404).json({ message: "Member not found" });
        }

        res.json({ user: updated });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update member role" });
    }
}

module.exports = {
    getPendingPublications,
    approvePublication,
    rejectPublication,
    deletePublication,
    getMembers,
    getMemberById,
    createMember,
    updateMember,
    deleteMember,
    updateMemberRole
};