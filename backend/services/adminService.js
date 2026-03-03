const pool = require("../db.js");
const { ensurePublicationSchema } = require("./publicationService");
const memberService = require("./memberService");

async function getPendingPublications() {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        SELECT p.id, p.title, p.authors, p.journal, p.doi, p.year, p.description, p.status, p.author_id, p.created_at, u.email AS owner_email
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
        RETURNING id, title, authors, journal, doi, year, description, status, author_id, created_at
        `,
        [publicationId]
    );

    return result.rows[0] || null;
}

async function rejectPublication(publicationId) {
    await ensurePublicationSchema();
    const result = await pool.query(
        `
        UPDATE publications
        SET status = 'rejected'
        WHERE id = $1
        RETURNING id, title, authors, journal, doi, year, description, status, author_id, created_at
        `,
        [publicationId]
    );

    return result.rows[0] || null;
}

async function deletePublication(publicationId) {
    await ensurePublicationSchema();
    const result = await pool.query(
        "DELETE FROM publications WHERE id = $1 RETURNING id",
        [publicationId]
    );

    return result.rows.length > 0;
}

async function getMembers() {
    return memberService.getMembers();
}

async function createMember(payload) {
    return memberService.createMemberWithUser(payload);
}

async function deleteMember(userId) {
    return memberService.deleteMemberByUserId(userId);
}

async function updateMemberRole(userId, role) {
    const result = await pool.query(
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

module.exports = {
    getPendingPublications,
    approvePublication,
    rejectPublication,
    deletePublication,
    getMembers,
    createMember,
    deleteMember,
    updateMemberRole
};