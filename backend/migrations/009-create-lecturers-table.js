async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS lecturers (
            id SERIAL PRIMARY KEY,
                member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
            name TEXT NOT NULL,
            specialization TEXT NOT NULL DEFAULT '',
            teaching_subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
            bio TEXT NOT NULL DEFAULT '',
            photo_asset_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL,
            is_published BOOLEAN NOT NULL DEFAULT TRUE,
            display_order INTEGER NOT NULL DEFAULT 0,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);

    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS specialization TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS teaching_subjects JSONB NOT NULL DEFAULT '[]'::jsonb`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS photo_asset_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await db.query(`ALTER TABLE lecturers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    await db.query(`
        CREATE INDEX IF NOT EXISTS idx_lecturers_published_order
        ON lecturers(is_published, display_order, id)
    `);

        await db.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_lecturers_member_id_unique
            ON lecturers(member_id)
            WHERE member_id IS NOT NULL
        `);
}

module.exports = { up };
