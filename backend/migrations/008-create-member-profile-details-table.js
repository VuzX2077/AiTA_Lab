module.exports = {
    name: "008-create-member-profile-details-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS member_profile_details (
                id SERIAL PRIMARY KEY,
                member_id INTEGER NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
                name TEXT NOT NULL DEFAULT '',
                hero_photo_asset_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL,
                quote TEXT NOT NULL DEFAULT '',
                links JSONB NOT NULL DEFAULT '[]'::jsonb,
                research_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
                education JSONB NOT NULL DEFAULT '[]'::jsonb,
                journal_publications JSONB NOT NULL DEFAULT '[]'::jsonb,
                conference_proceedings JSONB NOT NULL DEFAULT '[]'::jsonb,
                projects JSONB NOT NULL DEFAULT '{"principal_investigator":[]}'::jsonb,
                awards_grants JSONB NOT NULL DEFAULT '[]'::jsonb,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await pool.query(`
            ALTER TABLE member_profile_details
                ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS hero_photo_asset_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS quote TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS research_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS education JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS journal_publications JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS conference_proceedings JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS projects JSONB NOT NULL DEFAULT '{"principal_investigator":[]}'::jsonb,
                ADD COLUMN IF NOT EXISTS awards_grants JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_member_profile_details_member_id
            ON member_profile_details(member_id)
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_members_section_lower
            ON members ((LOWER(TRIM(COALESCE(section, '')))))
        `);

        // Seed initial detail rows for member sections.
        await pool.query(`
            INSERT INTO member_profile_details (member_id, name, hero_photo_asset_id, links, research_experience)
            SELECT m.id, m.name, m.photo_asset_id, COALESCE(m.links, '[]'::jsonb), COALESCE(m.career, '[]'::jsonb)
            FROM members m
            WHERE LOWER(TRIM(COALESCE(m.section, ''))) IN ('undergraduate research assistants', 'undergraduate', 'alumni')
            ON CONFLICT (member_id) DO NOTHING
        `);

    }
};
