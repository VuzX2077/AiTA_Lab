module.exports = {
	name: "004-create-seminars-table",
	up: async (pool) => {
		await pool.query(`
			CREATE TABLE IF NOT EXISTS seminars (
				id SERIAL PRIMARY KEY,
				seminar_date DATE NOT NULL,
				start_time TEXT NOT NULL DEFAULT '',
				end_time TEXT NOT NULL DEFAULT '',
				member_name TEXT NOT NULL DEFAULT '',
				title TEXT NOT NULL DEFAULT '',
				paper_link TEXT,
				created_at TIMESTAMP NOT NULL DEFAULT NOW(),
				updated_at TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`);

		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS seminar_date DATE
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS start_time TEXT NOT NULL DEFAULT ''
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT ''
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS member_name TEXT NOT NULL DEFAULT ''
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT ''
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS paper_link TEXT
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()
		`);
		await pool.query(`
			ALTER TABLE seminars
			ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
		`);

		await pool.query(`
			UPDATE seminars
			SET seminar_date = CURRENT_DATE
			WHERE seminar_date IS NULL
		`);

		await pool.query(`
			ALTER TABLE seminars
			ALTER COLUMN seminar_date SET NOT NULL
		`);
	}
};
