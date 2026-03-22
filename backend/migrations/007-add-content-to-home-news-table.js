module.exports = {
    name: "007-add-content-to-home-news-table",
    up: async (pool) => {
        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT ''
        `);
    }
};
