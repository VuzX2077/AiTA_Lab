// ─── constants ────────────────────────────────────────────────────────────────
const SECTIONS = [
    { id: "director",     label: "Director" },
    { id: "researchers",  label: "Researchers" },
    { id: "undergraduate",label: "Undergraduate Research Assistants" },
    { id: "alumni",       label: "Alumni" },
    { id: "collaborators",label: "Collaborators" },
];

const LINK_PRESETS = [
    { label: "Personal Page",   color: "#1565c0" },
    { label: "ORCID",           color: "#a6ce39" },
    { label: "Google Scholar",  color: "#4285f4" },
    { label: "Scopus Author ID",color: "#e07b34" },
    { label: "Web of Science",  color: "#193e7c" },
    { label: "ResearchGate",    color: "#00b5a0" },
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
function getInitials(name) {
    return (name || "?").split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2);
}

function safeArr(v) {
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
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
    h3.textContent = m.name || "";
    nameRow.appendChild(h3);

    if (adminToken) {
        const acts = document.createElement("div");
        acts.className = "member-admin-btns";

        const editBtn = document.createElement("button");
        editBtn.className = "mbtn mbtn-edit";
        editBtn.textContent = "✏ Edit";
        editBtn.addEventListener("click", () => openEditModal(m));

        const delBtn = document.createElement("button");
        delBtn.className = "mbtn mbtn-delete";
        delBtn.textContent = "✕ Delete";
        delBtn.addEventListener("click", () => confirmDelete(m));

        acts.appendChild(editBtn);
        acts.appendChild(delBtn);
        nameRow.appendChild(acts);
    }

    article.appendChild(nameRow);

    // ── photo + bio row ───────────────────────────────────────────────────────
    const bodyRow = document.createElement("div");
    bodyRow.className = "member-body-row";

    // avatar
    const avatar = document.createElement("div");
    avatar.className = "member-avatar";
    if (m.photo_url) {
        const img = document.createElement("img");
        img.src = m.photo_url;
        img.alt = m.name || "";
        img.onerror = () => { img.remove(); avatar.textContent = getInitials(m.name); };
        avatar.appendChild(img);
    } else {
        avatar.textContent = getInitials(m.name);
    }
    bodyRow.appendChild(avatar);

    // info (position + bio)
    const info = document.createElement("div");
    info.className = "member-info";

    if (m.position) {
        const pos = document.createElement("p");
        pos.className = "member-position";
        pos.textContent = m.position;
        info.appendChild(pos);
    }

    if (m.bio) {
        m.bio.split("\n").filter(Boolean).forEach(para => {
            const p = document.createElement("p");
            p.className = "member-bio";
            p.textContent = para;
            info.appendChild(p);
        });
    }

    bodyRow.appendChild(info);
    article.appendChild(bodyRow);

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
        const res = await fetch("/api/members/public");
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

// ─── modal helpers ────────────────────────────────────────────────────────────
function openModal() { document.getElementById("memberModal").style.display = "flex"; }
function closeModal() { document.getElementById("memberModal").style.display = "none"; }

function buildLinkRow(lk = {}) {
    const container = document.getElementById("mfLinksContainer");
    const row = document.createElement("div");
    row.className = "mf-link-row";

    // label (datalist for quick preset selection)
    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "mf-link-label";
    labelInput.placeholder = "Label";
    labelInput.value = lk.label || "";
    labelInput.setAttribute("list", "linkPresetList");

    // url
    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "mf-link-url";
    urlInput.placeholder = "https://...";
    urlInput.value = lk.url || "";

    // color swatch
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "mf-link-color";
    colorInput.value = lk.color || "#1565c0";

    // auto-fill color from preset label
    labelInput.addEventListener("change", () => {
        const preset = LINK_PRESETS.find(p => p.label.toLowerCase() === labelInput.value.toLowerCase());
        if (preset) colorInput.value = preset.color;
    });

    // remove
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
        const url   = row.querySelector(".mf-link-url").value.trim();
        const color = row.querySelector(".mf-link-color").value;
        if (label && url) result.push({ label, url, color });
    });
    return result;
}

function populateForm(m) {
    document.getElementById("mfUserId").value   = m.user_id || "";
    document.getElementById("mfName").value     = m.name || "";
    document.getElementById("mfPosition").value = m.position || "";
    document.getElementById("mfSection").value  = m.section || "researchers";
    document.getElementById("mfPhoto").value    = m.photo_url || "";
    document.getElementById("mfBio").value      = m.bio || "";
    document.getElementById("mfCareer").value   = safeArr(m.career).join("\n");

    const cont = document.getElementById("mfLinksContainer");
    cont.innerHTML = "";
    safeArr(m.links).forEach(lk => buildLinkRow(lk));
}

function openEditModal(m) {
    document.getElementById("mmodalTitle").textContent = "Edit Member";
    document.getElementById("mfMode").value = "edit";
    document.getElementById("mfEmailRow").style.display = "none";
    document.getElementById("mfPasswordRow").style.display = "none";
    populateForm(m);
    openModal();
}

function openAddModal(sectionId) {
    document.getElementById("mmodalTitle").textContent = "Add Member";
    document.getElementById("mfMode").value = "add";
    document.getElementById("mfEmailRow").style.display = "block";
    document.getElementById("mfPasswordRow").style.display = "block";
    document.getElementById("mfEmail").value = "";
    document.getElementById("mfPassword").value = "";
    populateForm({ section: sectionId });
    openModal();
}

// ─── form submit ──────────────────────────────────────────────────────────────
async function handleSubmit(e) {
    e.preventDefault();
    const mode   = document.getElementById("mfMode").value;
    const userId = document.getElementById("mfUserId").value;
    const name   = document.getElementById("mfName").value.trim();

    if (!name) { showToast("Name is required", "error"); return; }

    const payload = {
        name,
        position:  document.getElementById("mfPosition").value.trim(),
        section:   document.getElementById("mfSection").value,
        photo_url: document.getElementById("mfPhoto").value.trim(),
        bio:       document.getElementById("mfBio").value.trim(),
        career:    document.getElementById("mfCareer").value
                       .split("\n").map(s => s.trim()).filter(Boolean),
        links:     readLinksFromForm(),
    };

    const submitBtn = document.getElementById("mmodalSubmit");
    submitBtn.disabled = true;

    try {
        if (mode === "add") {
            const email    = document.getElementById("mfEmail").value.trim();
            const password = document.getElementById("mfPassword").value;
            if (!email || !password) {
                showToast("Email and password are required", "error");
                return;
            }
            Object.assign(payload, { email, password, role: "user" });

            const res = await fetch("/api/members", {
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
            const res = await fetch(`/api/members/${userId}`, {
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

// ─── delete ───────────────────────────────────────────────────────────────────
async function confirmDelete(m) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;
    try {
        const res = await fetch(`/api/members/${m.user_id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete member");
        showToast("Member deleted");
        loadMembers();
    } catch (err) {
        showToast(err.message, "error");
    }
}

// ─── init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    loadMembers();

    document.getElementById("mmodalClose").addEventListener("click", closeModal);
    document.getElementById("mmodalCancel").addEventListener("click", closeModal);
    document.getElementById("memberModal").addEventListener("click", e => {
        if (e.target === document.getElementById("memberModal")) closeModal();
    });

    document.getElementById("addLinkBtn").addEventListener("click", () => buildLinkRow());
    document.getElementById("memberForm").addEventListener("submit", handleSubmit);
});
