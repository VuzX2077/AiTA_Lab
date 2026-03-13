const publicationService = require("../services/publicationService");

function parsePublicationPayload(req, res) {
    const { title, link, authors, journal, year, description, doi } = req.body;

    if (!title || !authors || !journal || !year) {
        res.status(400).json({ message: "Title, authors, journal and year are required" });
        return null;
    }

    const parsedYear = Number(year);
    if (!Number.isInteger(parsedYear)) {
        res.status(400).json({ message: "Year must be a valid number" });
        return null;
    }

    let normalizedLink = null;
    if (typeof link === "string" && link.trim()) {
        try {
            const parsedLink = new URL(link.trim());
            if (parsedLink.protocol !== "http:" && parsedLink.protocol !== "https:") {
                res.status(400).json({ message: "Link must start with http:// or https://" });
                return null;
            }
            normalizedLink = parsedLink.toString();
        } catch (error) {
            res.status(400).json({ message: "Link must be a valid URL" });
            return null;
        }
    }

    return {
        title: title.trim(),
        link: normalizedLink,
        authors: authors.trim(),
        journal: journal.trim(),
        doi: doi ? doi.trim() : null,
        year: parsedYear,
        description: description ? description.trim() : ""
    };
}

async function getPublicPublications(req, res) {
    try {
        const rows = await publicationService.getPublicationsPublic();
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load public publications" });
    }
}

async function getPublications(req, res) {
    try {
        const rows = await publicationService.getPublications(req.user.role, req.user.id);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load publications" });
    }
}

async function getMyPublications(req, res) {
    try {
        const rows = await publicationService.getMyPublications(req.user.id);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to load your publications" });
    }
}

async function createPublication(req, res) {
    if (req.user.role !== "user") {
        return res.status(403).json({ message: "Only authenticated members can create publication" });
    }

    const payload = parsePublicationPayload(req, res);
    if (!payload) {
        return;
    }

    try {
        const created = await publicationService.createPublication({
            ...payload,
            authorId: req.user.id
        });
        res.status(201).json(created);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create publication" });
    }
}

async function updatePublication(req, res) {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    if (req.user.role !== "user") {
        return res.status(403).json({ message: "Only authenticated members can edit their own publication" });
    }

    const payload = parsePublicationPayload(req, res);
    if (!payload) {
        return;
    }

    try {
        const updated = await publicationService.updateOwnPublication({
            publicationId,
            userId: req.user.id,
            ...payload
        });

        if (!updated) {
            return res.status(403).json({ message: "You can only edit your own publication" });
        }

        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update publication" });
    }
}

async function deletePublication(req, res) {
    const publicationId = Number(req.params.id);
    if (!Number.isInteger(publicationId)) {
        return res.status(400).json({ message: "Invalid publication id" });
    }

    if (req.user.role !== "user") {
        return res.status(403).json({ message: "Only authenticated members can delete their own publication" });
    }

    try {
        const deleted = await publicationService.deleteOwnPublication(publicationId, req.user.id);
        if (!deleted) {
            return res.status(403).json({ message: "You can only delete your own publication" });
        }

        res.json({ message: "Publication deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete publication" });
    }
}

module.exports = {
    getPublicPublications,
    getPublications,
    getMyPublications,
    createPublication,
    updatePublication,
    deletePublication
};