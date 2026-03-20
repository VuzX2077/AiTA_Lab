module.exports = {
    name: "005-create-image-assets-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS image_assets (
                id SERIAL PRIMARY KEY,
                storage_provider TEXT NOT NULL DEFAULT 'local',
                storage_key TEXT NOT NULL UNIQUE,
                public_url TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                width INTEGER,
                height INTEGER,
                uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);
    }
};