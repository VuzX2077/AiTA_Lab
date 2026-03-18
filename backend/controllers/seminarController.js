const seminarService = require("../services/seminarService");

function parseSeminarPayload(req, res) {
	const { seminarDate, startTime, endTime, memberName, title, paperLink } = req.body;
	const normalizedDate = typeof seminarDate === "string" ? seminarDate.trim() : "";
	const normalizedStartTime = String(startTime || "").trim();
	const normalizedEndTime = String(endTime || "").trim();
	const normalizedMemberName = String(memberName || "").trim();
	const normalizedTitle = String(title || "").trim();
	const normalizedPaperLink = typeof paperLink === "string" ? paperLink.trim() : "";

	if (!normalizedDate || !normalizedStartTime || !normalizedEndTime || !normalizedMemberName || !normalizedTitle) {
		res.status(400).json({ message: "seminarDate, startTime, endTime, memberName and title are required" });
		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
		res.status(400).json({ message: "seminarDate must be in YYYY-MM-DD format" });
		return null;
	}

	const parsedDate = new Date(`${normalizedDate}T00:00:00.000Z`);
	if (Number.isNaN(parsedDate.getTime())) {
		res.status(400).json({ message: "seminarDate must be a valid date in YYYY-MM-DD format" });
		return null;
	}

	let validatedPaperLink = null;
	if (normalizedPaperLink) {
		try {
			const parsedUrl = new URL(normalizedPaperLink);
			if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
				res.status(400).json({ message: "paperLink must start with http:// or https://" });
				return null;
			}
			validatedPaperLink = parsedUrl.toString();
		} catch (error) {
			res.status(400).json({ message: "paperLink must be a valid URL" });
			return null;
		}
	}

	return {
		seminarDate: normalizedDate,
		startTime: normalizedStartTime,
		endTime: normalizedEndTime,
		memberName: normalizedMemberName,
		title: normalizedTitle,
		paperLink: validatedPaperLink
	};
}

async function getPublicSeminars(req, res) {
	try {
		const rows = await seminarService.getPublicSeminars();
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to load seminars" });
	}
}

async function getAllSeminars(req, res) {
	try {
		const rows = await seminarService.getAllSeminars();
		res.json(rows);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to load seminars" });
	}
}

async function createSeminar(req, res) {
	const payload = parseSeminarPayload(req, res);
	if (!payload) {
		return;
	}

	try {
		const created = await seminarService.createSeminar(payload);
		res.status(201).json(created);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to create seminar" });
	}
}

async function updateSeminar(req, res) {
	const seminarId = Number(req.params.id);
	if (!Number.isInteger(seminarId)) {
		return res.status(400).json({ message: "Invalid seminar id" });
	}

	const payload = parseSeminarPayload(req, res);
	if (!payload) {
		return;
	}

	try {
		const updated = await seminarService.updateSeminar({ seminarId, ...payload });

		if (!updated) {
			return res.status(404).json({ message: "Seminar not found" });
		}

		res.json(updated);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to update seminar" });
	}
}

async function deleteSeminar(req, res) {
	const seminarId = Number(req.params.id);
	if (!Number.isInteger(seminarId)) {
		return res.status(400).json({ message: "Invalid seminar id" });
	}

	try {
		const deleted = await seminarService.deleteSeminar(seminarId);
		if (!deleted) {
			return res.status(404).json({ message: "Seminar not found" });
		}

		res.json({ message: "Seminar deleted" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to delete seminar" });
	}
}

module.exports = {
	getPublicSeminars,
	getAllSeminars,
	createSeminar,
	updateSeminar,
	deleteSeminar
};
