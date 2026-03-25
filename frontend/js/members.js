// ─── constants ────────────────────────────────────────────────────────────────
const SECTIONS = [
    { id: "director",     label: "Director" },
    { id: "researchers",  label: "Researchers" },
    { id: "undergraduate",label: "Undergraduate Research Assistants" },
    { id: "alumni",       label: "Alumni" },
    { id: "collaborators",label: "Collaborators" },
];

const LINK_PRESETS = [
    { label: "Personal Page", color: "#1565c0" },
    { label: "ORCID", color: "#a6ce39" },
    { label: "Google Scholar", color: "#4285f4" },
    { label: "Scopus Author ID", color: "#e07b34" },
    { label: "Web of Science", color: "#193e7c" },
    { label: "ResearchGate", color: "#00b5a0" },
];

// ─── auth helpers ─────────────────────────────────────────────────────────────
function getAdminToken() {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    if (!token || role !== "admin") return null;
    try {
        const p = JSON.parse(atob(token.split(".")[1]));
        return p.exp * 1000 > Date.now() ? token : null;
    } catch { return null; }
}

const adminToken = getAdminToken();
let memberNamePool = [];
let memberSuggestionPool = [];

function apiUrl(path) {
    if (typeof window.getApiUrl === "function") {
        return window.getApiUrl(path);
    }

    return path;
}

function getMemberDetailHref(member) {
    const memberId = Number(member && member.member_id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
        return "#";
    }

    const isStaticHtml = window.location.hostname.includes("github.io") || /\.html$/i.test(window.location.pathname);
    if (isStaticHtml) {
        const base = typeof window.getPageUrl === "function"
            ? window.getPageUrl("memberDetail.html")
            : "./memberDetail.html";
        return `${base}?id=${memberId}`;
    }

    return `/member/${memberId}`;
}

function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
}

function findSuggestedMemberByName(name) {
    const normalized = normalizeName(name);
    if (!normalized) return null;
    return memberSuggestionPool.find((member) => normalizeName(member?.name) === normalized) || null;
}

// ─── toast ────────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
    let box = document.getElementById("toast-container");
    if (!box) {
        box = document.createElement("div");
        box.id = "toast-container";
        document.body.appendChild(box);
    }
    const t = document.createElement("div");
    t.className = `toast ${type}`;
    t.textContent = msg;
    box.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add("show")));
    setTimeout(() => {
        t.classList.remove("show");
        t.addEventListener("transitionend", () => t.remove());
    }, 3500);
}

// ─── render helpers ───────────────────────────────────────────────────────────
function safeArr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
}

async function ensureMemberNamePool() {
    if (!adminToken || memberSuggestionPool.length) return;
    try {
        const res = await fetch(apiUrl("/api/members"), {
            headers: { "Authorization": `Bearer ${adminToken}` },
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) return;

        memberSuggestionPool = data.filter((member) => String(member?.name || "").trim());

        memberNamePool = [...new Set(
            memberSuggestionPool
                .map((member) => String(member?.name || "").trim())
                .filter(Boolean)
        )];
    } catch {
        memberNamePool = [];
        memberSuggestionPool = [];
    }
}

function updateNameSuggestions(keyword = "") {
    const datalist = document.getElementById("memberNameSuggestList");
    if (!datalist) return;

    const q = String(keyword || "").trim().toLowerCase();
    const choices = memberNamePool
        .filter((name) => !q || name.toLowerCase().includes(q))
        .slice(0, 10);

    datalist.innerHTML = choices
        .map((name) => `<option value="${name.replace(/"/g, "&quot;")}"></option>`)
        .join("");
}

function renderMemberCard(m) {
    const career = safeArr(m.career);
    const links  = safeArr(m.links);

    const article = document.createElement("article");
    article.className = "member-card";

    // ── name header ──────────────────────────────────────────────────────────
    const nameRow = document.createElement("div");
    nameRow.className = "member-name-row";

    const h3 = document.createElement("h3");
    h3.className = "member-name";
    const memberName = (m.name || "").trim();
    const memberPosition = (m.position || "").trim();
    const nameLink = document.createElement("a");
    nameLink.className = "member-name-link";
    nameLink.href = getMemberDetailHref(m);
    nameLink.textContent = memberPosition ? `${memberName}, ${memberPosition}.` : memberName;
    h3.appendChild(nameLink);
    nameRow.appendChild(h3);

    if (adminToken) {
        const acts = document.createElement("div");
        acts.className = "member-admin-btns";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "mbtn mbtn-edit";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => openEditModal(m));

        const delBtn = document.createElement("button");
        delBtn.type = "button";
        delBtn.className = "mbtn mbtn-delete";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => confirmDelete(m));

        acts.appendChild(editBtn);
        acts.appendChild(delBtn);
        nameRow.appendChild(acts);
    }

    article.appendChild(nameRow);

    // ── photo + bio row ───────────────────────────────────────────────────────
    const bodyRow = document.createElement("div");
    bodyRow.className = "member-body-row";

    // avatar: render only when a valid photo URL exists
    const photoUrl = String(m.photo_url || "").trim();
    if (photoUrl) {
        const avatar = document.createElement("div");
        avatar.className = "member-avatar";

        const img = document.createElement("img");
        img.src = photoUrl;
        img.alt = m.name || "";
        img.onerror = () => avatar.remove();

        avatar.appendChild(img);
        bodyRow.appendChild(avatar);
    }

    // info (position + bio)
    const info = document.createElement("div");
    info.className = "member-info";

    const bioParagraphs = m.bio ? m.bio.split("\n").filter(Boolean) : [];

    if (bioParagraphs.length > 0) {
        const p = document.createElement("p");
        p.className = "member-bio";
        p.textContent = bioParagraphs[0];
        info.appendChild(p);
    }

    bodyRow.appendChild(info);
    article.appendChild(bodyRow);

    // extra bio paragraphs: full-width below the photo row
    bioParagraphs.slice(1).forEach(para => {
        const p = document.createElement("p");
        p.className = "member-bio member-bio-full";
        p.textContent = para;
        article.appendChild(p);
    });

    // ── career list ───────────────────────────────────────────────────────────
    if (career.length) {
        const ul = document.createElement("ul");
        ul.className = "member-career";
        career.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            ul.appendChild(li);
        });
        article.appendChild(ul);
    }

    // ── social links ──────────────────────────────────────────────────────────
    if (links.length) {
        const linksDiv = document.createElement("div");
        linksDiv.className = "member-links";
        links.forEach(lk => {
            if (!lk.label || !lk.url) return;
            const a = document.createElement("a");
            a.href = lk.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.className = "tag-link";
            a.textContent = lk.label;
            if (lk.color) a.style.background = lk.color;
            linksDiv.appendChild(a);
        });
        article.appendChild(linksDiv);
    }

    return article;
}

// ─── load & render page ───────────────────────────────────────────────────────
async function loadMembers() {
    try {
        const res = await fetch(apiUrl("/api/members/public"));
        if (!res.ok) throw new Error("Failed to load members");
        const members = await res.json();

        const grouped = {};
        SECTIONS.forEach(s => { grouped[s.id] = []; });
        members.forEach(m => {
            const sec = m.section || "researchers";
            (grouped[sec] || grouped["researchers"]).push(m);
        });

        SECTIONS.forEach(({ id }) => {
            const sec = document.getElementById(id);
            if (!sec) return;

            const heading = sec.querySelector("h2").cloneNode(true);
            sec.innerHTML = "";
            sec.appendChild(heading);

            if (adminToken) {
                const addBtn = document.createElement("button");
                addBtn.type = "button";
                addBtn.className = "mbtn mbtn-add";
                addBtn.textContent = "+ Add Member";
                addBtn.addEventListener("click", () => openAddModal(id));
                sec.appendChild(addBtn);
            }

            const list = grouped[id] || [];
            if (list.length === 0) {
                const empty = document.createElement("p");
                empty.className = "member-empty";
                empty.textContent = adminToken
                    ? 'No members yet. Click "+ Add Member" to add one.'
                    : "No members yet.";
                sec.appendChild(empty);
            } else {
                list.forEach(m => sec.appendChild(renderMemberCard(m)));
            }
        });
    } catch (err) {
        console.error("loadMembers:", err);
    }
}

function openModal() {
    const modal = document.getElementById("memberModal");
    if (modal) modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("memberModal");
    if (modal) modal.style.display = "none";
}

function buildLinkRow(lk = {}) {
    const container = document.getElementById("mfLinksContainer");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "mf-link-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "mf-link-label";
    labelInput.placeholder = "Label";
    labelInput.value = lk.label || "";
    labelInput.setAttribute("list", "linkPresetList");

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "mf-link-url";
    urlInput.placeholder = "https://...";
    urlInput.value = lk.url || "";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "mf-link-color";
    colorInput.value = lk.color || "#1565c0";

    labelInput.addEventListener("change", () => {
        const preset = LINK_PRESETS.find(
            p => p.label.toLowerCase() === labelInput.value.toLowerCase()
        );
        if (preset) colorInput.value = preset.color;
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mf-link-remove";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(labelInput);
    row.appendChild(urlInput);
    row.appendChild(colorInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

function readLinksFromForm() {
    const rows = document.querySelectorAll(".mf-link-row");
    const result = [];

    rows.forEach(row => {
        const label = row.querySelector(".mf-link-label").value.trim();
        const url = row.querySelector(".mf-link-url").value.trim();
        const color = row.querySelector(".mf-link-color").value;
        if (label && url) result.push({ label, url, color });
    });

    return result;
}

async function uploadSelectedPhoto() {
    const fileInput = document.getElementById("mfPhotoFile");
    const uploadBtn = document.getElementById("mfUploadPhotoBtn");
    const status = document.getElementById("mfPhotoUploadStatus");
    const photoAssetIdInput = document.getElementById("mfPhotoAssetId");

    if (!fileInput || !uploadBtn || !photoAssetIdInput || !adminToken) return;

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        showToast("Please choose an image first", "error");
        return;
    }

    uploadBtn.disabled = true;
    if (status) status.textContent = "Uploading...";

    try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(apiUrl("/api/uploads/images"), {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${adminToken}`
            },
            body: formData
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Failed to upload image");

        photoAssetIdInput.value = data.id || "";
        if (status) status.textContent = "Upload successful";
        showToast("Photo uploaded successfully", "success");
    } catch (err) {
        if (status) status.textContent = "Upload failed";
        showToast(err.message || "Failed to upload image", "error");
    } finally {
        uploadBtn.disabled = false;
    }
}

function populateForm(m, options = {}) {
    const preserveSection = Boolean(options.preserveSection);
    const currentSection = document.getElementById("mfSection")?.value || "researchers";

    document.getElementById("mfUserId").value = m.member_id || "";
    document.getElementById("mfName").value = m.name || "";
    document.getElementById("mfPosition").value = m.position || "";
    document.getElementById("mfSection").value = preserveSection ? currentSection : (m.section || "researchers");
    document.getElementById("mfPhotoAssetId").value = m.photo_asset_id || "";
    const fileInput = document.getElementById("mfPhotoFile");
    if (fileInput) fileInput.value = "";
    const uploadStatus = document.getElementById("mfPhotoUploadStatus");
    if (uploadStatus) uploadStatus.textContent = "";
    document.getElementById("mfBio").value = m.bio || "";
    document.getElementById("mfCareer").value = safeArr(m.career).join("\n");

    const container = document.getElementById("mfLinksContainer");
    if (!container) return;
    container.innerHTML = "";

    const links = safeArr(m.links);
    links.forEach(lk => buildLinkRow(lk));
}

function setModalEditModeForSuggestion(member) {
    const modeInput = document.getElementById("mfMode");
    const titleEl = document.getElementById("mmodalTitle");
    const idInput = document.getElementById("mfUserId");
    const autoSwitchedInput = document.getElementById("mfAutoSwitchedToEdit");
    if (!modeInput || !titleEl || !idInput) return;

    modeInput.value = "edit";
    titleEl.textContent = "Edit Member";
    idInput.value = member.member_id || "";
    if (autoSwitchedInput) autoSwitchedInput.value = "1";
}

function maybeAutofillFromNameSuggestion() {
    const nameInput = document.getElementById("mfName");
    const modeInput = document.getElementById("mfMode");
    const autoSwitchedInput = document.getElementById("mfAutoSwitchedToEdit");
    const titleEl = document.getElementById("mmodalTitle");
    const idInput = document.getElementById("mfUserId");
    if (!nameInput || !modeInput) return;

    const matched = findSuggestedMemberByName(nameInput.value);
    if (!matched) {
        if (autoSwitchedInput?.value === "1") {
            modeInput.value = "add";
            if (titleEl) titleEl.textContent = "Add Member";
            if (idInput) idInput.value = "";
            autoSwitchedInput.value = "0";
        }
        return;
    }

    if (modeInput.value === "add" || autoSwitchedInput?.value === "1") {
        populateForm(matched, { preserveSection: true });
        setModalEditModeForSuggestion(matched);
    }
}

async function openEditModal(m) {
    document.getElementById("mmodalTitle").textContent = "Edit Member";
    document.getElementById("mfMode").value = "edit";
    const autoSwitchedInput = document.getElementById("mfAutoSwitchedToEdit");
    if (autoSwitchedInput) autoSwitchedInput.value = "0";

    const memberId = m.member_id;
    if (!memberId) {
        showToast("Missing member id", "error");
        return;
    }

    try {
        const res = await fetch(apiUrl(`/api/member-profiles/${memberId}`), {
            headers: { "Authorization": `Bearer ${adminToken}` },
        });
        const raw = await res.text();
        let data = {};
        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch {
                data = { message: raw };
            }
        }
        if (!res.ok) {
            throw new Error(data.message || `Failed to load member (HTTP ${res.status})`);
        }

        populateForm(data);
        openModal();
    } catch (err) {
        showToast(err.message, "error");
    }
}

function openAddModal(sectionId) {
    document.getElementById("mmodalTitle").textContent = "Add Member";
    document.getElementById("mfMode").value = "add";
    const autoSwitchedInput = document.getElementById("mfAutoSwitchedToEdit");
    if (autoSwitchedInput) autoSwitchedInput.value = "0";
    populateForm({ section: sectionId });
    openModal();
}

async function handleSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById("mfMode").value;
    const memberId = document.getElementById("mfUserId").value;
    const name = document.getElementById("mfName").value.trim();

    if (!name) {
        showToast("Name is required", "error");
        return;
    }

    const payload = {
        name,
        position: document.getElementById("mfPosition").value.trim(),
        section: document.getElementById("mfSection").value,
        photo_asset_id: document.getElementById("mfPhotoAssetId").value
            ? Number(document.getElementById("mfPhotoAssetId").value)
            : null,
        bio: document.getElementById("mfBio").value.trim(),
        career: document
            .getElementById("mfCareer")
            .value.split("\n")
            .map(s => s.trim())
            .filter(Boolean),
        links: readLinksFromForm(),
    };

    const submitBtn = document.getElementById("mmodalSubmit");
    submitBtn.disabled = true;

    try {
        if (mode === "add") {
            const res = await fetch(apiUrl("/api/member-profiles"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to add member");
            showToast("Member added");
        } else {
            const res = await fetch(apiUrl(`/api/member-profiles/${memberId}`), {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update member");
            showToast("Member updated");
        }

        closeModal();
        loadMembers();
    } catch (err) {
        showToast(err.message, "error");
    } finally {
        submitBtn.disabled = false;
    }
}

async function confirmDelete(m) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;

    try {
        const res = await fetch(apiUrl(`/api/member-profiles/${m.member_id}`), {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete member");
        showToast("Member removed from page");
        loadMembers();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ─── init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    loadMembers();

    if (!adminToken) return;
    document.getElementById("mmodalClose")?.addEventListener("click", closeModal);
    document.getElementById("mmodalCancel")?.addEventListener("click", closeModal);
    document.getElementById("memberModal")?.addEventListener("click", e => {
        if (e.target === document.getElementById("memberModal")) closeModal();
    });
    document.getElementById("addLinkBtn")?.addEventListener("click", () => buildLinkRow());
    document.getElementById("mfUploadPhotoBtn")?.addEventListener("click", uploadSelectedPhoto);
    document.getElementById("memberForm")?.addEventListener("submit", handleSubmit);

    const nameInput = document.getElementById("mfName");
    if (nameInput) {
        ensureMemberNamePool().then(() => updateNameSuggestions());
        nameInput.addEventListener("focus", async () => {
            await ensureMemberNamePool();
            updateNameSuggestions(nameInput.value);
        });
        nameInput.addEventListener("input", () => {
            updateNameSuggestions(nameInput.value);
            maybeAutofillFromNameSuggestion();
        });
        nameInput.addEventListener("change", maybeAutofillFromNameSuggestion);
    }
});
