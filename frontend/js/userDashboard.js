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
    document.getElementById("profileInfo").innerHTML = `
        <p><strong>${memberName}</strong> </p>
        <p><strong>User ID:</strong> ${data.user.id}</p>
        <p><strong>Role:</strong> ${data.user.role}</p>
        <p><strong>Access:</strong> Create / Edit / Delete your own publications</p>
    `;
}

function fillProfileForm(data) {
    const profileNameInput = document.getElementById("profileName");
    const profileBioInput = document.getElementById("profileBio");
    const profilePhotoAssetIdInput = document.getElementById("profilePhotoAssetId");
    const profilePhotoPreview = document.getElementById("profilePhotoPreview");

    if (profileNameInput) profileNameInput.value = data.member?.name || "";
    if (profileBioInput) profileBioInput.value = data.member?.bio || "";
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

        const response = await fetch("/api/uploads/images", {
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
                <div>
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