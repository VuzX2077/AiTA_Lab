const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const imageAssetRepository = require("../repositories/imageAssetRepository");
const supabase = require("../supabaseClient");

const STORAGE_PROVIDER = "supabase";
const BUCKET = "images";

async function processAndStoreImage(file, uploadedBy) {
    if (!file || !file.buffer) {
        throw new Error("Missing image file");
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const filename = `${uuidv4()}.webp`;

    const storageKey = `images/${year}/${month}/${filename}`;

    const output = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storageKey, output.data, {
            contentType: "image/webp",
            upsert: false
        });

    if (error) {
        console.error("Supabase upload error:", error);
        throw new Error(error.message);
    }

    const { data } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storageKey);

    const publicUrl = data.publicUrl;

    const record = await imageAssetRepository.createImageAsset({
        storageProvider: STORAGE_PROVIDER,
        storageKey,
        publicUrl,
        mimeType: "image/webp",
        sizeBytes: output.info.size,
        width: output.info.width,
        height: output.info.height,
        uploadedBy
    });

    return {
        id: record.id,
        url: record.public_url,
        key: record.storage_key,
        mimeType: record.mime_type,
        size: record.size_bytes,
        width: record.width,
        height: record.height
    };
}

module.exports = {
    processAndStoreImage
};