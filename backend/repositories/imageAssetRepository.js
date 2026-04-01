const pool = require("../db");

async function createImageAsset({
    storageProvider,
    storageKey,
    publicUrl,
    mimeType,
    sizeBytes,
    width,
    height,
    uploadedBy
}, db = pool) {
    const result = await db.query(
        `
        INSERT INTO image_assets (
            storage_provider,
            storage_key,
            public_url,
            mime_type,
            size_bytes,
            width,
            height,
            uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, storage_provider, storage_key, public_url, mime_type, size_bytes, width, height, uploaded_by, created_at
        `,
        [storageProvider, storageKey, publicUrl, mimeType, sizeBytes, width || null, height || null, uploadedBy || null]
    );

    return result.rows[0];
}

async function findById(id, db = pool) {
    const result = await db.query(
        `
        SELECT id, storage_provider, storage_key, public_url, mime_type, size_bytes, width, height, uploaded_by, created_at
        FROM image_assets
        WHERE id = $1
        LIMIT 1
        `,
        [id]
    );

    return result.rows[0] || null;
}

async function countReferences(imageAssetId, db = pool) {
    const result = await db.query(
        `
        SELECT (
            (SELECT COUNT(*) FROM members WHERE photo_asset_id = $1) +
            (SELECT COUNT(*) FROM member_profile_details WHERE hero_photo_asset_id = $1) +
            (SELECT COUNT(*) FROM admin_profile_details WHERE hero_photo_asset_id = $1) +
            (SELECT COUNT(*) FROM home_news WHERE image_asset_id = $1) +
            (SELECT COUNT(*) FROM home_news WHERE summary_image_asset_id = $1)
        )::int AS total
        `,
        [imageAssetId]
    );

    return Number(result.rows[0] && result.rows[0].total) || 0;
}

async function deleteById(id, db = pool) {
    return db.query("DELETE FROM image_assets WHERE id = $1", [id]);
}

async function deleteByStorageKey(storageKey, db = pool) {
    return db.query(
        "DELETE FROM image_assets WHERE storage_key = $1",
        [storageKey]
    );
}

module.exports = {
    createImageAsset,
    findById,
    countReferences,
    deleteById,
    deleteByStorageKey
};