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

        // Reconcile misplaced records across two tables by member section.
        await pool.query(`
            INSERT INTO admin_profile_details (
                member_id,
                name,
                hero_photo_asset_id,
                quote,
                links,
                education,
                working_experience,
                awards_grants,
                journal_publications,
                conference_proceedings,
                book_chapters,
                patents,
                academic_activities,
                projects,
                created_at,
                updated_at
            )
            SELECT
                mpd.member_id,
                mpd.name,
                mpd.hero_photo_asset_id,
                mpd.quote,
                mpd.links,
                mpd.education,
                mpd.research_experience,
                mpd.awards_grants,
                mpd.journal_publications,
                mpd.conference_proceedings,
                '[]'::jsonb,
                '[]'::jsonb,
                '{"advisor":[],"conference_committee":[],"peer_review":[]}'::jsonb,
                COALESCE(mpd.projects, '{"principal_investigator":[]}'::jsonb),
                mpd.created_at,
                mpd.updated_at
            FROM member_profile_details mpd
            INNER JOIN members m ON m.id = mpd.member_id
            WHERE LOWER(TRIM(COALESCE(m.section, ''))) IN ('director', 'researcher', 'researchers')
            ON CONFLICT (member_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                hero_photo_asset_id = EXCLUDED.hero_photo_asset_id,
                quote = EXCLUDED.quote,
                links = EXCLUDED.links,
                education = EXCLUDED.education,
                working_experience = EXCLUDED.working_experience,
                awards_grants = EXCLUDED.awards_grants,
                journal_publications = EXCLUDED.journal_publications,
                conference_proceedings = EXCLUDED.conference_proceedings,
                projects = EXCLUDED.projects,
                updated_at = NOW()
        `);

        await pool.query(`
            DELETE FROM member_profile_details mpd
            USING members m
            WHERE m.id = mpd.member_id
              AND LOWER(TRIM(COALESCE(m.section, ''))) IN ('director', 'researcher', 'researchers')
        `);

        await pool.query(`
            INSERT INTO member_profile_details (
                member_id,
                name,
                hero_photo_asset_id,
                quote,
                links,
                research_experience,
                education,
                journal_publications,
                conference_proceedings,
                projects,
                awards_grants,
                created_at,
                updated_at
            )
            SELECT
                apd.member_id,
                apd.name,
                apd.hero_photo_asset_id,
                apd.quote,
                apd.links,
                apd.working_experience,
                apd.education,
                apd.journal_publications,
                apd.conference_proceedings,
                COALESCE(apd.projects, '{"principal_investigator":[]}'::jsonb),
                apd.awards_grants,
                apd.created_at,
                apd.updated_at
            FROM admin_profile_details apd
            INNER JOIN members m ON m.id = apd.member_id
            WHERE LOWER(TRIM(COALESCE(m.section, ''))) IN ('undergraduate research assistants', 'undergraduate', 'alumni')
            ON CONFLICT (member_id)
            DO UPDATE SET
                name = EXCLUDED.name,
                hero_photo_asset_id = EXCLUDED.hero_photo_asset_id,
                quote = EXCLUDED.quote,
                links = EXCLUDED.links,
                research_experience = EXCLUDED.research_experience,
                education = EXCLUDED.education,
                awards_grants = EXCLUDED.awards_grants,
                journal_publications = EXCLUDED.journal_publications,
                conference_proceedings = EXCLUDED.conference_proceedings,
                projects = EXCLUDED.projects,
                updated_at = NOW()
        `);

        await pool.query(`
            DELETE FROM admin_profile_details apd
            USING members m
            WHERE m.id = apd.member_id
              AND LOWER(TRIM(COALESCE(m.section, ''))) IN ('undergraduate research assistants', 'undergraduate', 'alumni')
        `);
    }
};
