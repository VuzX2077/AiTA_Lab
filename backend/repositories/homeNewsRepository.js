const pool = require("../db");

function toNewsSlug(value) {
    const normalized = String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");

    return normalized;
}

function normalizeSlugInput(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    let decoded = raw;
    try {
        decoded = decodeURIComponent(raw);
    } catch (error) {
        decoded = raw;
    }

    return toNewsSlug(decoded);
}

async function findPublished(limit = 6, db = pool) {
    const result = await db.query(
        `
         SELECT n.id, n.title, n.summary, n.content, n.image_asset_id, n.summary_image_asset_id,
             n.left_news_id, n.right_news_id,
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
             n.left_news_id, n.right_news_id,
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

async function findPublishedBySlug(slug, db = pool) {
    const normalizedSlug = normalizeSlugInput(slug);
    if (!normalizedSlug) {
        return null;
    }

    const candidatesResult = await db.query(
        `
        SELECT id, title, published_at, created_at
        FROM home_news
        WHERE is_published = TRUE
        ORDER BY published_at DESC, created_at DESC
        `
    );

    const matched = candidatesResult.rows.find((row) => toNewsSlug(row.title) === normalizedSlug);
    if (!matched) {
        return null;
    }

    return findPublishedById(matched.id, db);
}

async function findPublishedConnections(id, relatedLimit = 3, db = pool) {
    const currentResult = await db.query(
        `
        SELECT id, published_at, created_at, tag, left_news_id, right_news_id
        FROM home_news
        WHERE id = $1 AND is_published = TRUE
        LIMIT 1
        `,
        [id]
    );

    const current = currentResult.rows[0] || null;
    if (!current) {
        return null;
    }

    const selectConnectionFields = `
        SELECT n.id, n.title, n.summary, n.published_at, n.tag,
               a.public_url AS image_url,
               sa.public_url AS summary_image_url,
               COALESCE(sa.public_url, a.public_url) AS card_image_url
        FROM home_news n
        INNER JOIN image_assets a ON a.id = n.image_asset_id
        LEFT JOIN image_assets sa ON sa.id = n.summary_image_asset_id
    `;

    const newerResult = await db.query(
        `
        ${selectConnectionFields}
        WHERE n.is_published = TRUE
          AND n.id <> $1
          AND (
              n.published_at > $2::date
              OR (n.published_at = $2::date AND n.created_at > $3::timestamptz)
          )
        ORDER BY n.published_at ASC, n.created_at ASC
        LIMIT 1
        `,
        [id, current.published_at, current.created_at]
    );

    const olderResult = await db.query(
        `
        ${selectConnectionFields}
        WHERE n.is_published = TRUE
          AND n.id <> $1
          AND (
              n.published_at < $2::date
              OR (n.published_at = $2::date AND n.created_at < $3::timestamptz)
          )
        ORDER BY n.published_at DESC, n.created_at DESC
        LIMIT 1
        `,
        [id, current.published_at, current.created_at]
    );

    const manualLeftResult = Number.isInteger(Number(current.left_news_id))
        ? await db.query(
            `
            ${selectConnectionFields}
            WHERE n.id = $1 AND n.is_published = TRUE
            LIMIT 1
            `,
            [Number(current.left_news_id)]
        )
        : { rows: [] };

    const manualRightResult = Number.isInteger(Number(current.right_news_id))
        ? await db.query(
            `
            ${selectConnectionFields}
            WHERE n.id = $1 AND n.is_published = TRUE
            LIMIT 1
            `,
            [Number(current.right_news_id)]
        )
        : { rows: [] };

    const left = manualLeftResult.rows[0] || null;
    const right = manualRightResult.rows[0] || null;

    const excludedIds = [id];
    if (left && Number.isInteger(Number(left.id))) {
        excludedIds.push(Number(left.id));
    }
    if (right && Number.isInteger(Number(right.id))) {
        excludedIds.push(Number(right.id));
    }

    const relatedResult = await db.query(
        `
        ${selectConnectionFields}
        WHERE n.is_published = TRUE
                    AND NOT (n.id = ANY($4::int[]))
        ORDER BY
                        CASE WHEN COALESCE(n.tag, '') = COALESCE($2::text, '') THEN 0 ELSE 1 END,
                        ABS(n.published_at - $1::date),
            n.published_at DESC,
            n.created_at DESC
                LIMIT $3
        `,
                [current.published_at, current.tag, relatedLimit, excludedIds]
    );

    return {
        currentId: current.id,
        left,
        right,
        newer: newerResult.rows[0] || null,
        older: olderResult.rows[0] || null,
        related: relatedResult.rows
    };
}

async function findById(id, db = pool) {
    const result = await db.query(
        `
         SELECT n.id, n.title, n.summary, n.content, n.image_asset_id, n.summary_image_asset_id,
             n.left_news_id, n.right_news_id,
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
             n.left_news_id, n.right_news_id,
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

async function createNews({ title, summary, content, imageAssetId, summaryImageAssetId, leftNewsId, rightNewsId, link, tag, ctaLabel, publishedAt, isPublished, authors, createdBy }, db = pool) {
    const result = await db.query(
        `
        INSERT INTO home_news (title, summary, content, image_asset_id, summary_image_asset_id, left_news_id, right_news_id, link, tag, cta_label, published_at, is_published, authors, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id, title, summary, content, image_asset_id, summary_image_asset_id, left_news_id, right_news_id, link, tag, cta_label, published_at, is_published, authors, created_by, created_at, updated_at
        `,
        [title, summary, content || "", imageAssetId, summaryImageAssetId || imageAssetId, leftNewsId ?? null, rightNewsId ?? null, link || null, tag, ctaLabel, publishedAt, isPublished, JSON.stringify(authors || []), createdBy]
    );

    return result.rows[0];
}

async function updateNews({ id, title, summary, content, imageAssetId, summaryImageAssetId, leftNewsId, rightNewsId, link, tag, ctaLabel, publishedAt, isPublished, authors }, db = pool) {
    const result = await db.query(
        `
        UPDATE home_news
        SET title = $1,
            summary = $2,
            content = $3,
            image_asset_id = $4,
            summary_image_asset_id = COALESCE($5, summary_image_asset_id),
            left_news_id = $6,
            right_news_id = $7,
            link = $8,
            tag = $9,
            cta_label = $10,
            published_at = $11,
            is_published = $12,
            authors = $13,
            updated_at = NOW()
        WHERE id = $14
        RETURNING id, title, summary, content, image_asset_id, summary_image_asset_id, left_news_id, right_news_id, link, tag, cta_label, published_at, is_published, authors, created_by, created_at, updated_at
        `,
        [title, summary, content || "", imageAssetId, summaryImageAssetId ?? null, leftNewsId ?? null, rightNewsId ?? null, link || null, tag, ctaLabel, publishedAt, isPublished, JSON.stringify(authors || []), id]
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
    findPublishedBySlug,
    findPublishedConnections,
    findById,
    findAll,
    createNews,
    updateNews,
    deleteNews
};