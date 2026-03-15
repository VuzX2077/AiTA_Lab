module.exports = {
    name: "002-create-members-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT,
                bio TEXT,
                section TEXT DEFAULT 'researchers',
                photo_url TEXT DEFAULT '',
                career JSONB DEFAULT '[]',
                links JSONB DEFAULT '[]',
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
            )
        `);

        await pool.query(`
            ALTER TABLE members
                ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'researchers',
                ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT '',
                ADD COLUMN IF NOT EXISTS career JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]'
        `);
    }
};
