function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
}

const token = localStorage.getItem("token");
let isAuthValid = true;

if (!token) {
    isAuthValid = false;
    window.location.href = "/login";
}

// Decode JWT
function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
        return null;
    }
}

const user = parseJwt(token);

if (!user || !user.exp || user.exp * 1000 <= Date.now()) {
    clearAuth();
    isAuthValid = false;
    window.location.href = "/login";
} else if (user.role !== "user") {
    isAuthValid = false;
    window.location.href = "/adminDashboard";
}

let editingPublicationId = null;
let myPublications = [];
let selectedAuthors = [];
let authorSearchTimeout = null;
let currentProfile = null;
let currentPublicPage = null;

const PUBLICATION_TYPE_LABELS = {
    journal: "Journal Publications",
    conference: "Conference Proceedings",
    manuscript: "Unpublished Manuscripts"
};

const sidebarLinks = document.querySelectorAll(".sidebar-link[data-target]");
const dashboardPanels = document.querySelectorAll(".dashboard-panel");

function normalizeOptionalHttpUrl(value) {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed.toString();
    } catch (error) {
        return null;
    }
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add("show"));
    });

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove());
    }, 3500);
}

function showSection(sectionId) {
    dashboardPanels.forEach((panel) => {
        panel.classList.toggle("active", panel.id === sectionId);
    });

    sidebarLinks.forEach((link) => {
        link.classList.toggle("active", link.dataset.target === sectionId);
    });
}

sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
        showSection(link.dataset.target);
    });
});

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            clearAuth();
            window.location.href = "/login";
        }
        throw new Error(data.message || "Request failed");
    }

    return data;
}

function renderSelectedAuthors() {
    const wrap = document.getElementById("selectedAuthors");
    if (!wrap) {
        return;
    }

    if (selectedAuthors.length === 0) {
        wrap.innerHTML = "<p>No author selected.</p>";
        return;
    }

    wrap.innerHTML = selectedAuthors
        .map((author) => `
            <button type="button" class="selected-author-chip" data-id="${author.user_id}">
                ${author.name}
                <span aria-hidden="true">×</span>
            </button>
        `)
        .join("");

    wrap.querySelectorAll(".selected-author-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const id = Number(chip.dataset.id);
            selectedAuthors = selectedAuthors.filter((author) => Number(author.user_id) !== id);
            renderSelectedAuthors();
        });
    });
}

function renderAuthorSuggestions(members) {
    const box = document.getElementById("authorSuggestions");
    if (!box) {
        return;
    }

    if (!members || members.length === 0) {
        box.innerHTML = "<p>No matching authors.</p>";
        return;
    }

    box.innerHTML = members
        .map((member) => {
            const alreadySelected = selectedAuthors.some((author) => Number(author.user_id) === Number(member.user_id));
            return `
                <button type="button" class="author-suggestion-btn" data-id="${member.user_id}" data-name="${(member.name || "").replace(/\"/g, "&quot;")}">
                    <strong>${member.name || `User #${member.user_id}`}</strong>
                    <small>${member.position || member.section || ""}</small>
                    ${alreadySelected ? "<span>Selected</span>" : ""}
                </button>
            `;
        })
        .join("");

    box.querySelectorAll(".author-suggestion-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const userId = Number(button.dataset.id);
            const name = button.dataset.name || `User #${userId}`;

            if (!selectedAuthors.some((author) => Number(author.user_id) === userId)) {
                selectedAuthors.push({ user_id: userId, name });
                renderSelectedAuthors();
            }
        });
    });
}

async function searchAuthors(keyword) {
    const box = document.getElementById("authorSuggestions");
    if (!box) {
        return;
    }

    const trimmed = (keyword || "").trim();
    if (!trimmed) {
        box.innerHTML = "";
        return;
    }

    try {
        const members = await request(`/api/members/public?q=${encodeURIComponent(trimmed)}`, { method: "GET" });
        renderAuthorSuggestions(members);
    } catch (error) {
        box.innerHTML = `<p>${error.message}</p>`;
    }
}

function renderProfileInfo(data) {
    const memberName = data.member?.name || data.user?.email || "N/A";
    const profilePhotoUrl = data.member?.photo_url || "";
    const avatarInitial = (memberName || "U").trim().charAt(0).toUpperCase() || "U";

    document.getElementById("profileInfo").innerHTML = `
        <div class="dashboard-profile-overview">
            ${profilePhotoUrl
                ? `<img src="${profilePhotoUrl}" alt="${memberName} avatar" class="dashboard-profile-avatar">`
                : `<div class="dashboard-profile-avatar-fallback" aria-hidden="true">${avatarInitial}</div>`}
            <div class="dashboard-profile-meta">
                <p><strong>${memberName}</strong></p>
                <p><strong>User ID:</strong> ${data.user.id}</p>
                <p><strong>Role:</strong> ${data.user.role}</p>
                <p><strong>Access:</strong> Create / Edit / Delete your own publications</p>
            </div>
        </div>
    `;
}

function fillProfileForm(data) {
    const profileNameInput = document.getElementById("profileName");
    const profileBioInput = document.getElementById("profileBio");
    const profileCareerInput = document.getElementById("profileCareer");
    const profilePhotoAssetIdInput = document.getElementById("profilePhotoAssetId");
    const profilePhotoPreview = document.getElementById("profilePhotoPreview");

    if (profileNameInput) profileNameInput.value = data.member?.name || "";
    if (profileBioInput) profileBioInput.value = data.member?.bio || "";
    if (profileCareerInput) profileCareerInput.value = parseCareerEntries(data.member?.career).join("\n");
    if (profilePhotoAssetIdInput) profilePhotoAssetIdInput.value = data.member?.photo_asset_id || "";

    if (profilePhotoPreview) {
        const photoUrl = data.member?.photo_url || "";
        if (photoUrl) {
            profilePhotoPreview.src = photoUrl;
            profilePhotoPreview.hidden = false;
        } else {
            profilePhotoPreview.hidden = true;
            profilePhotoPreview.removeAttribute("src");
        }
    }
}

async function loadOwnProfile() {
    const data = await request("/api/profile", { method: "GET" });
    currentProfile = data;
    renderProfileInfo(data);
    fillProfileForm(data);
}

function parseMultilineEntries(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function parsePublicPageLinksText(value) {
    return String(value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const [labelRaw, urlRaw, colorRaw] = line.split("|").map((item) => String(item || "").trim());
            if (!labelRaw || !urlRaw) return null;

            const link = { label: labelRaw, url: urlRaw };
            if (colorRaw) {
                link.color = colorRaw;
            }
            return link;
        })
        .filter(Boolean);
}

function formatPublicPageLinks(value) {
    if (!Array.isArray(value)) return "";
    return value
        .filter((item) => item && item.label && item.url)
        .map((item) => [item.label, item.url, item.color || ""].filter(Boolean).join("|"))
        .join("\n");
}

function showHidePublicPageFieldsBySection(data) {
    const normalizedSection = String(data.section || "").trim().toLowerCase();
    const isAdminSection = ["director", "researcher", "researchers"].includes(normalizedSection);
    const adminOnlyFields = [
        "publicPageBookChaptersGroup",
        "publicPagePatentsGroup",
        "publicPageActivitiesAdvisorGroup",
        "publicPageActivitiesConferenceCommitteeGroup",
        "publicPageActivitiesPeerReviewGroup"
    ];
    const memberOnlyFields = [];
    
    adminOnlyFields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) el.style.display = isAdminSection ? "block" : "none";
    });
    
    memberOnlyFields.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) el.style.display = isAdminSection ? "none" : "block";
    });

    const researchGroup = document.getElementById("publicPageResearchExperienceGroup");
    if (researchGroup) researchGroup.style.display = "block";

    const workingGroup = document.getElementById("publicPageWorkingExperienceGroup");
    if (workingGroup) workingGroup.style.display = "none";
}

function fillPublicPageForm(data) {
    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
    };

    setValue("publicPageName", data.name || "");
    setValue("publicPageQuote", data.quote || "");
    setValue("publicPageHeroPhotoAssetId", data.hero_photo_asset_id || "");
    setValue("publicPageLinks", formatPublicPageLinks(data.links));
    setValue("publicPageEducation", (data.education || []).join("\n"));
    setValue("publicPageResearchExperience", (data.research_experience || []).join("\n"));
    setValue("publicPageAwardsGrants", (data.awards_grants || []).join("\n"));
    setValue("publicPageJournalPublications", (data.journal_publications || []).join("\n"));
    setValue("publicPageConferenceProceedings", (data.conference_proceedings || []).join("\n"));
    setValue("publicPageBookChapters", (data.book_chapters || []).join("\n"));
    setValue("publicPagePatents", (data.patents || []).join("\n"));
    setValue("publicPageActivitiesAdvisor", (data.academic_activities && data.academic_activities.advisor ? data.academic_activities.advisor : []).join("\n"));
    setValue("publicPageActivitiesConferenceCommittee", (data.academic_activities && data.academic_activities.conference_committee ? data.academic_activities.conference_committee : []).join("\n"));
    setValue("publicPageActivitiesPeerReview", (data.academic_activities && data.academic_activities.peer_review ? data.academic_activities.peer_review : []).join("\n"));
    setValue("publicPageProjectsPrincipalInvestigator", (data.projects && data.projects.principal_investigator ? data.projects.principal_investigator : []).join("\n"));

    const heroPreview = document.getElementById("publicPageHeroPhotoPreview");
    if (heroPreview) {
        if (data.hero_photo_url) {
            heroPreview.src = data.hero_photo_url;
            heroPreview.hidden = false;
        } else {
            heroPreview.hidden = true;
            heroPreview.removeAttribute("src");
        }
    }

    if (data.section) {
        showHidePublicPageFieldsBySection(data);
    }
}

async function loadOwnPublicPage() {
    const data = await request("/api/profile/public-page", { method: "GET" });
    currentPublicPage = data;
    fillPublicPageForm(data);
}

async function uploadPublicPageHeroPhoto() {
    const fileInput = document.getElementById("publicPageHeroPhotoFile");
    const status = document.getElementById("publicPageHeroPhotoUploadStatus");
    const heroAssetIdInput = document.getElementById("publicPageHeroPhotoAssetId");
    const preview = document.getElementById("publicPageHeroPhotoPreview");
    const button = document.getElementById("uploadPublicPageHeroPhotoBtn");

    if (!fileInput || !heroAssetIdInput || !button) return;

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        showToast("Please choose an image first", "error");
        return;
    }

    button.disabled = true;
    if (status) status.textContent = "Uploading...";

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(getApiUrl("/api/uploads/images"), {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Failed to upload image");

        heroAssetIdInput.value = data.id;
        if (preview && data.url) {
            preview.src = data.url;
            preview.hidden = false;
        }
        if (status) status.textContent = "Upload successful";
        showToast("Hero photo uploaded successfully", "success");
    } catch (error) {
        if (status) status.textContent = "Upload failed";
        showToast(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

function clearPublicPageHeroSelection() {
    const heroAssetIdInput = document.getElementById("publicPageHeroPhotoAssetId");
    const heroPreview = document.getElementById("publicPageHeroPhotoPreview");
    const heroFileInput = document.getElementById("publicPageHeroPhotoFile");
    const status = document.getElementById("publicPageHeroPhotoUploadStatus");

    if (heroAssetIdInput) heroAssetIdInput.value = "";
    if (heroPreview) {
        heroPreview.hidden = true;
        heroPreview.removeAttribute("src");
    }
    if (heroFileInput) heroFileInput.value = "";
    if (status) status.textContent = "Hero photo removed. Save public page to apply changes.";
}

async function saveOwnPublicPage(event) {
    event.preventDefault();

    const nameInput = document.getElementById("publicPageName");
    const name = nameInput ? nameInput.value.trim() : "";
    if (!name) {
        showToast("Display name is required", "error");
        return;
    }

    const payload = {
        name,
        quote: document.getElementById("publicPageQuote") ? document.getElementById("publicPageQuote").value.trim() : "",
        hero_photo_asset_id: document.getElementById("publicPageHeroPhotoAssetId") && document.getElementById("publicPageHeroPhotoAssetId").value
            ? Number(document.getElementById("publicPageHeroPhotoAssetId").value)
            : null,
        links: parsePublicPageLinksText(document.getElementById("publicPageLinks") ? document.getElementById("publicPageLinks").value : ""),
        education: parseMultilineEntries(document.getElementById("publicPageEducation") ? document.getElementById("publicPageEducation").value : ""),
        research_experience: parseMultilineEntries(document.getElementById("publicPageResearchExperience") ? document.getElementById("publicPageResearchExperience").value : ""),
        awards_grants: parseMultilineEntries(document.getElementById("publicPageAwardsGrants") ? document.getElementById("publicPageAwardsGrants").value : ""),
        journal_publications: parseMultilineEntries(document.getElementById("publicPageJournalPublications") ? document.getElementById("publicPageJournalPublications").value : ""),
        conference_proceedings: parseMultilineEntries(document.getElementById("publicPageConferenceProceedings") ? document.getElementById("publicPageConferenceProceedings").value : ""),
        book_chapters: parseMultilineEntries(document.getElementById("publicPageBookChapters") ? document.getElementById("publicPageBookChapters").value : ""),
        patents: parseMultilineEntries(document.getElementById("publicPagePatents") ? document.getElementById("publicPagePatents").value : ""),
        academic_activities: {
            advisor: parseMultilineEntries(document.getElementById("publicPageActivitiesAdvisor") ? document.getElementById("publicPageActivitiesAdvisor").value : ""),
            conference_committee: parseMultilineEntries(document.getElementById("publicPageActivitiesConferenceCommittee") ? document.getElementById("publicPageActivitiesConferenceCommittee").value : ""),
            peer_review: parseMultilineEntries(document.getElementById("publicPageActivitiesPeerReview") ? document.getElementById("publicPageActivitiesPeerReview").value : "")
        },
        projects: {
            principal_investigator: parseMultilineEntries(document.getElementById("publicPageProjectsPrincipalInvestigator") ? document.getElementById("publicPageProjectsPrincipalInvestigator").value : "")
        }
    };

    await request("/api/profile/public-page", {
        method: "PATCH",
        body: JSON.stringify(payload)
    });

    await loadOwnPublicPage();
    showToast("Public page updated successfully", "success");
}

function openOwnPublicPage() {
    const memberId = Number(currentPublicPage && currentPublicPage.member_id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
        showToast("Cannot open public page yet. Save your public page first.", "error");
        return;
    }

    window.open(`/member/${memberId}`, "_blank", "noopener");
}

async function uploadProfileAvatar() {
    const fileInput = document.getElementById("profilePhotoFile");
    const status = document.getElementById("profilePhotoUploadStatus");
    const photoAssetIdInput = document.getElementById("profilePhotoAssetId");
    const preview = document.getElementById("profilePhotoPreview");
    const button = document.getElementById("uploadProfilePhotoBtn");

    if (!fileInput || !photoAssetIdInput || !button) return;

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        showToast("Please choose an image first", "error");
        return;
    }

    button.disabled = true;
    if (status) status.textContent = "Uploading...";

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(getApiUrl("/api/uploads/images"), {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || "Failed to upload image");

        photoAssetIdInput.value = data.id;
        if (preview && data.url) {
            preview.src = data.url;
            preview.hidden = false;
        }
        if (status) status.textContent = "Upload successful";
        showToast("Avatar uploaded successfully", "success");
    } catch (error) {
        if (status) status.textContent = "Upload failed";
        showToast(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function saveOwnProfile(event) {
    event.preventDefault();

    const profileNameInput = document.getElementById("profileName");
    const profileBioInput = document.getElementById("profileBio");
    const profileCareerInput = document.getElementById("profileCareer");
    const profilePhotoAssetIdInput = document.getElementById("profilePhotoAssetId");

    const name = profileNameInput ? profileNameInput.value.trim() : "";
    if (!name) {
        showToast("Name is required", "error");
        return;
    }

    await request("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
            name,
            bio: profileBioInput ? profileBioInput.value.trim() : "",
            career: parseCareerEntries(profileCareerInput ? profileCareerInput.value : ""),
            photo_asset_id: profilePhotoAssetIdInput && profilePhotoAssetIdInput.value
                ? Number(profilePhotoAssetIdInput.value)
                : null
        })
    });

    await loadOwnProfile();
    showToast("Profile updated successfully", "success");
}

async function loadMyPublications() {
    try {
        const data = await request("/api/my-publications", { method: "GET" });
        myPublications = data;
        updateOverviewStats(data);
        const list = document.getElementById("publicationList");

        if (data.length === 0) {
            list.innerHTML = "<p>You have no publications yet.</p>";
            return;
        }

        list.innerHTML = data.map(pub => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong> (${pub.status})</p>
                    <p><small>Type: ${PUBLICATION_TYPE_LABELS[pub.publication_type] || "Journal Publications"}</small></p>
                    <p><small>Link: ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer">Open publication</a>` : "N/A"}</small></p>
                    <p><small>Authors: ${pub.authors || "N/A"}</small></p>
                    <p><small>Journal: ${pub.journal || "N/A"}</small></p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p><small>DOI: ${pub.doi || "N/A"}</small></p>
                    <p>${pub.description}</p>
                </div>
                <div class="pub-btn-group">
                    <button class="edit-pub-btn" data-id="${pub.id}">Edit</button>
                    <button class="delete-pub-btn" data-id="${pub.id}">Delete</button>
                </div>
            </div>
        `).join("");

        list.querySelectorAll(".edit-pub-btn").forEach((button) => {
            button.addEventListener("click", () => {
                const id = Number(button.dataset.id);
                const publication = myPublications.find((item) => item.id === id);

                if (!publication) {
                    return;
                }

                startEditPublication(publication);
            });
        });

        list.querySelectorAll(".delete-pub-btn").forEach((button) => {
            button.addEventListener("click", async () => {
                const id = Number(button.dataset.id);
                await deletePublication(id);
            });
        });
    } catch (error) {
        showToast(error.message, "error");
    }
}

function updateOverviewStats(publications) {
    const total = publications.length;
    const approved = publications.filter((pub) => String(pub.status || "").toLowerCase() === "approved").length;
    const pending = publications.filter((pub) => String(pub.status || "").toLowerCase() === "pending").length;
    const rejected = publications.filter((pub) => String(pub.status || "").toLowerCase() === "rejected").length;

    document.getElementById("statTotal").textContent = total;
    document.getElementById("statApproved").textContent = approved;
    document.getElementById("statPending").textContent = pending;
    document.getElementById("statRejected").textContent = rejected;
}

if (isAuthValid) {
    document.getElementById("createPubForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("title").value.trim();
        const linkInput = document.getElementById("link").value;
        const publicationType = document.getElementById("publicationType").value;
        const authorIds = selectedAuthors.map((author) => Number(author.user_id)).filter((value) => Number.isInteger(value));
        const authors = selectedAuthors.map((author) => author.name).join(", ");
        const journal = document.getElementById("journal").value.trim();
        const year = document.getElementById("year").value;
        const description = document.getElementById("description").value.trim();
        const doiInput = document.getElementById("doi").value.trim();
        const doi = doiInput || null;
        const link = normalizeOptionalHttpUrl(linkInput);
        const submitButton = e.target.querySelector("button[type='submit']");
        const isEditing = Boolean(editingPublicationId);

        if (linkInput.trim() && !link) {
            showToast("Link must be a valid URL starting with http:// or https://", "error");
            return;
        }

        if (authorIds.length === 0) {
            showToast("Please select at least one author from database", "error");
            return;
        }

        try {
            if (isEditing) {
                await request(`/api/publications/${editingPublicationId}`, {
                    method: "PUT",
                    body: JSON.stringify({ title, link, authors, publicationType, authorIds, journal, year, description, doi })
                });
                editingPublicationId = null;
                submitButton.textContent = "Create";
                showToast("Publication updated successfully", "success");
            } else {
                await request("/api/publications", {
                    method: "POST",
                    body: JSON.stringify({ title, link, authors, publicationType, authorIds, journal, year, description, doi })
                });
                showToast("Publication created successfully", "success");
            }

            document.getElementById("createPubForm").reset();
            selectedAuthors = [];
            renderSelectedAuthors();
            document.getElementById("authorSuggestions").innerHTML = "";
            await loadMyPublications();
        } catch (error) {
            showToast(isEditing ? `Could not update publication: ${error.message}` : `Could not create publication: ${error.message}`, "error");
        }
    });
}

function startEditPublication(publication) {
    editingPublicationId = publication.id;
    showSection("submitSection");
    document.getElementById("title").value = publication.title;
    document.getElementById("link").value = publication.link || "";
    document.getElementById("publicationType").value = publication.publication_type || "journal";
    document.getElementById("journal").value = publication.journal || "";
    document.getElementById("year").value = publication.year || "";
    document.getElementById("description").value = publication.description;
    document.getElementById("doi").value = publication.doi || "";
    selectedAuthors = [];
    if (Array.isArray(publication.author_ids) && publication.author_ids.length > 0 && publication.authors) {
        const names = String(publication.authors).split(",").map((name) => name.trim());
        selectedAuthors = publication.author_ids.map((id, index) => ({
            user_id: Number(id),
            name: names[index] || `User #${id}`
        }));
    }
    renderSelectedAuthors();
    document.querySelector("#createPubForm button[type='submit']").textContent = "Update";
}

async function deletePublication(id) {
    try {
        await request(`/api/publications/${id}`, { method: "DELETE" });

        if (editingPublicationId === id) {
            editingPublicationId = null;
            document.getElementById("createPubForm").reset();
            selectedAuthors = [];
            renderSelectedAuthors();
            document.querySelector("#createPubForm button[type='submit']").textContent = "Create";
        }

        await loadMyPublications();
    } catch (error) {
        showToast(error.message, "error");
    }
}

window.startEditPublication = startEditPublication;

if (isAuthValid) {
    const authorSearchInput = document.getElementById("authorSearch");
    if (authorSearchInput) {
        authorSearchInput.addEventListener("input", () => {
            clearTimeout(authorSearchTimeout);
            const keyword = authorSearchInput.value;
            authorSearchTimeout = setTimeout(() => {
                searchAuthors(keyword);
            }, 250);
        });
    }

    loadOwnProfile().catch((error) => {
        if (error.message) {
            showToast(error.message, "error");
        }
    });
    loadOwnPublicPage().catch((error) => {
        if (error.message) {
            showToast(error.message, "error");
        }
    });
    loadMyPublications();
    renderSelectedAuthors();
    showSection("overviewSection");

    const editProfileForm = document.getElementById("editProfileForm");
    if (editProfileForm) {
        editProfileForm.addEventListener("submit", async (e) => {
            try {
                await saveOwnProfile(e);
            } catch (error) {
                showToast(error.message, "error");
            }
        });
    }

    const uploadProfilePhotoBtn = document.getElementById("uploadProfilePhotoBtn");
    if (uploadProfilePhotoBtn) {
        uploadProfilePhotoBtn.addEventListener("click", uploadProfileAvatar);
    }

    const removeProfilePhotoBtn = document.getElementById("removeProfilePhotoBtn");
    if (removeProfilePhotoBtn) {
        removeProfilePhotoBtn.addEventListener("click", () => {
            clearProfileAvatarSelection();
            showToast("Avatar removed. Click Save Profile to confirm.", "success");
        });
    }

    const editPublicPageForm = document.getElementById("editPublicPageForm");
    if (editPublicPageForm) {
        editPublicPageForm.addEventListener("submit", async (e) => {
            try {
                await saveOwnPublicPage(e);
            } catch (error) {
                showToast(error.message, "error");
            }
        });
    }

    const uploadPublicPageHeroPhotoBtn = document.getElementById("uploadPublicPageHeroPhotoBtn");
    if (uploadPublicPageHeroPhotoBtn) {
        uploadPublicPageHeroPhotoBtn.addEventListener("click", uploadPublicPageHeroPhoto);
    }

    const removePublicPageHeroPhotoBtn = document.getElementById("removePublicPageHeroPhotoBtn");
    if (removePublicPageHeroPhotoBtn) {
        removePublicPageHeroPhotoBtn.addEventListener("click", () => {
            clearPublicPageHeroSelection();
            showToast("Hero photo removed. Click Save Public Page to confirm.", "success");
        });
    }

    const openMyPublicPageBtn = document.getElementById("openMyPublicPageBtn");
    if (openMyPublicPageBtn) {
        openMyPublicPageBtn.addEventListener("click", openOwnPublicPage);
    }

    // Change password
    const changePasswordForm = document.getElementById("changePasswordForm");
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById("currentPassword").value;
            const newPassword = document.getElementById("newPassword").value;
            const confirmPassword = document.getElementById("confirmPassword").value;

            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast("All fields are required", "error");
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast("New passwords do not match", "error");
                return;
            }

            if (newPassword.length < 6) {
                showToast("New password must be at least 6 characters", "error");
                return;
            }

            try {
                await request("/api/change-password", {
                    method: "POST",
                    body: JSON.stringify({ oldPassword: currentPassword, newPassword })
                });

                showToast("Password changed successfully", "success");
                changePasswordForm.reset();
            } catch (error) {
                showToast(error.message, "error");
            }
        });
    }

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        clearAuth();
        window.location.href = "/";
    });
}

function parseCareerEntries(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item || "").trim()).filter(Boolean);
            }
        } catch (error) {
            // ignore parse errors and treat as plain text
        }

        return value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function clearProfileAvatarSelection() {
    const profilePhotoAssetIdInput = document.getElementById("profilePhotoAssetId");
    const profilePhotoPreview = document.getElementById("profilePhotoPreview");
    const profilePhotoFileInput = document.getElementById("profilePhotoFile");
    const status = document.getElementById("profilePhotoUploadStatus");

    if (profilePhotoAssetIdInput) {
        profilePhotoAssetIdInput.value = "";
    }

    if (profilePhotoPreview) {
        profilePhotoPreview.hidden = true;
        profilePhotoPreview.removeAttribute("src");
    }

    if (profilePhotoFileInput) {
        profilePhotoFileInput.value = "";
    }

    if (status) {
        status.textContent = "Avatar removed. Save profile to apply changes.";
    }
}