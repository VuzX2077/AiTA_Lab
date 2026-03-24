const homeNewsService = require("../services/homeNewsService");

function isValidDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
}

function parseNewsId(value) {
    const id = Number(value);
    return Number.isInteger(id) ? id : null;
}

function parsePayload(req, res) {
    const { title, summary, content, imageAssetId, summaryImageAssetId, leftNewsId, rightNewsId, link, tag, ctaLabel, publishedAt, isPublished, authors } = req.body;

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

    const hasSummaryImageAssetId = summaryImageAssetId !== undefined && summaryImageAssetId !== null && summaryImageAssetId !== "";
    let parsedSummaryImageAssetId = null;

    if (hasSummaryImageAssetId) {
        parsedSummaryImageAssetId = Number(summaryImageAssetId);
        if (!Number.isInteger(parsedSummaryImageAssetId)) {
            res.status(400).json({ message: "summaryImageAssetId must be an integer" });
            return null;
        }
    } else if (req.method === "POST") {
        // On create, default summary image to detail image when not explicitly provided.
        parsedSummaryImageAssetId = parsedImageAssetId;
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

    // Parse authors array
    let parsedAuthors = [];
    if (Array.isArray(authors)) {
        parsedAuthors = authors
            .filter(author => author && author.id && author.name)
            .map(author => ({
                id: Number(author.id),
                name: String(author.name).trim(),
                link: author.link ? String(author.link).trim() : null
            }))
            .filter(author => Number.isInteger(author.id));
    }

    const normalizedPublishedAt = isValidDateString(publishedAt)
        ? String(publishedAt).trim()
        : new Date().toISOString().slice(0, 10);

    const parseOptionalNewsId = (value, fieldName) => {
        if (value === undefined || value === null || value === "") {
            return null;
        }

        const parsedValue = Number(value);
        if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
            res.status(400).json({ message: `${fieldName} must be a positive integer` });
            return null;
        }

        return parsedValue;
    };

    const parsedLeftNewsId = parseOptionalNewsId(leftNewsId, "leftNewsId");
    if (leftNewsId !== undefined && leftNewsId !== null && leftNewsId !== "" && parsedLeftNewsId === null) {
        return null;
    }

    const parsedRightNewsId = parseOptionalNewsId(rightNewsId, "rightNewsId");
    if (rightNewsId !== undefined && rightNewsId !== null && rightNewsId !== "" && parsedRightNewsId === null) {
        return null;
    }

    if (parsedLeftNewsId !== null && parsedRightNewsId !== null && parsedLeftNewsId === parsedRightNewsId) {
        res.status(400).json({ message: "leftNewsId and rightNewsId must be different" });
        return null;
    }

    return {
        title: String(title).trim(),
        summary: String(summary).trim(),
        content: typeof content === "string" ? content.trim() : "",
        imageAssetId: parsedImageAssetId,
        summaryImageAssetId: parsedSummaryImageAssetId,
        leftNewsId: parsedLeftNewsId,
        rightNewsId: parsedRightNewsId,
        link: normalizedLink,
        tag: tag && String(tag).trim() ? String(tag).trim().toUpperCase() : "NEWS",
        ctaLabel: ctaLabel && String(ctaLabel).trim() ? String(ctaLabel).trim() : "KEEP READING",
        publishedAt: normalizedPublishedAt,
        isPublished: Boolean(isPublished),
        authors: parsedAuthors
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

async function getPublicHomeNewsBySlug(req, res) {
    const slug = String(req.params.slug || "").trim();
    if (!slug) {
        return res.status(400).json({ message: "Invalid news slug" });
    }

    try {
        const row = await homeNewsService.getPublicHomeNewsBySlug(slug);
        if (!row) {
            return res.status(404).json({ message: "Home news not found" });
        }

        return res.json(row);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load home news" });
    }
}

async function getPublicHomeNewsConnections(req, res) {
    const id = parseNewsId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "Invalid news id" });
    }

    const parsedLimit = Number(req.query.limit);
    const relatedLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 6) : 3;

    try {
        const data = await homeNewsService.getPublicHomeNewsConnections(id, relatedLimit);
        if (!data) {
            return res.status(404).json({ message: "Home news not found" });
        }

        return res.json(data);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to load connected home news" });
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

    if (payload.leftNewsId === id || payload.rightNewsId === id) {
        return res.status(400).json({ message: "leftNewsId/rightNewsId cannot reference the current news" });
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
    getPublicHomeNewsBySlug,
    getPublicHomeNewsConnections,
    getHomeNewsById,
    getHomeNewsForAdmin,
    createHomeNews,
    updateHomeNews,
    deleteHomeNews
};