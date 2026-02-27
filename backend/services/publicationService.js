const pool = require("../db.js");

let publicationSchemaInitialized = false;

async function ensurePublicationSchema() {
    if (publicationSchemaInitialized) {
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

    publicationSchemaInitialized = true;
}

async function getPublicationsPublic() {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        SELECT p.id, p.title, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE p.status = 'approved'
        ORDER BY p.created_at DESC
        `
    );
    return result.rows;
}

async function getPublications(role, userId) {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        SELECT p.id, p.title, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE ($1 = 'admin') OR p.status = 'approved' OR p.author_id = $2
        ORDER BY p.created_at DESC
        `,
        [role, userId]
    );
    return result.rows;
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

async function getPendingPublications() {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        SELECT p.id, p.title, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
        `
    );

    return result.rows;
}

async function approvePublication(publicationId) {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        UPDATE publications
        SET status = 'approved'
        WHERE id = $1
        RETURNING id, title, year, description, status, author_id, created_at
        `,
        [publicationId]
    );

    return result.rows[0] || null;
}

async function deletePublicationByAdmin(publicationId) {
    await ensurePublicationSchema();
    const result = await pool.query(
        "DELETE FROM publications WHERE id = $1 RETURNING id",
        [publicationId]
    );

    return result.rows.length > 0;
}

module.exports = {
    ensurePublicationSchema,
    getPublicationsPublic,
    getPublications,
    getMyPublications,
    createPublication,
    updateOwnPublication,
    deleteOwnPublication,
    getPendingPublications,
    approvePublication,
    deletePublicationByAdmin
};