module.exports = {
    name: "009-add-authors-to-home-news",
    up: async (pool) => {
        // Add authors column as JSONB for storing author objects
        await pool.query(`
            ALTER TABLE home_news
            ADD COLUMN IF NOT EXISTS authors JSONB DEFAULT '[]'::jsonb
        `);
    }
};
