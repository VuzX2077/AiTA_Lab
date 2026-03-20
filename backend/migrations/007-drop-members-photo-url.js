module.exports = {
    name: "007-drop-members-photo-url",
    up: async (pool) => {
        await pool.query(`
            ALTER TABLE members
            DROP COLUMN IF EXISTS photo_url
        `);
    }
};