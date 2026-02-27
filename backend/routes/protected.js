const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const pool = require("../db.js");
const bcrypt = require("bcrypt");

const router = express.Router();

let schemaInitialized = false;

async function ensureSchema() {
    if (schemaInitialized) {
        return;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS publications (
            id SERIAL PRIMARY KEY,
            title TEXT NOT NULL,
            author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            year INTEGER,
            description TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            position TEXT,
            bio TEXT,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        ALTER TABLE publications
        ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);
    await pool.query(`
        ALTER TABLE publications
        ADD COLUMN IF NOT EXISTS year INTEGER
    `);
    await pool.query(`
        ALTER TABLE publications
        ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
    `);
    await pool.query(`
        ALTER TABLE publications
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    `);
    await pool.query(`
        ALTER TABLE publications
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()
    `);

    schemaInitialized = true;
}

router.use(async (req, res, next) => {
    try {
        await ensureSchema();
        next();
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database schema initialization failed" });
    }
});

// Route cho user & admin
router.get("/profile", verifyToken, authorizeRole(["user", "admin"]), (req, res) => {
    res.json({
        message: "This is protected profile data",
        user: req.user
    });
});

// Route chỉ admin
router.get("/admin", verifyToken, authorizeRole("admin"), (req, res) => {
    res.json({
        message: "Welcome Admin",
    });
});

router.get("/publications/public", async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT p.id, p.title, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
            FROM publications p
            LEFT JOIN users u ON u.id = p.author_id
            WHERE p.status = 'approved'
            ORDER BY p.created_at DESC
            `
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load public publications" });
    }
});

router.get("/publications", verifyToken, authorizeRole(["user", "admin"]), async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT p.id, p.title, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
            FROM publications p
            LEFT JOIN users u ON u.id = p.author_id
            WHERE ($1 = 'admin') OR p.status = 'approved' OR p.author_id = $2
            ORDER BY p.created_at DESC
            `,
            [req.user.role, req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load publications" });
    }
});

router.get("/my-publications", verifyToken, authorizeRole(["user", "admin"]), async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT id, title, year, description, status, author_id, created_at
            FROM publications
            WHERE author_id = $1
            ORDER BY created_at DESC
            `,
            [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load your publications" });
    }
});

router.get("/publications/pending", verifyToken, authorizeRole("admin"), async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT p.id, p.title, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
            FROM publications p
            LEFT JOIN users u ON u.id = p.author_id
            WHERE p.status = 'pending'
            ORDER BY p.created_at DESC
            `
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load pending publications" });
    }
});

router.post("/publications", verifyToken, authorizeRole(["user", "admin"]), async (req, res) => {
    const { title, year, description } = req.body;

    if (req.user.role !== "user") {
        return res.status(403).json({ message: "Only authenticated members can create publication" });
    }

    if (!title || !description || !year) {
        return res.status(400).json({ message: "Title, year and description are required" });
    }

    const parsedYear = Number(year);

    if (!Number.isInteger(parsedYear)) {
        return res.status(400).json({ message: "Year must be a valid number" });
    }

    try {
        const result = await pool.query(
            `
            INSERT INTO publications (title, author_id, year, description, status)
            VALUES ($1, $2, $3, $4, 'pending')
            RETURNING id, title, year, description, status, author_id, created_at
            `,
            [title.trim(), req.user.id, parsedYear, description.trim()]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create publication" });
    }
});

router.put("/publications/:id", verifyToken, authorizeRole(["user", "admin"]), async (req, res) => {
    const publicationId = Number(req.params.id);
    const { title, year, description } = req.body;

    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    if (!title || !description || !year) {
        return res.status(400).json({ message: "Title, year and description are required" });
    }

    if (req.user.role !== "user") {
        return res.status(403).json({ message: "Only authenticated members can edit their own publication" });
    }

    const parsedYear = Number(year);

    if (!Number.isInteger(parsedYear)) {
        return res.status(400).json({ message: "Year must be a valid number" });
    }

    try {
        const ownPublication = await pool.query(
            "SELECT id FROM publications WHERE id = $1 AND author_id = $2",
            [publicationId, req.user.id]
        );

        if (ownPublication.rows.length === 0) {
            return res.status(403).json({ message: "You can only edit your own publication" });
        }

        const updated = await pool.query(
            `
            UPDATE publications
            SET title = $1,
                year = $2,
                description = $3,
                status = 'pending'
            WHERE id = $4
            RETURNING id, title, year, description, status, author_id, created_at
            `,
            [title.trim(), parsedYear, description.trim(), publicationId]
        );

        res.json(updated.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update publication" });
    }
});

router.patch("/publications/:id/approve", verifyToken, authorizeRole("admin"), async (req, res) => {
    const publicationId = Number(req.params.id);

    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    try {
        const result = await pool.query(
            `
            UPDATE publications
            SET status = 'approved'
            WHERE id = $1
            RETURNING id, title, year, description, status, author_id, created_at
            `,
            [publicationId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Publication not found" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to approve publication" });
    }
});

router.delete("/publications/:id", verifyToken, authorizeRole(["user", "admin"]), async (req, res) => {
    const publicationId = Number(req.params.id);

    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    try {
        if (req.user.role === "admin") {
            const deleted = await pool.query(
                "DELETE FROM publications WHERE id = $1 RETURNING id",
                [publicationId]
            );

            if (deleted.rows.length === 0) {
                return res.status(404).json({ message: "Publication not found" });
            }

            return res.json({ message: "Publication deleted" });
        }

        const deleted = await pool.query(
            "DELETE FROM publications WHERE id = $1 AND author_id = $2 RETURNING id",
            [publicationId, req.user.id]
        );

        if (deleted.rows.length === 0) {
            return res.status(403).json({ message: "You can only delete your own publication" });
        }

        res.json({ message: "Publication deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete publication" });
    }
});

router.get("/members", verifyToken, authorizeRole("admin"), async (req, res) => {
    try {
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
});

router.post("/members", verifyToken, authorizeRole("admin"), async (req, res) => {
    const { email, password, role, name, position, bio } = req.body;
    const memberRole = role === "admin" ? "admin" : "user";

    if (!email || !password || !name) {
        return res.status(400).json({ message: "Email, password and name are required" });
    }

    const client = await pool.connect();

    try {
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
});

router.delete("/members/:id", verifyToken, authorizeRole("admin"), async (req, res) => {
    const userId = Number(req.params.id);

    if (!Number.isInteger(userId)) {
        return res.status(400).json({ message: "Invalid member id" });
    }

    if (userId === req.user.id) {
        return res.status(400).json({ message: "You cannot delete your own admin account" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            "DELETE FROM members WHERE user_id = $1",
            [userId]
        );

        const result = await client.query(
            "DELETE FROM users WHERE id = $1 RETURNING id",
            [userId]
        );

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
});

module.exports = router;