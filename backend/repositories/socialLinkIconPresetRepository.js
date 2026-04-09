const pool = require("../db");

const SELECT_PUBLIC = `
    SELECT presets,
           updated_at
    FROM social_link_icon_presets
    WHERE id = 1
    LIMIT 1
`;

const SELECT_ADMIN = `
    SELECT id,
           presets,
           updated_by,
           created_at,
           updated_at
    FROM social_link_icon_presets
    WHERE id = 1
    LIMIT 1
`;

async function findPublic(db = pool) {
    const result = await db.query(SELECT_PUBLIC);
    return result.rows[0] || null;
}

async function findForAdmin(db = pool) {
    const result = await db.query(SELECT_ADMIN);
    return result.rows[0] || null;
}

async function upsertPresets(presets, actorId, db = pool) {
    const result = await db.query(
        `
        INSERT INTO social_link_icon_presets (
            id,
            presets,
            updated_by,
            updated_at
        )
        VALUES (1, $1::jsonb, $2, NOW())
        ON CONFLICT (id)
        DO UPDATE SET presets = EXCLUDED.presets,
                      updated_by = EXCLUDED.updated_by,
                      updated_at = NOW()
        RETURNING id
        `,
        [JSON.stringify(Array.isArray(presets) ? presets : []), actorId || null]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findForAdmin(db);
}

module.exports = {
    findPublic,
    findForAdmin,
    upsertPresets
};
