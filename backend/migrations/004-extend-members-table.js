module.exports = {
    name: "004-extend-members-table",
    up: async (pool) => {
        await pool.query(`
            ALTER TABLE members
                ADD COLUMN IF NOT EXISTS section    TEXT    DEFAULT 'researchers',
                ADD COLUMN IF NOT EXISTS photo_url  TEXT    DEFAULT '',
                ADD COLUMN IF NOT EXISTS career     JSONB   DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS links      JSONB   DEFAULT '[]'
        `);
    }
};
