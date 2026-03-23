module.exports = {
    name: "006-create-home-news-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS home_news (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                summary TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL DEFAULT '',
                image_asset_id INTEGER NOT NULL REFERENCES image_assets(id) ON DELETE RESTRICT,
                summary_image_asset_id INTEGER REFERENCES image_assets(id) ON DELETE RESTRICT,
                left_news_id INTEGER REFERENCES home_news(id) ON DELETE SET NULL,
                right_news_id INTEGER REFERENCES home_news(id) ON DELETE SET NULL,
                link TEXT,
                tag TEXT NOT NULL DEFAULT 'NEWS',
                cta_label TEXT NOT NULL DEFAULT 'KEEP READING',
                published_at DATE NOT NULL DEFAULT CURRENT_DATE,
                is_published BOOLEAN NOT NULL DEFAULT TRUE,
                authors JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        // Backward compatibility: if table was created by an older 006 migration,
        // ensure all newer columns are still present.
        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''
        `);

        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS summary_image_asset_id INTEGER REFERENCES image_assets(id) ON DELETE RESTRICT
        `);

        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS authors JSONB NOT NULL DEFAULT '[]'::jsonb
        `);

        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS left_news_id INTEGER REFERENCES home_news(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS right_news_id INTEGER REFERENCES home_news(id) ON DELETE SET NULL
        `);

        await pool.query(`
            UPDATE home_news
            SET summary_image_asset_id = image_asset_id
            WHERE summary_image_asset_id IS NULL
        `);

        await pool.query(`
            UPDATE home_news
            SET authors = '[]'::jsonb
            WHERE authors IS NULL
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_home_news_public_order
            ON home_news (is_published, published_at DESC, created_at DESC)
        `);
    }
};