const bcrypt = require("bcrypt");
const pool = require("../db.js");
const publicationService = require("../services/publicationService");
const { ensureMemberSchema } = require("./memberController");

async function getPendingPublications(req, res) {
    try {
        const rows = await publicationService.getPendingPublications();
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
        const approved = await publicationService.approvePublication(publicationId);
        if (!approved) {
            return res.status(404).json({ message: "Publication not found" });
        }

        res.json(approved);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to approve publication" });
    }
}

async function deletePublication(req, res) {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    try {
        const deleted = await publicationService.deletePublicationByAdmin(publicationId);
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
        await ensureMemberSchema();
        const result = await pool.query(
            `
            SELECT u.id AS user_id, u.email, u.role, m.id AS member_id, m.name, m.position, m.bio
            FROM users u
            LEFT JOIN members m ON m.user_id = u.id
            ORDER BY u.id ASC
            `
        );

        res.json(result.rows);
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

    const client = await pool.connect();
    try {
        await ensureMemberSchema();
        await client.query("BEGIN");

        const exists = await client.query(
            "SELECT id FROM users WHERE email = $1",
            [email.trim()]
        );

        if (exists.rows.length > 0) {
            await client.query("ROLLBACK");
            return res.status(409).json({ message: "Email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            `
            INSERT INTO users (email, password, role)
            VALUES ($1, $2, $3)
            RETURNING id, email, role
            `,
            [email.trim(), hashedPassword, memberRole]
        );

        const userId = userResult.rows[0].id;
        const memberResult = await client.query(
            `
            INSERT INTO members (name, position, bio, user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, position, bio, user_id
            `,
            [name.trim(), position ? position.trim() : "", bio ? bio.trim() : "", userId]
        );

        await client.query("COMMIT");

        res.status(201).json({
            user: userResult.rows[0],
            member: memberResult.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ message: "Failed to add member" });
    } finally {
        client.release();
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

    const client = await pool.connect();
    try {
        await ensureMemberSchema();
        await client.query("BEGIN");

        await client.query("DELETE FROM members WHERE user_id = $1", [userId]);
        const result = await client.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ message: "Member not found" });
        }

        await client.query("COMMIT");
        res.json({ message: "Member deleted" });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ message: "Failed to delete member" });
    } finally {
        client.release();
    }
}

module.exports = {
    getPendingPublications,
    approvePublication,
    deletePublication,
    getMembers,
    createMember,
    deleteMember
};