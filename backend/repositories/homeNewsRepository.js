const pool = require("../db");

async function findPublished(limit = 6, db = pool) {
    const result = await db.query(
        `
        SELECT n.id, n.title, n.summary, n.image_asset_id, n.link, n.tag, n.cta_label, n.published_at,
               n.is_published, n.created_by, n.created_at, n.updated_at,
               a.public_url AS image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        WHERE n.is_published = TRUE
        ORDER BY n.published_at DESC, n.created_at DESC
        LIMIT $1
        `,
        [limit]
    );

    return result.rows;
}

async function findAll(db = pool) {
    const result = await db.query(
        `
        SELECT n.id, n.title, n.summary, n.image_asset_id, n.link, n.tag, n.cta_label, n.published_at,
               n.is_published, n.created_by, n.created_at, n.updated_at,
               a.public_url AS image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        ORDER BY n.created_at DESC
        `
    );

    return result.rows;
}

async function createNews({ title, summary, imageAssetId, link, tag, ctaLabel, publishedAt, isPublished, createdBy }, db = pool) {
    const result = await db.query(
        `
        INSERT INTO home_news (title, summary, image_asset_id, link, tag, cta_label, published_at, is_published, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, title, summary, image_asset_id, link, tag, cta_label, published_at, is_published, created_by, created_at, updated_at
        `,
        [title, summary, imageAssetId, link || null, tag, ctaLabel, publishedAt, isPublished, createdBy]
    );

    return result.rows[0];
}

async function updateNews({ id, title, summary, imageAssetId, link, tag, ctaLabel, publishedAt, isPublished }, db = pool) {
    const result = await db.query(
        `
        UPDATE home_news
        SET title = $1,
            summary = $2,
            image_asset_id = $3,
            link = $4,
            tag = $5,
            cta_label = $6,
            published_at = $7,
            is_published = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING id, title, summary, image_asset_id, link, tag, cta_label, published_at, is_published, created_by, created_at, updated_at
        `,
        [title, summary, imageAssetId, link || null, tag, ctaLabel, publishedAt, isPublished, id]
    );

    return result.rows[0] || null;
}

async function deleteNews(id, db = pool) {
    const result = await db.query("DELETE FROM home_news WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
}

module.exports = {
    findPublished,
    findAll,
    createNews,
    updateNews,
    deleteNews
};