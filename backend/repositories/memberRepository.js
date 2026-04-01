const pool = require("../db");

const VISIBLE_SECTIONS = ["director", "researchers", "undergraduate", "alumni", "collaborators"];

const MEMBER_COLS = "m.id AS member_id, u.id AS user_id, u.email, u.role, m.name, m.position, m.bio, m.section, m.photo_asset_id, COALESCE(ia.public_url, '') AS photo_url, m.career, m.links";

async function findAll(db = pool) {
    const result = await db.query(
        `
        SELECT u.id AS user_id, u.email, u.role,
             m.id AS member_id, m.name, m.position, m.bio, m.section, m.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
             m.career, m.links
        FROM users u
        LEFT JOIN members m ON m.user_id = u.id
           LEFT JOIN image_assets ia ON ia.id = m.photo_asset_id
        ORDER BY u.id ASC
        `
    );
    return result.rows;
}

async function findPublicMembers({ query = "", section = "" } = {}, db = pool) {
    const normalizedQuery = typeof query === "string" ? query.trim() : "";
    const normalizedSection = typeof section === "string" ? section.trim().toLowerCase() : "";

    const result = await db.query(
        `
        SELECT m.id AS member_id, u.id AS user_id,
             m.name, m.position, m.bio, m.section, m.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
             m.career, m.links
        FROM members m
        LEFT JOIN users u ON u.id = m.user_id
        LEFT JOIN image_assets ia ON ia.id = m.photo_asset_id
                WHERE m.section = ANY($3::text[])
                    AND ($1::text = '' OR m.section = $1)
          AND ($2::text = '' OR m.name ILIKE '%' || $2 || '%' OR m.position ILIKE '%' || $2 || '%')
        ORDER BY m.id ASC
        LIMIT 30
        `,
                [normalizedSection, normalizedQuery, VISIBLE_SECTIONS]
    );
    return result.rows;
}

async function findPublicMemberById(memberId, db = pool) {
        const result = await db.query(
                `
                SELECT m.id AS member_id, u.id AS user_id,
                         m.name, m.position, m.bio, m.section, m.photo_asset_id,
                             COALESCE(ia.public_url, '') AS photo_url,
                         m.career, m.links
                FROM members m
                LEFT JOIN users u ON u.id = m.user_id
                LEFT JOIN image_assets ia ON ia.id = m.photo_asset_id
                WHERE m.id = $1
                    AND m.section = ANY($2::text[])
                LIMIT 1
                `,
                [memberId, VISIBLE_SECTIONS]
        );

        return result.rows[0] || null;
}

async function findByMemberId(memberId, db = pool) {
    const result = await db.query(
        `
        SELECT m.id AS member_id,
               m.user_id,
               m.name,
               m.position,
               m.bio,
               m.section,
               m.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
               m.career,
               m.links
        FROM members m
        LEFT JOIN image_assets ia ON ia.id = m.photo_asset_id
        WHERE m.id = $1
        LIMIT 1
        `,
        [memberId]
    );

    return result.rows[0] || null;
}

async function createStandaloneMemberProfile({ name, position, bio, section, photoAssetId, career, links }, db = pool) {
    const result = await db.query(
        `
        WITH inserted AS (
            INSERT INTO members (name, position, bio, section, photo_asset_id, career, links, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NULL)
            RETURNING id, user_id, name, position, bio, section, photo_asset_id, career, links
        )
        SELECT inserted.id AS member_id,
               inserted.user_id,
               inserted.name,
               inserted.position,
               inserted.bio,
               inserted.section,
               inserted.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
               inserted.career,
               inserted.links
        FROM inserted
        LEFT JOIN image_assets ia ON ia.id = inserted.photo_asset_id
        `,
        [
            name,
            position || "",
            bio || "",
            section || "researchers",
            photoAssetId ?? null,
            JSON.stringify(career || []),
            JSON.stringify(links || [])
        ]
    );

    return result.rows[0] || null;
}

async function updateByMemberId(memberId, { name, position, bio, section, photoAssetId, career, links }, db = pool) {
    const result = await db.query(
        `
        WITH updated AS (
            UPDATE members
            SET name = $1,
                position = $2,
                bio = $3,
                section = $4,
                photo_asset_id = $5,
                career = $6,
                links = $7
            WHERE id = $8
            RETURNING id, user_id, name, position, bio, section, photo_asset_id, career, links
        )
        SELECT updated.id AS member_id,
               updated.user_id,
               updated.name,
               updated.position,
               updated.bio,
               updated.section,
               updated.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
               updated.career,
               updated.links
        FROM updated
        LEFT JOIN image_assets ia ON ia.id = updated.photo_asset_id
        `,
        [
            name,
            position || "",
            bio || "",
            section || "researchers",
            photoAssetId ?? null,
            JSON.stringify(career || []),
            JSON.stringify(links || []),
            memberId
        ]
    );

    return result.rows[0] || null;
}

async function deleteByMemberId(memberId, db = pool) {
    const result = await db.query(
        `
        UPDATE members
        SET section = 'hidden',
            photo_asset_id = NULL
        WHERE id = $1
        RETURNING id
        `,
        [memberId]
    );

    return result.rows.length > 0;
}

async function createMemberProfile({ name, position, bio, section, photoAssetId, career, links, userId }, db = pool) {
    const result = await db.query(
        `
        WITH inserted AS (
            INSERT INTO members (name, position, bio, section, photo_asset_id, career, links, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, position, bio, section, photo_asset_id, career, links, user_id
        )
        SELECT inserted.id AS member_id,
               inserted.name,
               inserted.position,
               inserted.bio,
               inserted.section,
               inserted.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
               inserted.career,
               inserted.links,
               inserted.user_id
        FROM inserted
        LEFT JOIN image_assets ia ON ia.id = inserted.photo_asset_id
        `,
        [
            name, position, bio,
            section || "researchers",
            photoAssetId ?? null,
            JSON.stringify(career || []),
            JSON.stringify(links || []),
            userId
        ]
    );
    return result.rows[0];
}

async function updateMemberProfile(userId, { name, position, bio, section, photoAssetId, career, links }, db = pool) {
    const result = await db.query(
        `
        WITH updated AS (
            UPDATE members
            SET name=$1,
                position=$2,
                bio=$3,
                section=$4,
                photo_asset_id=$5,
                career=$6,
                links=$7
            WHERE user_id=$8
            RETURNING id, name, position, bio, section, photo_asset_id, career, links, user_id
        )
        SELECT updated.id AS member_id,
               updated.name,
               updated.position,
               updated.bio,
               updated.section,
               updated.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
               updated.career,
               updated.links,
               updated.user_id
        FROM updated
        LEFT JOIN image_assets ia ON ia.id = updated.photo_asset_id
        `,
        [
            name, position, bio,
            section || "researchers",
            photoAssetId ?? null,
            JSON.stringify(career || []),
            JSON.stringify(links || []),
            userId
        ]
    );
    return result.rows[0] || null;
}

async function deleteByUserId(userId, db = pool) {
    await db.query("DELETE FROM members WHERE user_id = $1", [userId]);
}

async function findProfileByUserId(userId, db = pool) {
    const result = await db.query(
        `
         SELECT m.id, m.name, m.position, m.bio, m.section, m.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
             m.career, m.links
        FROM members m
           LEFT JOIN image_assets ia ON ia.id = m.photo_asset_id
        WHERE m.user_id = $1
        `,
        [userId]
    );
    return result.rows[0] || null;
}

async function findByUserId(userId, db = pool) {
    const result = await db.query(
        `
        SELECT m.id AS member_id,
               u.id AS user_id,
               u.email,
               u.role,
               m.name,
               m.position,
               m.bio,
               m.section,
               m.photo_asset_id,
               COALESCE(ia.public_url, '') AS photo_url,
               m.career,
               m.links
        FROM users u
        LEFT JOIN members m ON m.user_id = u.id
        LEFT JOIN image_assets ia ON ia.id = m.photo_asset_id
        WHERE u.id = $1
        LIMIT 1
        `,
        [userId]
    );

    return result.rows[0] || null;
}

async function upsertProfileByUserId(userId, { name, bio, photoAssetId, career }, db = pool) {
    const existing = await db.query(
        `
        SELECT id
        FROM members
        WHERE user_id = $1
        ORDER BY id ASC
        LIMIT 1
        `,
        [userId]
    );

    let result;
    if (existing.rows[0]) {
        result = await db.query(
            `
            UPDATE members
            SET name = $1,
                bio = $2,
                photo_asset_id = $3,
                career = $4
            WHERE id = $5
            RETURNING id, name, position, bio, section, photo_asset_id, career, links, user_id
            `,
            [name, bio || "", photoAssetId ?? null, JSON.stringify(career || []), existing.rows[0].id]
        );
    } else {
        result = await db.query(
            `
            INSERT INTO members (user_id, name, position, bio, section, photo_asset_id, career, links)
            VALUES ($1, $2, $3, $4, 'researchers', $5, $6, '[]'::jsonb)
            RETURNING id, name, position, bio, section, photo_asset_id, career, links, user_id
            `,
            [userId, name, "", bio || "", photoAssetId ?? null, JSON.stringify(career || [])]
        );
    }

    const row = result.rows[0] || null;
    if (!row) return null;

    const assetResult = await db.query(
        "SELECT public_url FROM image_assets WHERE id = $1",
        [row.photo_asset_id]
    );

    return {
        ...row,
        photo_url: assetResult.rows[0]?.public_url || ""
    };
}

module.exports = {
    findAll,
    findPublicMembers,
    findPublicMemberById,
    findByMemberId,
    createMemberProfile,
    createStandaloneMemberProfile,
    updateMemberProfile,
    updateByMemberId,
    upsertProfileByUserId,
    deleteByMemberId,
    deleteByUserId,
    findProfileByUserId,
    findByUserId
};

