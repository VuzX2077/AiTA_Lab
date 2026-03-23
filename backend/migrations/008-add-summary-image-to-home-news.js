module.exports = {
    name: "008-add-summary-image-to-home-news",
    up: async (pool) => {
        // Add summary_image_asset_id column
        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS summary_image_asset_id INTEGER REFERENCES image_assets(id) ON DELETE RESTRICT
        `);

        // Add content column if not exists
        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS content TEXT DEFAULT ''
        `);

        // Set default values: if news doesn't have summary_image_asset_id, use image_asset_id
        await pool.query(`
            UPDATE home_news
            SET summary_image_asset_id = image_asset_id
            WHERE summary_image_asset_id IS NULL
        `);
    }
};
