const pool = require("../db");

async function findByEmail(email, db = pool) {
    const result = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
    );

    return result.rows[0] || null;
}

async function existsByEmail(email, db = pool) {
    const result = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
    );

    return result.rows.length > 0;
}

async function createUser({ email, password, role }, db = pool) {
    const result = await db.query(
        "INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role",
        [email, password, role]
    );

    return result.rows[0];
}

async function updatePasswordById(userId, password, db = pool) {
    await db.query(
        "UPDATE users SET password = $1 WHERE id = $2",
        [password, userId]
    );
}

async function findById(userId, db = pool) {
    const result = await db.query(
        "SELECT id, role FROM users WHERE id = $1",
        [userId]
    );

    return result.rows[0] || null;
}

async function findByIdFull(userId, db = pool) {
    const result = await db.query(
        "SELECT id, email, password, role FROM users WHERE id = $1",
        [userId]
    );

    return result.rows[0] || null;
}

async function updateRole(userId, role, db = pool) {
    const result = await db.query(
        `
        UPDATE users
        SET role = $1
        WHERE id = $2
        RETURNING id, email, role
        `,
        [role, userId]
    );

    return result.rows[0] || null;
}

async function deleteById(userId, db = pool) {
    const result = await db.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [userId]
    );

    return result.rows.length > 0;
}

module.exports = {
    findByEmail,
    existsByEmail,
    createUser,
    updatePasswordById,
    findById,
    findByIdFull,
    updateRole,
    deleteById
};
