const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const imageAssetRepository = require("../repositories/imageAssetRepository");

const LOCAL_STORAGE_PROVIDER = "local";
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

async function processAndStoreImage(file, uploadedBy) {
    if (!file || !file.buffer) {
        throw new Error("Missing image file");
    }

    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const filename = `${uuidv4()}.webp`;
    const relativeKey = `images/${year}/${month}/${filename}`;
    const absolutePath = path.join(UPLOAD_ROOT, relativeKey);

    const output = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true });

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, output.data);

    const normalizedKey = relativeKey.replace(/\\/g, "/");
    const publicUrl = `/uploads/${normalizedKey}`;

    const record = await imageAssetRepository.createImageAsset({
        storageProvider: LOCAL_STORAGE_PROVIDER,
        storageKey: normalizedKey,
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