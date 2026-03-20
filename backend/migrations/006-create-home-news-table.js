module.exports = {
    name: "006-create-home-news-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS home_news (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                summary TEXT NOT NULL DEFAULT '',
                image_asset_id INTEGER NOT NULL REFERENCES image_assets(id) ON DELETE RESTRICT,
                link TEXT,
                tag TEXT NOT NULL DEFAULT 'NEWS',
                cta_label TEXT NOT NULL DEFAULT 'KEEP READING',
                published_at DATE NOT NULL DEFAULT CURRENT_DATE,
                is_published BOOLEAN NOT NULL DEFAULT TRUE,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_home_news_public_order
            ON home_news (is_published, published_at DESC, created_at DESC)
        `);
    }
};