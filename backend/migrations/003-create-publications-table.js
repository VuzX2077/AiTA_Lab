module.exports = {
    name: "003-create-publications-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS publications (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                link TEXT,
                authors TEXT NOT NULL DEFAULT '',
                journal TEXT NOT NULL DEFAULT '',
                doi TEXT,
                author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                year INTEGER,
                description TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS link TEXT
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS authors TEXT NOT NULL DEFAULT ''
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS journal TEXT NOT NULL DEFAULT ''
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS doi TEXT
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users(id) ON DELETE SET NULL
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS year INTEGER
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
        `);
        await pool.query(`
            ALTER TABLE publications
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);
    }
};
