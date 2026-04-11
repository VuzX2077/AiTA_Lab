const pool = require("../db");

async function findPublicSeminars(db = pool) {
	const result = await db.query(
		`
		SELECT id, seminar_date, start_time, end_time, member_name, title, location, paper_link, created_at, updated_at
		FROM seminars
		ORDER BY seminar_date DESC, start_time DESC, id DESC
		`
	);

	return result.rows;
}

async function findAllSeminars(db = pool) {
	const result = await db.query(
		`
		SELECT id, seminar_date, start_time, end_time, member_name, title, location, paper_link, created_at, updated_at
		FROM seminars
		ORDER BY seminar_date DESC, start_time DESC, id DESC
		`
	);

	return result.rows;
}

async function createSeminar({ seminarDate, startTime, endTime, memberName, title, location, paperLink }, db = pool) {
	const result = await db.query(
		`
		INSERT INTO seminars (seminar_date, start_time, end_time, member_name, title, location, paper_link, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		RETURNING id, seminar_date, start_time, end_time, member_name, title, location, paper_link, created_at, updated_at
		`,
		[seminarDate, startTime, endTime, memberName, title, location, paperLink || null]
	);

	return result.rows[0];
}

async function updateSeminar({ seminarId, seminarDate, startTime, endTime, memberName, title, location, paperLink }, db = pool) {
	const result = await db.query(
		`
		UPDATE seminars
		SET seminar_date = $1,
			start_time = $2,
			end_time = $3,
			member_name = $4,
			title = $5,
			location = $6,
			paper_link = $7,
			updated_at = NOW()
		WHERE id = $8
		RETURNING id, seminar_date, start_time, end_time, member_name, title, location, paper_link, created_at, updated_at
		`,
		[seminarDate, startTime, endTime, memberName, title, location, paperLink || null, seminarId]
	);

	return result.rows[0] || null;
}

async function deleteSeminar(seminarId, db = pool) {
	const result = await db.query(
		"DELETE FROM seminars WHERE id = $1 RETURNING id",
		[seminarId]
	);

	return result.rows.length > 0;
}

module.exports = {
	findPublicSeminars,
	findAllSeminars,
	createSeminar,
	updateSeminar,
	deleteSeminar
};
