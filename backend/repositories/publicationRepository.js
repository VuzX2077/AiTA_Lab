const pool = require("../db");

async function findApprovedPublications(db = pool) {
    const result = await db.query(
        `
        SELECT p.id, p.title, p.link, p.authors, p.publication_type, p.author_ids, p.journal, p.doi, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE p.status = 'approved'
        ORDER BY p.created_at DESC
        `
    );

    return result.rows;
}

async function findVisiblePublications(role, userId, db = pool) {
    const result = await db.query(
        `
        SELECT p.id, p.title, p.link, p.authors, p.publication_type, p.author_ids, p.journal, p.doi, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE ($1 = 'admin') OR p.status = 'approved' OR p.author_id = $2
        ORDER BY p.created_at DESC
        `,
        [role, userId]
    );

    return result.rows;
}

async function findPendingPublications(db = pool) {
    const result = await db.query(
        `
        SELECT p.id, p.title, p.link, p.authors, p.publication_type, p.author_ids, p.journal, p.doi, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
        FROM publications p
        LEFT JOIN users u ON u.id = p.author_id
        WHERE p.status = 'pending'
        ORDER BY p.created_at DESC
        `
    );

    return result.rows;
}

async function findByAuthorId(userId, db = pool) {
    const result = await db.query(
        `
        SELECT id, title, link, authors, publication_type, author_ids, journal, doi, year, description, status, author_id, created_at
        FROM publications
        WHERE author_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
    );

    return result.rows;
}

async function createPublication({ title, link, authors, publicationType, authorIds, journal, doi, year, description, authorId }, db = pool) {
    const result = await db.query(
        `
        INSERT INTO publications (title, link, authors, publication_type, author_ids, journal, doi, author_id, year, description, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
        RETURNING id, title, link, authors, publication_type, author_ids, journal, doi, year, description, status, author_id, created_at
        `,
        [title, link || null, authors, publicationType, JSON.stringify(authorIds || []), journal, doi, authorId, year, description]
    );

    return result.rows[0];
}

async function findOwnedPublication(publicationId, userId, db = pool) {
    const result = await db.query(
        "SELECT id FROM publications WHERE id = $1 AND author_id = $2",
        [publicationId, userId]
    );

    return result.rows[0] || null;
}

async function updateOwnedPublication({ publicationId, title, link, authors, publicationType, authorIds, journal, doi, year, description }, db = pool) {
    const result = await db.query(
        `
        UPDATE publications
        SET title = $1,
            link = $2,
            authors = $3,
            publication_type = $4,
            author_ids = $5,
            journal = $6,
            doi = $7,
            year = $8,
            description = $9,
            status = 'pending'
        WHERE id = $10
        RETURNING id, title, link, authors, publication_type, author_ids, journal, doi, year, description, status, author_id, created_at
        `,
        [title, link || null, authors, publicationType, JSON.stringify(authorIds || []), journal, doi, year, description, publicationId]
    );

    return result.rows[0] || null;
}

async function deleteOwnedPublication(publicationId, userId, db = pool) {
    const result = await db.query(
        "DELETE FROM publications WHERE id = $1 AND author_id = $2 RETURNING id",
        [publicationId, userId]
    );

    return result.rows.length > 0;
}

async function updateStatus(publicationId, status, db = pool) {
    const result = await db.query(
        `
        UPDATE publications
        SET status = $1
        WHERE id = $2
        RETURNING id, title, link, authors, publication_type, author_ids, journal, doi, year, description, status, author_id, created_at
        `,
        [status, publicationId]
    );

    return result.rows[0] || null;
}

async function deleteById(publicationId, db = pool) {
    const result = await db.query(
        "DELETE FROM publications WHERE id = $1 RETURNING id",
        [publicationId]
    );

    return result.rows.length > 0;
}

module.exports = {
    findApprovedPublications,
    findVisiblePublications,
    findPendingPublications,
    findByAuthorId,
    createPublication,
    findOwnedPublication,
    updateOwnedPublication,
    deleteOwnedPublication,
    updateStatus,
    deleteById
};
