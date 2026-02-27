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

module.exports = {
    ensurePublicationSchema,
    getPublicationsPublic,
    getPublications
};