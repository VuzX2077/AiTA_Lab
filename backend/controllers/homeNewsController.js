const homeNewsService = require("../services/homeNewsService");

function isValidDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function parseNewsId(value) {
    const id = Number(value);
    return Number.isInteger(id) ? id : null;
}

function parsePayload(req, res) {
    const { title, summary, content, imageAssetId, link, tag, ctaLabel, publishedAt, isPublished } = req.body;

    if (!title || !String(title).trim()) {
        res.status(400).json({ message: "Title is required" });
        return null;
    }

    if (!summary || !String(summary).trim()) {
        res.status(400).json({ message: "Summary is required" });
        return null;
    }

    const parsedImageAssetId = Number(imageAssetId);
    if (!Number.isInteger(parsedImageAssetId)) {
        res.status(400).json({ message: "imageAssetId must be an integer" });
        return null;
    }

    let normalizedLink = null;
    if (typeof link === "string" && link.trim()) {
        try {
            const parsed = new URL(link.trim());
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                res.status(400).json({ message: "Link must start with http:// or https://" });
                return null;
            }
            normalizedLink = parsed.toString();
        } catch (error) {
            res.status(400).json({ message: "Link must be a valid URL" });
            return null;
        }
    }

    const normalizedPublishedAt = isValidDateString(publishedAt)
        ? String(publishedAt).trim()
        : new Date().toISOString().slice(0, 10);

    return {
        title: String(title).trim(),
        summary: String(summary).trim(),
        content: typeof content === "string" ? content.trim() : "",
        imageAssetId: parsedImageAssetId,
        link: normalizedLink,
        tag: tag && String(tag).trim() ? String(tag).trim().toUpperCase() : "NEWS",
        ctaLabel: ctaLabel && String(ctaLabel).trim() ? String(ctaLabel).trim() : "KEEP READING",
        publishedAt: normalizedPublishedAt,
        isPublished: Boolean(isPublished)
    };
}

async function getPublicHomeNewsById(req, res) {
    const id = parseNewsId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "Invalid news id" });
    }

    try {
        const row = await homeNewsService.getPublicHomeNewsById(id);
        if (!row) {
            return res.status(404).json({ message: "Home news not found" });
        }

        return res.json(row);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load home news" });
    }
}

async function getHomeNewsById(req, res) {
    const id = parseNewsId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "Invalid news id" });
    }

    try {
        const row = await homeNewsService.getHomeNewsById(id);
        if (!row) {
            return res.status(404).json({ message: "Home news not found" });
        }

        return res.json(row);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load home news" });
    }
}

async function getPublicHomeNews(req, res) {
    const parsedLimit = Number(req.query.limit);
    const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 12) : 6;

    try {
        const rows = await homeNewsService.getPublicHomeNews(limit);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load home news" });
    }
}

async function getHomeNewsForAdmin(req, res) {
    try {
        const rows = await homeNewsService.getHomeNewsForAdmin();
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to load home news for admin" });
    }
}

async function createHomeNews(req, res) {
    const payload = parsePayload(req, res);
    if (!payload) {
        return;
    }

    try {
        const created = await homeNewsService.createHomeNews({
            ...payload,
            createdBy: req.user.id
        });

        res.status(201).json(created);
    } catch (error) {
        if (error && error.code === "23503") {
            return res.status(400).json({ message: "Invalid imageAssetId" });
        }
        console.error(error);
        res.status(500).json({ message: "Failed to create home news" });
    }
}

async function updateHomeNews(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid news id" });
    }

    const payload = parsePayload(req, res);
    if (!payload) {
        return;
    }

    try {
        const updated = await homeNewsService.updateHomeNews({
            id,
            ...payload
        });

        if (!updated) {
            return res.status(404).json({ message: "Home news not found" });
        }

        return res.json(updated);
    } catch (error) {
        if (error && error.code === "23503") {
            return res.status(400).json({ message: "Invalid imageAssetId" });
        }
        console.error(error);
        return res.status(500).json({ message: "Failed to update home news" });
    }
}

async function deleteHomeNews(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Invalid news id" });
    }

    try {
        const deleted = await homeNewsService.deleteHomeNews(id);
        if (!deleted) {
            return res.status(404).json({ message: "Home news not found" });
        }
        return res.json({ message: "Home news deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete home news" });
    }
}

module.exports = {
    getPublicHomeNews,
    getPublicHomeNewsById,
    getHomeNewsById,
    getHomeNewsForAdmin,
    createHomeNews,
    updateHomeNews,
    deleteHomeNews
};