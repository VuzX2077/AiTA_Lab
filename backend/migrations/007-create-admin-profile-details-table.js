module.exports = {
    name: "007-create-admin-profile-details-table",
    up: async (pool) => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_profile_details (
                id SERIAL PRIMARY KEY,
                member_id INTEGER NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
                name TEXT NOT NULL DEFAULT '',
                hero_photo_asset_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL,
                quote TEXT NOT NULL DEFAULT '',
                links JSONB NOT NULL DEFAULT '[]'::jsonb,
                education JSONB NOT NULL DEFAULT '[]'::jsonb,
                working_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
                awards_grants JSONB NOT NULL DEFAULT '[]'::jsonb,
                journal_publications JSONB NOT NULL DEFAULT '[]'::jsonb,
                conference_proceedings JSONB NOT NULL DEFAULT '[]'::jsonb,
                book_chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
                patents JSONB NOT NULL DEFAULT '[]'::jsonb,
                academic_activities JSONB NOT NULL DEFAULT '{"advisor":[],"conference_committee":[],"peer_review":[]}'::jsonb,
                projects JSONB NOT NULL DEFAULT '{"principal_investigator":[]}'::jsonb,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        `);

        await pool.query(`
            ALTER TABLE admin_profile_details
                ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS hero_photo_asset_id INTEGER REFERENCES image_assets(id) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS quote TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS education JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS working_experience JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS awards_grants JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS journal_publications JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS conference_proceedings JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS book_chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS patents JSONB NOT NULL DEFAULT '[]'::jsonb,
                ADD COLUMN IF NOT EXISTS academic_activities JSONB NOT NULL DEFAULT '{"advisor":[],"conference_committee":[],"peer_review":[]}'::jsonb,
                ADD COLUMN IF NOT EXISTS projects JSONB NOT NULL DEFAULT '{"principal_investigator":[]}'::jsonb,
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        `);

        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_admin_profile_details_member_id
            ON admin_profile_details(member_id)
        `);

        // Seed initial detail rows for admin sections.
        await pool.query(`
            INSERT INTO admin_profile_details (member_id, name, hero_photo_asset_id, links, working_experience)
            SELECT m.id, m.name, m.photo_asset_id, COALESCE(m.links, '[]'::jsonb), COALESCE(m.career, '[]'::jsonb)
            FROM members m
            WHERE LOWER(TRIM(COALESCE(m.section, ''))) IN ('director', 'researcher', 'researchers')
            ON CONFLICT (member_id) DO NOTHING
        `);
    }
};
