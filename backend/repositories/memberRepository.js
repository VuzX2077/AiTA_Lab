const pool = require("../db");

async function findAll(db = pool) {
    const result = await db.query(
        `
        SELECT u.id AS user_id, u.email, u.role, m.id AS member_id, m.name, m.position, m.bio
        FROM users u
        LEFT JOIN members m ON m.user_id = u.id
        ORDER BY u.id ASC
        `
    );

    return result.rows;
}

async function createMemberProfile({ name, position, bio, userId }, db = pool) {
    const result = await db.query(
        `
        INSERT INTO members (name, position, bio, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, position, bio, user_id
        `,
        [name, position, bio, userId]
    );

    return result.rows[0];
}

async function deleteByUserId(userId, db = pool) {
    await db.query("DELETE FROM members WHERE user_id = $1", [userId]);
}

async function findProfileByUserId(userId, db = pool) {
    const result = await db.query(
        `
        SELECT m.id, m.name, m.position, m.bio
        FROM members m
        WHERE m.user_id = $1
        `,
        [userId]
    );

    return result.rows[0] || null;
}

module.exports = {
    findAll,
    createMemberProfile,
    deleteByUserId,
    findProfileByUserId
};
