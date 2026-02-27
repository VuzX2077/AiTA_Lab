const pool = require("../db.js");

let memberSchemaInitialized = false;

async function ensureMemberSchema() {
    if (memberSchemaInitialized) {
        return;
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            position TEXT,
            bio TEXT,
            user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    memberSchemaInitialized = true;
}

async function getProfile(req, res) {
    try {
        await ensureMemberSchema();

        const profile = await pool.query(
            `
            SELECT m.id, m.name, m.position, m.bio
            FROM members m
            WHERE m.user_id = $1
            `,
            [req.user.id]
        );

        res.json({
            message: "This is protected profile data",
            user: req.user,
            member: profile.rows[0] || null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load profile" });
    }
}

module.exports = {
    ensureMemberSchema,
    getProfile
};