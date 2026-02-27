const bcrypt = require("bcrypt");
const pool = require("../db.js");
const { ensurePublicationSchema } = require("./publicationService");

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

async function getMembers() {
    await ensureMemberSchema();
    const result = await pool.query(
        `
        SELECT u.id AS user_id, u.email, u.role, m.id AS member_id, m.name, m.position, m.bio
        FROM users u
        LEFT JOIN members m ON m.user_id = u.id
        ORDER BY u.id ASC
        `
    );

    return result.rows;
}

async function createMemberWithUser({ email, password, role, name, position, bio }) {
    await ensureMemberSchema();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const exists = await client.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (exists.rows.length > 0) {
            await client.query("ROLLBACK");
            return { conflict: true };
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userResult = await client.query(
            `
            INSERT INTO users (email, password, role)
            VALUES ($1, $2, $3)
            RETURNING id, email, role
            `,
            [email, hashedPassword, role]
        );

        const userId = userResult.rows[0].id;
        const memberResult = await client.query(
            `
            INSERT INTO members (name, position, bio, user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, position, bio, user_id
            `,
            [name, position, bio, userId]
        );

        await client.query("COMMIT");

        return {
            conflict: false,
            user: userResult.rows[0],
            member: memberResult.rows[0]
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function deleteMemberByUserId(userId) {
    await ensureMemberSchema();

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query("DELETE FROM members WHERE user_id = $1", [userId]);
        const result = await client.query("DELETE FROM users WHERE id = $1 RETURNING id", [userId]);

        if (result.rows.length === 0) {
            await client.query("ROLLBACK");
            return false;
        }

        await client.query("COMMIT");
        return true;
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

async function getProfileByUserId(userId) {
    await ensureMemberSchema();
    const profile = await pool.query(
        `
        SELECT m.id, m.name, m.position, m.bio
        FROM members m
        WHERE m.user_id = $1
        `,
        [userId]
    );

    return profile.rows[0] || null;
}

async function getMyPublications(userId) {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        SELECT id, title, year, description, status, author_id, created_at
        FROM publications
        WHERE author_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

async function createPublication({ title, year, description, authorId }) {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        INSERT INTO publications (title, author_id, year, description, status)
        VALUES ($1, $2, $3, $4, 'pending')
        RETURNING id, title, year, description, status, author_id, created_at
        `,
        [title, authorId, year, description]
    );

    return result.rows[0];
}

async function updateOwnPublication({ publicationId, userId, title, year, description }) {
    await ensurePublicationSchema();
    const ownPublication = await pool.query(
        "SELECT id FROM publications WHERE id = $1 AND author_id = $2",
        [publicationId, userId]
    );

    if (ownPublication.rows.length === 0) {
        return null;
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
        [title, year, description, publicationId]
    );

    return updated.rows[0];
}

async function deleteOwnPublication(publicationId, userId) {
    await ensurePublicationSchema();
    const deleted = await pool.query(
        "DELETE FROM publications WHERE id = $1 AND author_id = $2 RETURNING id",
        [publicationId, userId]
    );

    return deleted.rows.length > 0;
}

module.exports = {
    ensureMemberSchema,
    getMembers,
    createMemberWithUser,
    deleteMemberByUserId,
    getProfileByUserId,
    getMyPublications,
    createPublication,
    updateOwnPublication,
    deleteOwnPublication
};