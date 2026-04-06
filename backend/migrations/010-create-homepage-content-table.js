async function up(db) {
    await db.query(`
        CREATE TABLE IF NOT EXISTS homepage_content (
            id INTEGER PRIMARY KEY DEFAULT 1,
            hero_title TEXT NOT NULL DEFAULT 'AI Technology and Application Research Lab',
            intro_paragraph_1 TEXT NOT NULL DEFAULT '',
            intro_paragraph_2 TEXT NOT NULL DEFAULT '',
            github_url TEXT NOT NULL DEFAULT '',
            facebook_url TEXT NOT NULL DEFAULT '',
            hero_image_url_1 TEXT NOT NULL DEFAULT '',
            hero_image_url_2 TEXT NOT NULL DEFAULT '',
            hero_image_url_3 TEXT NOT NULL DEFAULT '',
            footer_text TEXT NOT NULL DEFAULT 'Copyright © 2025 AI Technology and Application Research Lab @ FPTU - HCMC — All right Reserved.',
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT homepage_content_singleton CHECK (id = 1)
        )
    `);

    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS hero_title TEXT NOT NULL DEFAULT 'AI Technology and Application Research Lab'`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS intro_paragraph_1 TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS intro_paragraph_2 TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS github_url TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS facebook_url TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS hero_image_url_1 TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS hero_image_url_2 TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS hero_image_url_3 TEXT NOT NULL DEFAULT ''`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS footer_text TEXT NOT NULL DEFAULT 'Copyright © 2025 AI Technology and Application Research Lab @ FPTU - HCMC — All right Reserved.'`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await db.query(`ALTER TABLE homepage_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

    await db.query(`
        INSERT INTO homepage_content (id)
        VALUES (1)
        ON CONFLICT (id) DO NOTHING
    `);
}

module.exports = { up };
