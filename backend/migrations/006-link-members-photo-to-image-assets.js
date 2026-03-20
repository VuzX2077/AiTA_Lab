module.exports = {
    name: "006-link-members-photo-to-image-assets",
    up: async (pool) => {
        await pool.query(`
            ALTER TABLE members
            ADD COLUMN IF NOT EXISTS photo_asset_id INTEGER
        `);

        await pool.query(`
            UPDATE members m
            SET photo_asset_id = ia.id
            FROM image_assets ia
            WHERE m.photo_asset_id IS NULL
              AND COALESCE(m.photo_url, '') <> ''
              AND ia.public_url = m.photo_url
        `);

        await pool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'members_photo_asset_id_fkey'
                ) THEN
                    ALTER TABLE members
                    ADD CONSTRAINT members_photo_asset_id_fkey
                    FOREIGN KEY (photo_asset_id) REFERENCES image_assets(id) ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }
};