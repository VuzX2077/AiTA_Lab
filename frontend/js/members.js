// ─── constants ────────────────────────────────────────────────────────────────
const SECTIONS = [
    { id: "director",     label: "Director" },
    { id: "researchers",  label: "Researchers" },
    { id: "undergraduate",label: "Undergraduate Research Assistants" },
    { id: "alumni",       label: "Alumni" },
    { id: "collaborators",label: "Collaborators" },
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
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
            if (window.MemberAdmin?.openEditModal) window.MemberAdmin.openEditModal(m);
        });

        const delBtn = document.createElement("button");
        delBtn.className = "mbtn mbtn-delete";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => {
            if (window.MemberAdmin?.confirmDelete) window.MemberAdmin.confirmDelete(m);
        });

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
                addBtn.addEventListener("click", () => {
                    if (window.MemberAdmin?.openAddModal) window.MemberAdmin.openAddModal(id);
                });
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

// ─── init ─────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    loadMembers();
});

window.MemberPage = {
    showToast,
    safeArr,
    loadMembers,
    adminToken,
};
