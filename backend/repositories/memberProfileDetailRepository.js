const pool = require("../db");

async function findByMemberId(memberId, db = pool) {
    const result = await db.query(
        `
        SELECT mpd.member_id,
               mpd.name,
               mpd.hero_photo_asset_id,
               COALESCE(ia.public_url, '') AS hero_photo_url,
               mpd.quote,
               mpd.links,
               mpd.research_experience,
               mpd.education,
               mpd.journal_publications,
               mpd.conference_proceedings,
               mpd.projects,
               mpd.awards_grants,
               mpd.created_at,
               mpd.updated_at
        FROM member_profile_details mpd
        LEFT JOIN image_assets ia ON ia.id = mpd.hero_photo_asset_id
        WHERE mpd.member_id = $1
        LIMIT 1
        `,
        [memberId]
    );

    return result.rows[0] || null;
}

async function upsertBootstrapFromMember(member, db = pool) {
    if (!member || !Number.isInteger(Number(member.member_id))) {
        return null;
    }

    const result = await db.query(
        `
        INSERT INTO member_profile_details (member_id, name, hero_photo_asset_id, links, working_experience)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (member_id)
        DO UPDATE SET
            name = COALESCE(NULLIF(member_profile_details.name, ''), EXCLUDED.name)
        RETURNING member_id
        `,
        [
            Number(member.member_id),
            String(member.name || "").trim(),
            member.photo_asset_id || null,
            JSON.stringify(Array.isArray(member.links) ? member.links : []),
            JSON.stringify(Array.isArray(member.career) ? member.career : [])
        ]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findByMemberId(Number(member.member_id), db);
}

async function upsertByMemberId(memberId, payload, db = pool) {
    const result = await db.query(
        `
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
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, NOW())
        ON CONFLICT (member_id)
        DO UPDATE SET
            name = EXCLUDED.name,
            hero_photo_asset_id = EXCLUDED.hero_photo_asset_id,
            quote = EXCLUDED.quote,
            links = EXCLUDED.links,
            research_experience = EXCLUDED.research_experience,
            education = EXCLUDED.education,
            journal_publications = EXCLUDED.journal_publications,
            conference_proceedings = EXCLUDED.conference_proceedings,
            projects = EXCLUDED.projects,
            awards_grants = EXCLUDED.awards_grants,
            updated_at = NOW()
        RETURNING member_id
        `,
        [
            memberId,
            payload.name,
            payload.hero_photo_asset_id,
            payload.quote,
            JSON.stringify(payload.links || []),
            JSON.stringify(payload.research_experience || []),
            JSON.stringify(payload.education || []),
            JSON.stringify(payload.journal_publications || []),
            JSON.stringify(payload.conference_proceedings || []),
            JSON.stringify(payload.projects || { principal_investigator: [] }),
            JSON.stringify(payload.awards_grants || [])
        ]
    );

    if (!result.rows[0]) {
        return null;
    }

    return findByMemberId(memberId, db);
}

module.exports = {
    findByMemberId,
    upsertBootstrapFromMember,
    upsertByMemberId
};
