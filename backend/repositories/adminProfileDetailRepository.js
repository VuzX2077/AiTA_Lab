const pool = require("../db");

async function findByMemberId(memberId, db = pool) {
    const result = await db.query(
        `
        SELECT apd.member_id,
               apd.name,
               apd.hero_photo_asset_id,
               COALESCE(ia.public_url, '') AS hero_photo_url,
               apd.quote,
               apd.links,
               apd.education,
               apd.working_experience,
               apd.awards_grants,
               apd.journal_publications,
               apd.conference_proceedings,
               apd.book_chapters,
               apd.patents,
               apd.academic_activities,
               apd.projects,
               apd.created_at,
               apd.updated_at
        FROM admin_profile_details apd
        LEFT JOIN image_assets ia ON ia.id = apd.hero_photo_asset_id
        WHERE apd.member_id = $1
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
        INSERT INTO admin_profile_details (member_id, name, hero_photo_asset_id, links, working_experience)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (member_id)
        DO UPDATE SET
            name = COALESCE(NULLIF(admin_profile_details.name, ''), EXCLUDED.name)
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
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14::jsonb, NOW())
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
            book_chapters = EXCLUDED.book_chapters,
            patents = EXCLUDED.patents,
            academic_activities = EXCLUDED.academic_activities,
            projects = EXCLUDED.projects,
            updated_at = NOW()
        RETURNING member_id
        `,
        [
            memberId,
            payload.name,
            payload.hero_photo_asset_id,
            payload.quote,
            JSON.stringify(payload.links || []),
            JSON.stringify(payload.education || []),
            JSON.stringify(payload.working_experience || []),
            JSON.stringify(payload.awards_grants || []),
            JSON.stringify(payload.journal_publications || []),
            JSON.stringify(payload.conference_proceedings || []),
            JSON.stringify(payload.book_chapters || []),
            JSON.stringify(payload.patents || []),
            JSON.stringify(payload.academic_activities || { advisor: [], conference_committee: [], peer_review: [] }),
            JSON.stringify(payload.projects || { principal_investigator: [] })
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
