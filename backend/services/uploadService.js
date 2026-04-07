const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const imageAssetRepository = require("../repositories/imageAssetRepository");
const homepageContentRepository = require("../repositories/homepageContentRepository");
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

async function deleteImage(storageKey) {
    if (!storageKey) return;

    const { error } = await supabase.storage
        .from(BUCKET)
        .remove([storageKey]);

    if (error) {
        console.error("Supabase delete error:", error);
        throw new Error("Failed to delete image from storage");
    }

    await imageAssetRepository.deleteByStorageKey(storageKey);
}

async function deleteImageAssetIfUnused(imageAssetId, db = require("../db")) {
    const normalizedId = Number(imageAssetId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        return false;
    }

    const asset = await imageAssetRepository.findById(normalizedId, db);
    if (!asset) {
        return false;
    }

    const references = await imageAssetRepository.countReferences(normalizedId, db);
    if (references > 0) {
        return false;
    }

    if (asset.public_url) {
        const usedByHomepage = await homepageContentRepository.isHeroImageUrlUsed(asset.public_url, db);
        if (usedByHomepage) {
            return false;
        }
    }

    if (asset.storage_key) {
        const { error } = await supabase.storage
            .from(BUCKET)
            .remove([asset.storage_key]);

        if (error) {
            console.error("Supabase delete error:", error);
            throw new Error("Failed to delete image from storage");
        }
    }

    try {
        await imageAssetRepository.deleteById(normalizedId, db);
    } catch (error) {
        if (error && error.code === "23503") {
            return false;
        }
        throw error;
    }

    return true;
}

async function deleteImageAssetByPublicUrlIfUnused(publicUrl, db = require("../db")) {
    const normalizedUrl = typeof publicUrl === "string" ? publicUrl.trim() : "";
    if (!normalizedUrl) {
        return false;
    }

    const asset = await imageAssetRepository.findByPublicUrl(normalizedUrl, db);
    if (!asset) {
        return false;
    }

    return deleteImageAssetIfUnused(asset.id, db);
}

async function deleteUploadedImageAsset({ imageAssetId, actorId, actorRole }, db = require("../db")) {
    const normalizedId = Number(imageAssetId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        return { status: "invalid_id" };
    }

    const asset = await imageAssetRepository.findById(normalizedId, db);
    if (!asset) {
        return { status: "not_found" };
    }

    const isAdmin = String(actorRole || "") === "admin";
    const ownerId = Number(asset.uploaded_by);
    const requesterId = Number(actorId);
    const isOwner = Number.isInteger(ownerId) && Number.isInteger(requesterId) && ownerId === requesterId;

    if (!isAdmin && !isOwner) {
        return { status: "forbidden" };
    }

    const deleted = await deleteImageAssetIfUnused(normalizedId, db);
    return deleted ? { status: "deleted" } : { status: "in_use" };
}

async function cleanupOrphanedImages({ olderThanHours = 24, limit = 200 } = {}) {
    const normalizedHours = Number.isFinite(Number(olderThanHours)) ? Number(olderThanHours) : 24;
    const safeHours = Math.max(1, normalizedHours);
    const cutoff = new Date(Date.now() - safeHours * 60 * 60 * 1000);

    const candidates = await imageAssetRepository.findCandidatesCreatedBefore(cutoff.toISOString(), limit);
    const result = {
        olderThanHours: safeHours,
        scanned: candidates.length,
        deleted: 0,
        skippedInUse: 0,
        failed: 0
    };

    for (const candidate of candidates) {
        try {
            const deleted = await deleteImageAssetIfUnused(candidate.id);
            if (deleted) {
                result.deleted += 1;
            } else {
                result.skippedInUse += 1;
            }
        } catch (error) {
            result.failed += 1;
            console.error("Failed to cleanup orphan candidate:", candidate.id, error);
        }
    }

    return result;
}

module.exports = {
    processAndStoreImage,
    deleteImage,
    deleteImageAssetIfUnused,
    deleteImageAssetByPublicUrlIfUnused,
    deleteUploadedImageAsset,
    cleanupOrphanedImages
};