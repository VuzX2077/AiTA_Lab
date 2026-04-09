const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function requestJson(url, { method = "GET", token, body } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    const text = await response.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!response.ok) {
        throw new Error(`${method} ${url} failed (${response.status}): ${JSON.stringify(data)}`);
    }

    return data;
}

async function uploadPngAsset(token) {
    const pixelBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Yf9QAAAAASUVORK5CYII=";
    const tempFile = path.join(__dirname, "tmp-social-icon.png");
    fs.writeFileSync(tempFile, Buffer.from(pixelBase64, "base64"));

    try {
        const form = new FormData();
        const blob = new Blob([fs.readFileSync(tempFile)], { type: "image/png" });
        form.append("file", blob, "tmp-social-icon.png");

        const response = await fetch(`${BASE_URL}/api/uploads/images`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: form
        });

        const text = await response.text();
        let data = null;
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            throw new Error(`Upload failed (${response.status}): ${JSON.stringify(data)}`);
        }

        assert(Number.isInteger(Number(data.id)) && Number(data.id) > 0, "Upload response missing valid image asset id");
        assert(typeof data.url === "string" && data.url.length > 0, "Upload response missing image url");

        return {
            id: Number(data.id),
            url: data.url
        };
    } finally {
        try {
            fs.unlinkSync(tempFile);
        } catch {
            // ignore temp file cleanup failure
        }
    }
}

async function main() {
    const ts = Date.now();
    const adminEmail = `verify.admin.${ts}@example.com`;
    const memberEmail = `verify.member.${ts}@example.com`;
    const password = "Passw0rd!";
    const presetLabel = `VerifyPreset${ts}`;

    const result = {
        flow1_adminPresetLibrary: "FAIL",
        flow2_adminMyPublicPagePresetSelection: "FAIL",
        flow3_memberMyPublicPagePresetSelection: "FAIL",
        flow4_adminEditMemberModalPresetSelection: "FAIL"
    };

    await requestJson(`${BASE_URL}/api/register`, {
        method: "POST",
        body: { email: adminEmail, password, role: "admin" }
    });

    await requestJson(`${BASE_URL}/api/register`, {
        method: "POST",
        body: { email: memberEmail, password, role: "user" }
    });

    const adminLogin = await requestJson(`${BASE_URL}/api/login`, {
        method: "POST",
        body: { email: adminEmail, password }
    });
    const memberLogin = await requestJson(`${BASE_URL}/api/login`, {
        method: "POST",
        body: { email: memberEmail, password }
    });

    const adminToken = adminLogin.token;
    const memberToken = memberLogin.token;

    assert(adminToken, "Missing admin token");
    assert(memberToken, "Missing member token");

    // Bootstrap members rows so public-page upsert has a valid member_id context.
    await requestJson(`${BASE_URL}/api/profile`, {
        method: "PATCH",
        token: adminToken,
        body: {
            name: "Verify Admin",
            bio: "Admin bootstrap profile",
            career: []
        }
    });

    await requestJson(`${BASE_URL}/api/profile`, {
        method: "PATCH",
        token: memberToken,
        body: {
            name: "Verify Member",
            bio: "Member bootstrap profile",
            career: []
        }
    });

    const uploadedIcon = await uploadPngAsset(adminToken);

    const presetsPayload = [
        {
            label: presetLabel,
            color: "#1463ff",
            icon_asset_id: uploadedIcon.id
        }
    ];

    await requestJson(`${BASE_URL}/api/admin/social-link-icons`, {
        method: "PUT",
        token: adminToken,
        body: { presets: presetsPayload }
    });

    const adminPresets = await requestJson(`${BASE_URL}/api/admin/social-link-icons`, {
        method: "GET",
        token: adminToken
    });
    const publicPresets = await requestJson(`${BASE_URL}/api/social-link-icons/public`, {
        method: "GET"
    });

    const adminPreset = Array.isArray(adminPresets) ? adminPresets.find((p) => p.label === presetLabel) : null;
    const publicPreset = Array.isArray(publicPresets) ? publicPresets.find((p) => p.label === presetLabel) : null;

    assert(adminPreset, "Admin preset list missing saved preset");
    assert(publicPreset, "Public preset list missing saved preset");
    assert(Number(adminPreset.icon_asset_id) === uploadedIcon.id, "Admin preset icon_asset_id mismatch");
    assert(Number(publicPreset.icon_asset_id) === uploadedIcon.id, "Public preset icon_asset_id mismatch");
    assert(String(adminPreset.icon_url || "").length > 0, "Admin preset icon_url missing");
    assert(String(publicPreset.icon_url || "").length > 0, "Public preset icon_url missing");
    result.flow1_adminPresetLibrary = "PASS";

    const adminPublicPagePayload = {
        name: "Verify Admin",
        quote: "Admin flow check",
        links: [
            {
                label: presetLabel,
                url: "https://example.com/admin-flow",
                color: "#1463ff",
                icon_asset_id: uploadedIcon.id
            }
        ],
        education: [],
        research_experience: [],
        awards_grants: [],
        journal_publications: [],
        conference_proceedings: [],
        projects: { principal_investigator: [] }
    };

    await requestJson(`${BASE_URL}/api/profile/public-page`, {
        method: "PATCH",
        token: adminToken,
        body: adminPublicPagePayload
    });

    const adminPublicPage = await requestJson(`${BASE_URL}/api/profile/public-page`, {
        method: "GET",
        token: adminToken
    });

    const adminPublicLink = Array.isArray(adminPublicPage.links) ? adminPublicPage.links.find((l) => l.label === presetLabel) : null;
    assert(adminPublicLink, "Admin public page missing saved preset link");
    assert(Number(adminPublicLink.icon_asset_id) === uploadedIcon.id, "Admin public page icon_asset_id mismatch");
    assert(String(adminPublicLink.icon_url || "").length > 0, "Admin public page icon_url missing");
    result.flow2_adminMyPublicPagePresetSelection = "PASS";

    const memberPublicPagePayload = {
        name: "Verify Member",
        quote: "Member flow check",
        links: [
            {
                label: presetLabel,
                url: "https://example.com/member-flow",
                color: "#1463ff",
                icon_asset_id: uploadedIcon.id
            }
        ],
        education: [],
        research_experience: [],
        awards_grants: [],
        journal_publications: [],
        conference_proceedings: [],
        projects: { principal_investigator: [] }
    };

    await requestJson(`${BASE_URL}/api/profile/public-page`, {
        method: "PATCH",
        token: memberToken,
        body: memberPublicPagePayload
    });

    const memberPublicPage = await requestJson(`${BASE_URL}/api/profile/public-page`, {
        method: "GET",
        token: memberToken
    });

    const memberPublicLink = Array.isArray(memberPublicPage.links) ? memberPublicPage.links.find((l) => l.label === presetLabel) : null;
    assert(memberPublicLink, "Member public page missing saved preset link");
    assert(Number(memberPublicLink.icon_asset_id) === uploadedIcon.id, "Member public page icon_asset_id mismatch");
    assert(String(memberPublicLink.icon_url || "").length > 0, "Member public page icon_url missing");
    result.flow3_memberMyPublicPagePresetSelection = "PASS";

    const createdMemberProfile = await requestJson(`${BASE_URL}/api/member-profiles`, {
        method: "POST",
        token: adminToken,
        body: {
            name: `Verify Standalone ${ts}`,
            position: "Research Assistant",
            bio: "For edit-member flow verification",
            section: "researchers",
            links: [
                {
                    label: presetLabel,
                    url: "https://example.com/edit-member-create",
                    color: "#1463ff",
                    icon_asset_id: uploadedIcon.id,
                    icon_url: publicPreset.icon_url
                }
            ],
            career: []
        }
    });

    const createdMemberId = Number(createdMemberProfile && createdMemberProfile.member && createdMemberProfile.member.member_id);
    assert(Number.isInteger(createdMemberId) && createdMemberId > 0, "Failed to create standalone member profile for edit flow");

    await requestJson(`${BASE_URL}/api/member-profiles/${createdMemberId}`, {
        method: "PATCH",
        token: adminToken,
        body: {
            name: `Verify Standalone ${ts} Updated`,
            position: "Research Assistant",
            bio: "Updated by admin edit-member flow",
            section: "researchers",
            links: [
                {
                    label: presetLabel,
                    url: "https://example.com/edit-member-update",
                    color: "#1463ff",
                    icon_asset_id: uploadedIcon.id,
                    icon_url: publicPreset.icon_url
                }
            ],
            career: []
        }
    });

    const updatedMemberProfile = await requestJson(`${BASE_URL}/api/member-profiles/${createdMemberId}`, {
        method: "GET",
        token: adminToken
    });

    const editedLink = Array.isArray(updatedMemberProfile.links) ? updatedMemberProfile.links.find((l) => l.label === presetLabel) : null;
    assert(editedLink, "Edit member flow missing saved preset link");
    assert(Number(editedLink.icon_asset_id) === uploadedIcon.id, "Edit member flow icon_asset_id mismatch");
    result.flow4_adminEditMemberModalPresetSelection = "PASS";

    console.log("\n=== VERIFY SOCIAL ICON FLOWS ===");
    Object.entries(result).forEach(([flow, status]) => {
        console.log(`${flow}: ${status}`);
    });
    console.log("\nArtifacts:");
    console.log(`adminEmail=${adminEmail}`);
    console.log(`memberEmail=${memberEmail}`);
    console.log(`presetLabel=${presetLabel}`);
    console.log(`iconAssetId=${uploadedIcon.id}`);
}

main().catch((error) => {
    console.error("\nVerification failed:", error.message);
    process.exit(1);
});
