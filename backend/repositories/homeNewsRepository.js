const pool = require("../db");

async function findPublished(limit = 6, db = pool) {
    const result = await db.query(
        `
        SELECT n.id, n.title, n.summary, n.content, n.image_asset_id, n.summary_image_asset_id, 
               n.link, n.tag, n.cta_label, n.published_at, n.authors,
               n.is_published, n.created_by, n.created_at, n.updated_at,
               a.public_url AS image_url,
               sa.public_url AS summary_image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        LEFT JOIN image_assets sa ON sa.id = n.summary_image_asset_id
        WHERE n.is_published = TRUE
        ORDER BY n.published_at DESC, n.created_at DESC
        LIMIT $1
        `,
        [limit]
    );

    return result.rows;
}

async function findPublishedById(id, db = pool) {
    const result = await db.query(
        `
        SELECT n.id, n.title, n.summary, n.content, n.image_asset_id, n.summary_image_asset_id,
               n.link, n.tag, n.cta_label, n.published_at, n.authors,
               n.is_published, n.created_by, n.created_at, n.updated_at,
               a.public_url AS image_url,
               sa.public_url AS summary_image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        LEFT JOIN image_assets sa ON sa.id = n.summary_image_asset_id
        WHERE n.id = $1 AND n.is_published = TRUE
        LIMIT 1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findById(id, db = pool) {
    const result = await db.query(
        `
        SELECT n.id, n.title, n.summary, n.content, n.image_asset_id, n.summary_image_asset_id,
               n.link, n.tag, n.cta_label, n.published_at, n.authors,
               n.is_published, n.created_by, n.created_at, n.updated_at,
               a.public_url AS image_url,
               sa.public_url AS summary_image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        LEFT JOIN image_assets sa ON sa.id = n.summary_image_asset_id
        WHERE n.id = $1
        LIMIT 1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function findAll(db = pool) {
    const result = await db.query(
        `
        SELECT n.id, n.title, n.summary, n.content, n.image_asset_id, n.summary_image_asset_id,
               n.link, n.tag, n.cta_label, n.published_at, n.authors,
               n.is_published, n.created_by, n.created_at, n.updated_at,
               a.public_url AS image_url,
               sa.public_url AS summary_image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        LEFT JOIN image_assets sa ON sa.id = n.summary_image_asset_id
        ORDER BY n.created_at DESC
        `
    );

    return result.rows;
}

async function createNews({ title, summary, content, imageAssetId, summaryImageAssetId, link, tag, ctaLabel, publishedAt, isPublished, authors, createdBy }, db = pool) {
    const result = await db.query(
        `
        INSERT INTO home_news (title, summary, content, image_asset_id, summary_image_asset_id, link, tag, cta_label, published_at, is_published, authors, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, title, summary, content, image_asset_id, summary_image_asset_id, link, tag, cta_label, published_at, is_published, authors, created_by, created_at, updated_at
        `,
        [title, summary, content || "", imageAssetId, summaryImageAssetId || imageAssetId, link || null, tag, ctaLabel, publishedAt, isPublished, JSON.stringify(authors || []), createdBy]
    );

    return result.rows[0];
}

async function updateNews({ id, title, summary, content, imageAssetId, summaryImageAssetId, link, tag, ctaLabel, publishedAt, isPublished, authors }, db = pool) {
    const result = await db.query(
        `
        UPDATE home_news
        SET title = $1,
            summary = $2,
            content = $3,
            image_asset_id = $4,
            summary_image_asset_id = COALESCE($5, summary_image_asset_id),
            link = $6,
            tag = $7,
            cta_label = $8,
            published_at = $9,
            is_published = $10,
            authors = $11,
            updated_at = NOW()
        WHERE id = $12
        RETURNING id, title, summary, content, image_asset_id, summary_image_asset_id, link, tag, cta_label, published_at, is_published, authors, created_by, created_at, updated_at
        `,
        [title, summary, content || "", imageAssetId, summaryImageAssetId ?? null, link || null, tag, ctaLabel, publishedAt, isPublished, JSON.stringify(authors || []), id]
    );

    return result.rows[0] || null;
}

async function deleteNews(id, db = pool) {
    const result = await db.query("DELETE FROM home_news WHERE id = $1 RETURNING id", [id]);
    return result.rows.length > 0;
}

module.exports = {
    findPublished,
    findPublishedById,
    findById,
    findAll,
    createNews,
    updateNews,
    deleteNews
};