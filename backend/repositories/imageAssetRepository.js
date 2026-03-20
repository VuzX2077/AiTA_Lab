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

module.exports = {
    createImageAsset
};