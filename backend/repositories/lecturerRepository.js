const pool = require("../db");

const BASE_SELECT = `
    SELECT l.id,
           l.member_id,
           l.name,
           l.specialization,
           l.teaching_subjects,
           l.bio,
           l.photo_asset_id,
           COALESCE(ia.public_url, '') AS photo_url,
           l.is_published,
           l.display_order,
           l.created_by,
           l.updated_by,
           l.created_at,
           l.updated_at
    FROM lecturers l
    LEFT JOIN image_assets ia ON ia.id = l.photo_asset_id
`;

async function findPublic(db = pool) {
    const result = await db.query(
        `${BASE_SELECT}
         WHERE l.is_published = TRUE
         ORDER BY l.display_order ASC, l.id ASC`
    );

    return result.rows;
}

async function findAll(db = pool) {
    const result = await db.query(
        `${BASE_SELECT}
         ORDER BY l.display_order ASC, l.id ASC`
    );

    return result.rows;
}

async function findById(id, db = pool) {
    const result = await db.query(
        `${BASE_SELECT}
         WHERE l.id = $1
         LIMIT 1`,
        [id]
    );

    return result.rows[0] || null;
}

async function create(payload, db = pool) {
    const result = await db.query(
        `
        INSERT INTO lecturers (
            member_id,
            name,
            specialization,
            teaching_subjects,
            bio,
            photo_asset_id,
            is_published,
            display_order,
            created_by,
            updated_by,
            updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $9, NOW())
        RETURNING id
        `,
        [
            payload.member_id,
            payload.name,
            payload.specialization,
            JSON.stringify(payload.teaching_subjects || []),
            payload.bio,
            payload.photo_asset_id,
            payload.is_published,
            payload.display_order,
            payload.actor_id || null
        ]
    );

    return findById(result.rows[0].id, db);
}

async function updateById(id, payload, db = pool) {
    const result = await db.query(
        `
        UPDATE lecturers
        SET member_id = $1,
            name = $2,
            specialization = $3,
            teaching_subjects = $4::jsonb,
            bio = $5,
            photo_asset_id = $6,
            is_published = $7,
            display_order = $8,
            updated_by = $9,
            updated_at = NOW()
        WHERE id = $10
        RETURNING id
        `,
        [
            payload.member_id,
            payload.name,
            payload.specialization,
            JSON.stringify(payload.teaching_subjects || []),
            payload.bio,
            payload.photo_asset_id,
            payload.is_published,
            payload.display_order,
            payload.actor_id || null,
            id
        ]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findById(id, db);
}

async function deleteById(id, db = pool) {
    const result = await db.query(
        `DELETE FROM lecturers WHERE id = $1 RETURNING id, photo_asset_id`,
        [id]
    );

    return result.rows[0] || null;
}

module.exports = {
    findPublic,
    findAll,
    findById,
    create,
    updateById,
    deleteById
};
