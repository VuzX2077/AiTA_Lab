const pool = require("../db");

const SELECT_PUBLIC = `
    SELECT hero_title,
           intro_paragraph_1,
           intro_paragraph_2,
           github_url,
           facebook_url,
        hero_image_url_1,
        hero_image_url_2,
        hero_image_url_3,
           footer_text,
           updated_at
    FROM homepage_content
    WHERE id = 1
    LIMIT 1
`;

const SELECT_ADMIN = `
    SELECT id,
           hero_title,
           intro_paragraph_1,
           intro_paragraph_2,
           github_url,
           facebook_url,
           hero_image_url_1,
           hero_image_url_2,
           hero_image_url_3,
           footer_text,
           created_by,
           updated_by,
           created_at,
           updated_at
    FROM homepage_content
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

async function upsert(payload, actorId, db = pool) {
    const result = await db.query(
        `
        INSERT INTO homepage_content (
            id,
            hero_title,
            intro_paragraph_1,
            intro_paragraph_2,
            github_url,
            facebook_url,
            hero_image_url_1,
            hero_image_url_2,
            hero_image_url_3,
            footer_text,
            created_by,
            updated_by,
            updated_at
        )
        VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, NOW())
        ON CONFLICT (id)
        DO UPDATE SET hero_title = EXCLUDED.hero_title,
                      intro_paragraph_1 = EXCLUDED.intro_paragraph_1,
                      intro_paragraph_2 = EXCLUDED.intro_paragraph_2,
                      github_url = EXCLUDED.github_url,
                      facebook_url = EXCLUDED.facebook_url,
                      hero_image_url_1 = EXCLUDED.hero_image_url_1,
                      hero_image_url_2 = EXCLUDED.hero_image_url_2,
                      hero_image_url_3 = EXCLUDED.hero_image_url_3,
                      footer_text = EXCLUDED.footer_text,
                      updated_by = EXCLUDED.updated_by,
                      updated_at = NOW()
        RETURNING id
        `,
        [
            payload.hero_title,
            payload.intro_paragraph_1,
            payload.intro_paragraph_2,
            payload.github_url,
            payload.facebook_url,
            payload.hero_image_url_1,
            payload.hero_image_url_2,
            payload.hero_image_url_3,
            payload.footer_text,
            actorId || null
        ]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findForAdmin(db);
}

module.exports = {
    findPublic,
    findForAdmin,
    upsert
};
