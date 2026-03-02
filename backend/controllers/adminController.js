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

async function createMember(req, res) {
    const { email, password, role, name, position, bio } = req.body;
    const memberRole = role === "admin" ? "admin" : "user";

    if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password and name are required" });
    }

    try {
        const created = await adminService.createMember({
            email: email.trim(),
            password,
            role: memberRole,
            name: name.trim(),
            position: position ? position.trim() : "",
            bio: bio ? bio.trim() : ""
        });

        if (created.conflict) {
            return res.status(409).json({ message: "Email already exists" });
        }

        res.status(201).json({
            user: created.user,
            member: created.member
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to add member" });
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

module.exports = {
    getPendingPublications,
    approvePublication,
    rejectPublication,
    deletePublication,
    getMembers,
    createMember,
    deleteMember
};