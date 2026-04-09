async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS social_link_icon_presets (
            id INTEGER PRIMARY KEY DEFAULT 1,
            presets JSONB NOT NULL DEFAULT '[]'::jsonb,
            updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT social_link_icon_presets_singleton CHECK (id = 1)
        )
    `);

    await db.query(`ALTER TABLE social_link_icon_presets ADD COLUMN IF NOT EXISTS presets JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await db.query(`ALTER TABLE social_link_icon_presets ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE social_link_icon_presets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await db.query(`ALTER TABLE social_link_icon_presets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    await db.query(`
        INSERT INTO social_link_icon_presets (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING
    `);
}

module.exports = { up };
