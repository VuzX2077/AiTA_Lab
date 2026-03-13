module.exports = {
    name: "002-create-members-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS members (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                position TEXT,
                bio TEXT,
                user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE
            )
        `);
    }
};
