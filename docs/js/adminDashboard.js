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

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
        return null;
    }
}

const user = parseJwt(token);
const currentAdminId = user ? Number(user.id) : null;

const sidebarLinks = document.querySelectorAll(".sidebar-link[data-target]");
const adminPanels = document.querySelectorAll(".admin-panel");
const activityLogs = [];
let seminarItemsCache = [];
let seminarAdminFiltersBound = false;
let publicationItemsCache = [];
let publicationSearchEventsBound = false;
let memberItemsCache = [];
let memberSearchEventsBound = false;
let homeNewsItemsCache = [];
let lecturerItemsCache = [];
let homepageContentState = null;
let currentProfile = null;
let currentPublicPage = null;
const PUBLIC_PAGE_LINK_PRESETS = [
    { label: "Personal Page", color: "#1565c0" },
    { label: "ORCID", color: "#a6ce39" },
    { label: "Google Scholar", color: "#4285f4" },
    { label: "Scopus Author ID", color: "#e07b34" },
    { label: "Web of Science", color: "#193e7c" },
    { label: "ResearchGate", color: "#00b5a0" }
];
let socialLinkIconPresets = PUBLIC_PAGE_LINK_PRESETS.map((item) => ({
    label: item.label,
    color: item.color,
    icon_asset_id: null,
    icon_url: ""
}));
const statsState = {
    totalPublications: 0,
    pendingPublications: 0,
    approvedPublications: 0,
    rejectedPublications: 0,
    totalMembers: 0,
    activeResearchers: 0
};

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

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = String(value);
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isValidHttpUrl(value) {
    if (!value || typeof value !== "string") {
        return false;
    }

    try {
        const parsed = new URL(value.trim());
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (error) {
        return false;
    }
}

function toNewsSlug(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

function getNewsDetailHref(news) {
    const id = Number(news && typeof news === "object" ? news.id : news);
    const title = news && typeof news === "object" ? news.title : "";
    const slug = toNewsSlug(title);

    if (slug && Number.isInteger(id) && id > 0) {
        return `/${encodeURIComponent(`${slug}-${id}`)}`;
    }

    if (slug) {
        return `/${encodeURIComponent(slug)}`;
    }

    if (Number.isInteger(id) && id > 0) {
        return `/newsDetail?id=${id}`;
    }

    return "/newsDetail";
}

function setBar(id, labelId, value, total) {
    const element = document.getElementById(id);
    const labelElement = document.getElementById(labelId);
    const percent = total > 0 ? Math.round((value / total) * 100) : 0;

    if (element) {
        element.style.width = `${percent}%`;
    }

    if (labelElement) {
        labelElement.textContent = `${percent}%`;
    }
}

function syncOverviewStats() {
    setText("overviewTotalPublications", statsState.totalPublications);
    setText("overviewPendingPublications", statsState.pendingPublications);
    setText("overviewApprovedPublications", statsState.approvedPublications);
    setText("overviewTotalMembers", statsState.totalMembers);
    setText("overviewActiveResearchers", statsState.activeResearchers);

    setBar("approvedBar", "approvedBarLabel", statsState.approvedPublications, statsState.totalPublications);
    setBar("pendingBar", "pendingBarLabel", statsState.pendingPublications, statsState.totalPublications);
    setBar("rejectedBar", "rejectedBarLabel", statsState.rejectedPublications, statsState.totalPublications);
}

function showSection(sectionId) {
    adminPanels.forEach((panel) => {
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

function addActivityLog(message) {
    const timestamp = new Date().toLocaleString();
    activityLogs.unshift(`${timestamp} - ${message}`);

    const list = document.getElementById("activityLogList");
    if (!list) {
        return;
    }

    if (activityLogs.length === 0) {
        list.innerHTML = "<p>No activity yet.</p>";
        return;
    }

    list.innerHTML = activityLogs.map((item) => `<p>${item}</p>`).join("");
}

if (!user || !user.exp || user.exp * 1000 <= Date.now()) {
    clearAuth();
    isAuthValid = false;
    window.location.href = "/login";
} else if (user.role !== "admin") {
    isAuthValid = false;
    window.location.href = "/memberDashboard";
}

async function request(path, options = {}) {
    let response;

    try {
        response = await fetch(getApiUrl(path), { 
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token,
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error("Cannot connect to server.");
    }

    const rawText = await response.text();
    let data = {};

    if (rawText) {
        try {
            data = JSON.parse(rawText);
        } catch (error) {
            data = { message: rawText };
        }
    }

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            clearAuth();
            window.location.href = "/login";
        }

        throw new Error(data.message || response.statusText || "Request failed");
    }

    return data;
}

function getPendingUploadAssetId(inputElement) {
    if (!inputElement || !inputElement.dataset) {
        return null;
    }

    const parsed = Number(inputElement.dataset.pendingUploadAssetId || "");
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function setPendingUploadAssetId(inputElement, assetId) {
    if (!inputElement || !inputElement.dataset) {
        return;
    }

    const parsed = Number(assetId);
    if (Number.isInteger(parsed) && parsed > 0) {
        inputElement.dataset.pendingUploadAssetId = String(parsed);
    } else {
        delete inputElement.dataset.pendingUploadAssetId;
    }
}

async function deleteUploadedImageAssetById(assetId) {
    const normalizedId = Number(assetId);
    if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
        return false;
    }

    try {
        const response = await fetch(getApiUrl(`/api/uploads/images/${normalizedId}`), {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        if (response.ok || response.status === 404 || response.status === 409) {
            return true;
        }

        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to delete temporary image");
    } catch (error) {
        console.error("Temporary image cleanup failed:", error);
        return false;
    }
}

async function cleanupPendingUploadAsset(inputElement) {
    const pendingAssetId = getPendingUploadAssetId(inputElement);
    if (!pendingAssetId) {
        return true;
    }

    const deleted = await deleteUploadedImageAssetById(pendingAssetId);
    if (deleted) {
        setPendingUploadAssetId(inputElement, null);
        return true;
    }

    return false;
}

async function loadPendingPublications() {
    try {
        const data = await request("/api/publications/pending", { method: "GET" });
        const list = document.getElementById("pendingPublicationList");

        if (data.length === 0) {
            list.innerHTML = "<p>No pending publications.</p>";
            statsState.pendingPublications = 0;
            syncOverviewStats();
            return;
        }

        list.innerHTML = data.map(pub => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong></p>
                    <p><small>Link: ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer">Open publication</a>` : "N/A"}</small></p>
                    <p><small>Authors: ${pub.authors || "N/A"}</small></p>
                    <p><small>Journal: ${pub.journal || "N/A"}</small></p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p><small>DOI: ${pub.doi || "N/A"}</small></p>
                    <p>${pub.description}</p>
                    <p><small>By: ${pub.owner_email || "Unknown"}</small></p>
                </div>
                <div class="pub-btn-group">
                    <button class="pub-action-btn approve-btn" onclick="approvePublication(${pub.id})">Approve</button>
                    <button class="pub-action-btn reject-btn" onclick="rejectPublication(${pub.id})">Reject</button>
                    <button class="pub-action-btn delete-btn" onclick="deletePublication(${pub.id})">Delete</button>
                </div>
            </div>
        `).join("");

        statsState.pendingPublications = data.length;
        syncOverviewStats();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function loadAllPublications() {
    try {
        const data = await request("/api/publications", { method: "GET" });
        publicationItemsCache = data;

        bindPublicationSearchEvents();
        renderPublicationSections();

        statsState.totalPublications = data.length;
        statsState.approvedPublications = data.filter((pub) => String(pub.status || "").toLowerCase() === "approved").length;
        statsState.rejectedPublications = data.filter((pub) => String(pub.status || "").toLowerCase() === "rejected").length;
        syncOverviewStats();
    } catch (error) {
        showToast(error.message, "error");
    }
}

function getPublicationSearchKeyword(inputId) {
    const input = document.getElementById(inputId);
    return String(input ? input.value : "").trim().toLowerCase();
}

function filterPublicationsByKeyword(rows, keyword) {
    if (!keyword) {
        return rows;
    }

    return rows.filter((pub) => {
        const haystack = [
            pub.title,
            pub.authors,
            pub.journal,
            pub.doi,
            pub.owner_email,
            pub.year,
            pub.status
        ]
            .map((value) => String(value || "").toLowerCase())
            .join(" ");

        return haystack.includes(keyword);
    });
}

function renderPublicationList(listElementId, rows, emptyMessage) {
    const list = document.getElementById(listElementId);
    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = `<p>${emptyMessage}</p>`;
        return;
    }

    const publicationTemplate = (pub) => `
        <div>
            <div>
                <p><strong>${pub.title}</strong> (${pub.status})</p>
                <p><small>Link: ${pub.link ? `<a href="${pub.link}" target="_blank" rel="noopener noreferrer">Open publication</a>` : "N/A"}</small></p>
                <p><small>Authors: ${pub.authors || "N/A"}</small></p>
                <p><small>Journal: ${pub.journal || "N/A"}</small></p>
                <p><small>Year: ${pub.year || "N/A"}</small></p>
                <p><small>DOI: ${pub.doi || "N/A"}</small></p>
                <p><small>By: ${pub.owner_email || "Unknown"}</small></p>
            </div>
            <button class="pub-action-btn delete-btn" onclick="deletePublication(${pub.id})">Delete</button>
        </div>
    `;

    list.innerHTML = rows.map(publicationTemplate).join("");
}

function renderPublicationSections() {
    const approvedRows = publicationItemsCache.filter((pub) => String(pub.status || "").toLowerCase() === "approved");
    const rejectedRows = publicationItemsCache.filter((pub) => String(pub.status || "").toLowerCase() === "rejected");

    const allFiltered = filterPublicationsByKeyword(publicationItemsCache, getPublicationSearchKeyword("allPublicationSearchInput"));
    const approvedFiltered = filterPublicationsByKeyword(approvedRows, getPublicationSearchKeyword("approvedPublicationSearchInput"));
    const rejectedFiltered = filterPublicationsByKeyword(rejectedRows, getPublicationSearchKeyword("rejectedPublicationSearchInput"));

    renderPublicationList("publicationList", allFiltered, publicationItemsCache.length ? "No publications match your search." : "No publications.");
    renderPublicationList("approvedPublicationList", approvedFiltered, approvedRows.length ? "No approved publications match your search." : "No approved publications.");
    renderPublicationList("rejectedPublicationList", rejectedFiltered, rejectedRows.length ? "No rejected publications match your search." : "No rejected publications.");
}

function bindPublicationSearchEvents() {
    if (publicationSearchEventsBound) {
        return;
    }

    const ids = [
        "allPublicationSearchInput",
        "approvedPublicationSearchInput",
        "rejectedPublicationSearchInput"
    ];

    ids.forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", renderPublicationSections);
        }
    });

    publicationSearchEventsBound = true;
}

function getMemberSearchKeyword(inputId) {
    const input = document.getElementById(inputId);
    return String(input ? input.value : "").trim().toLowerCase();
}

function filterMembersByKeyword(rows, keyword) {
    if (!keyword) {
        return rows;
    }

    return rows.filter((member) => {
        const haystack = [
            member.email,
            member.name,
            member.role,
            member.position
        ]
            .map((value) => String(value || "").toLowerCase())
            .join(" ");

        return haystack.includes(keyword);
    });
}

function bindRoleActions() {
    const rolesList = document.getElementById("rolesMemberList");
    if (!rolesList) {
        return;
    }

    rolesList.querySelectorAll(".save-role-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const userId = Number(button.dataset.id);
            const memberEmail = button.dataset.email;
            const currentRole = button.dataset.currentRole;
            const roleSelect = document.getElementById(`roleSelect-${userId}`);
            const nextRole = roleSelect ? roleSelect.value : "user";

            if (userId === currentAdminId) {
                alert("You cannot change your own role.");
                return;
            }

            if (nextRole === currentRole) {
                alert("Role is unchanged.");
                return;
            }

            await updateMemberRole(userId, nextRole, memberEmail);
        });
    });
}

function renderMembersList(rows, totalRows) {
    const list = document.getElementById("memberList");
    if (!list) {
        return;
    }

    if (!totalRows.length) {
        list.innerHTML = "<p>No members.</p>";
        return;
    }

    if (!rows.length) {
        list.innerHTML = "<p>No members match your search.</p>";
        return;
    }

    list.innerHTML = rows.map(member => `
        <div>
            <div>
                <p><strong>${escapeHtml(member.email || "N/A")}</strong></p>
                <p><small>Name: ${escapeHtml(member.name || "N/A")}</small></p>
                <p><small>Role: ${escapeHtml(member.role || "N/A")}</small></p>
                <p><small>Position: ${escapeHtml(member.position || "N/A")}</small></p>
            </div>
            <button onclick="deleteMember(${member.user_id})">Delete</button>
        </div>
    `).join("");
}

function renderRolesMembersList(rows, totalRows) {
    const rolesList = document.getElementById("rolesMemberList");
    if (!rolesList) {
        return;
    }

    if (!totalRows.length) {
        rolesList.innerHTML = "<p>No members found.</p>";
        return;
    }

    if (!rows.length) {
        rolesList.innerHTML = "<p>No members match your search.</p>";
        return;
    }

    rolesList.innerHTML = rows.map(member => `
        <div>
            <p><strong>${escapeHtml(member.email || "N/A")}</strong></p>
            <p><small>Name: ${escapeHtml(member.name || "N/A")}</small></p>
            <p><small>Current Role: ${escapeHtml(member.role || "N/A")}</small></p>
            <p><small>Position: ${escapeHtml(member.position || "N/A")}</small></p>
            <div class="roles-actions">
                <select id="roleSelect-${member.user_id}" ${Number(member.user_id) === currentAdminId ? "disabled" : ""}>
                    <option value="user" ${member.role === "user" ? "selected" : ""}>User</option>
                    <option value="admin" ${member.role === "admin" ? "selected" : ""}>Admin</option>
                </select>
                <button class="save-role-btn" data-id="${member.user_id}" data-email="${escapeHtml(member.email || "")}" data-current-role="${escapeHtml(member.role || "user")}" ${Number(member.user_id) === currentAdminId ? "disabled" : ""}>
                    ${Number(member.user_id) === currentAdminId ? "Protected" : "Save Role"}
                </button>
            </div>
            ${Number(member.user_id) === currentAdminId ? '<p><small>You cannot change your own role.</small></p>' : ""}
        </div>
    `).join("");

    bindRoleActions();
}

function renderMemberSections() {
    const allMembersFiltered = filterMembersByKeyword(memberItemsCache, getMemberSearchKeyword("allMembersSearchInput"));
    const rolesMembersFiltered = filterMembersByKeyword(memberItemsCache, getMemberSearchKeyword("rolesMembersSearchInput"));

    renderMembersList(allMembersFiltered, memberItemsCache);
    renderRolesMembersList(rolesMembersFiltered, memberItemsCache);
}

function bindMemberSearchEvents() {
    if (memberSearchEventsBound) {
        return;
    }

    const ids = ["allMembersSearchInput", "rolesMembersSearchInput"];

    ids.forEach((id) => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener("input", renderMemberSections);
        }
    });

    memberSearchEventsBound = true;
}

function formatDateForInput(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const isoDatePart = raw.split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) {
        return "";
    }

    return isoDatePart;
}

function formatDateForDisplay(value) {
    const inputDate = formatDateForInput(value);
    if (!inputDate) {
        return "N/A";
    }

    const [yyyy, mm, dd] = inputDate.split("-");
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthIndex = Number(mm) - 1;
    const dayNumber = Number(dd);

    if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(dayNumber)) {
        return "N/A";
    }

    return `${monthNames[monthIndex]} ${dayNumber}, ${yyyy}`;
}

function resetSeminarForm() {
    const form = document.getElementById("seminarForm");
    const editId = document.getElementById("seminarEditId");
    const saveBtn = document.getElementById("seminarSaveBtn");
    const cancelBtn = document.getElementById("seminarCancelEditBtn");

    if (form) {
        form.reset();
    }

    if (editId) {
        editId.value = "";
    }

    if (saveBtn) {
        saveBtn.textContent = "Save Seminar";
    }

    if (cancelBtn) {
        cancelBtn.hidden = true;
    }
}

function startEditSeminar(item) {
    const editId = document.getElementById("seminarEditId");
    const seminarDate = document.getElementById("seminarDate");
    const seminarStartTime = document.getElementById("seminarStartTime");
    const seminarEndTime = document.getElementById("seminarEndTime");
    const seminarMemberName = document.getElementById("seminarMemberName");
    const seminarTitle = document.getElementById("seminarTitle");
    const seminarPaperLink = document.getElementById("seminarPaperLink");
    const saveBtn = document.getElementById("seminarSaveBtn");
    const cancelBtn = document.getElementById("seminarCancelEditBtn");

    if (!editId || !seminarDate || !seminarStartTime || !seminarEndTime || !seminarMemberName || !seminarTitle || !seminarPaperLink) {
        return;
    }

    editId.value = String(item.id);
    seminarDate.value = formatDateForInput(item.seminar_date);
    seminarStartTime.value = item.start_time || "";
    seminarEndTime.value = item.end_time || "";
    seminarMemberName.value = item.member_name || "";
    seminarTitle.value = item.title || "";
    seminarPaperLink.value = item.paper_link || "";

    if (saveBtn) {
        saveBtn.textContent = "Update Seminar";
    }

    if (cancelBtn) {
        cancelBtn.hidden = false;
    }

    showSection("seminarManagementSection");
}

function applyAdminSeminarFilters(rows) {
    const searchInput = document.getElementById("seminarAdminSearchInput");
    const dateInput = document.getElementById("seminarAdminDateFilter");

    const keyword = String(searchInput ? searchInput.value : "").trim().toLowerCase();
    const selectedDate = formatDateForInput(dateInput ? dateInput.value : "");

    return rows.filter((item) => {
        const memberName = String(item.member_name || "").toLowerCase();
        const title = String(item.title || "").toLowerCase();
        const itemDate = formatDateForInput(item.seminar_date);

        const matchesKeyword = !keyword || memberName.includes(keyword) || title.includes(keyword);
        const matchesDate = !selectedDate || itemDate === selectedDate;

        return matchesKeyword && matchesDate;
    });
}

function renderSeminarsAdmin(rows) {
    const list = document.getElementById("seminarList");
    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = "<p class=\"admin-note\">No seminars match current filters.</p>";
        return;
    }

    list.innerHTML = rows.map((item) => `
        <div class="seminar-admin-item">
            <div>
                <p><strong>${escapeHtml(item.title || "Untitled")}</strong></p>
                <p><small>${escapeHtml(formatDateForDisplay(item.seminar_date))} | ${escapeHtml(item.start_time || "N/A")} - ${escapeHtml(item.end_time || "N/A")}</small></p>
                <p><small>Member: ${escapeHtml(item.member_name || "N/A")}</small></p>
                <p><small>Paper Link: ${item.paper_link ? `<a href="${escapeHtml(item.paper_link)}" target="_blank" rel="noopener noreferrer">Open link</a>` : "N/A"}</small></p>
            </div>
            <div class="seminar-admin-actions">
                <button class="seminar-edit-btn" data-id="${item.id}">Edit</button>
                <button class="seminar-delete-btn" data-id="${item.id}">Delete</button>
            </div>
        </div>
    `).join("");

    list.querySelectorAll(".seminar-edit-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            const selected = seminarItemsCache.find((row) => Number(row.id) === id);
            if (selected) {
                startEditSeminar(selected);
            }
        });
    });

    list.querySelectorAll(".seminar-delete-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            if (Number.isInteger(id)) {
                deleteSeminarEntry(id);
            }
        });
    });
}

function bindAdminSeminarFilterEvents() {
    if (seminarAdminFiltersBound) {
        return;
    }

    const searchInput = document.getElementById("seminarAdminSearchInput");
    const dateInput = document.getElementById("seminarAdminDateFilter");
    const resetBtn = document.getElementById("seminarAdminFilterResetBtn");

    const rerender = () => {
        const filtered = applyAdminSeminarFilters(seminarItemsCache);
        renderSeminarsAdmin(filtered);
    };

    if (searchInput) {
        searchInput.addEventListener("input", rerender);
    }

    if (dateInput) {
        dateInput.addEventListener("change", rerender);
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) {
                searchInput.value = "";
            }
            if (dateInput) {
                dateInput.value = "";
            }
            rerender();
        });
    }

    seminarAdminFiltersBound = true;
}

async function loadSeminarsAdmin() {
    const list = document.getElementById("seminarList");
    if (!list) {
        return;
    }

    try {
        const data = await request("/api/seminars", { method: "GET" });
        seminarItemsCache = data;
        bindAdminSeminarFilterEvents();
        renderSeminarsAdmin(applyAdminSeminarFilters(data));
    } catch (error) {
        showToast(error.message, "error");
        list.innerHTML = `<p class="admin-note">${escapeHtml(error.message)}</p>`;
    }
}

async function saveSeminar(event) {
    event.preventDefault();

    const seminarEditId = document.getElementById("seminarEditId");
    const seminarDate = document.getElementById("seminarDate");
    const seminarStartTime = document.getElementById("seminarStartTime");
    const seminarEndTime = document.getElementById("seminarEndTime");
    const seminarMemberName = document.getElementById("seminarMemberName");
    const seminarTitle = document.getElementById("seminarTitle");
    const seminarPaperLink = document.getElementById("seminarPaperLink");

    if (!seminarEditId || !seminarDate || !seminarStartTime || !seminarEndTime || !seminarMemberName || !seminarTitle || !seminarPaperLink) {
        return;
    }

    const payload = {
        seminarDate: seminarDate.value.trim(),
        startTime: seminarStartTime.value.trim(),
        endTime: seminarEndTime.value.trim(),
        memberName: seminarMemberName.value.trim(),
        title: seminarTitle.value.trim(),
        paperLink: seminarPaperLink.value.trim()
    };

    const isEdit = Boolean(seminarEditId.value);
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/seminars/${seminarEditId.value}` : "/api/seminars";

    try {
        await request(url, {
            method,
            body: JSON.stringify(payload)
        });

        resetSeminarForm();
        await loadSeminarsAdmin();
        addActivityLog(`${isEdit ? "Updated" : "Created"} seminar entry`);
        showToast(`Seminar ${isEdit ? "updated" : "created"} successfully`, "success");
    } catch (error) {
        showToast(`Could not save seminar: ${error.message}`, "error");
    }
}

async function deleteSeminarEntry(id) {
    try {
        await request(`/api/seminars/${id}`, { method: "DELETE" });
        await loadSeminarsAdmin();
        addActivityLog(`Deleted seminar #${id}`);
        showToast("Seminar deleted successfully", "success");
    } catch (error) {
        showToast(`Could not delete seminar: ${error.message}`, "error");
    }
}

function parseSubjectEntries(value) {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
}

function getLecturerMemberOptionsMarkup(selectedMemberId) {
    const selectedValue = Number.isInteger(Number(selectedMemberId)) ? Number(selectedMemberId) : null;
    const baseOption = '<option value="">Not linked</option>';

    const memberOptions = memberItemsCache
        .filter((member) => Number.isInteger(Number(member && member.member_id)))
        .map((member) => {
            const memberId = Number(member.member_id);
            const labelName = escapeHtml(member.name || member.email || `Member #${memberId}`);
            const labelEmail = member.email ? ` (${escapeHtml(member.email)})` : "";
            const selected = selectedValue === memberId ? " selected" : "";
            return `<option value="${memberId}"${selected}>${labelName}${labelEmail}</option>`;
        })
        .join("");

    return `${baseOption}${memberOptions}`;
}

function refreshLecturerMemberOptions(selectedMemberId) {
    const select = document.getElementById("lecturerMemberId");
    if (!select) {
        return;
    }

    select.innerHTML = getLecturerMemberOptionsMarkup(selectedMemberId);
}

function resetLecturerForm() {
    const form = document.getElementById("lecturerForm");
    const editId = document.getElementById("lecturerEditId");
    const photoAssetId = document.getElementById("lecturerPhotoAssetId");
    const preview = document.getElementById("lecturerPhotoPreview");
    const status = document.getElementById("lecturerPhotoUploadStatus");
    const saveBtn = document.getElementById("lecturerSaveBtn");
    const cancelBtn = document.getElementById("lecturerCancelEditBtn");
    const displayOrderInput = document.getElementById("lecturerDisplayOrder");
    const isPublishedInput = document.getElementById("lecturerIsPublished");
    const memberIdSelect = document.getElementById("lecturerMemberId");

    if (form) {
        form.reset();
    }

    if (editId) {
        editId.value = "";
    }

    if (photoAssetId) {
        void cleanupPendingUploadAsset(photoAssetId);
        photoAssetId.value = "";
        setPendingUploadAssetId(photoAssetId, null);
    }

    if (preview) {
        preview.hidden = true;
        preview.removeAttribute("src");
    }

    if (status) {
        status.textContent = "";
    }

    if (saveBtn) {
        saveBtn.textContent = "Save Lecturer";
    }

    if (cancelBtn) {
        cancelBtn.hidden = true;
    }

    if (displayOrderInput) {
        displayOrderInput.value = "0";
    }

    if (isPublishedInput) {
        isPublishedInput.checked = true;
    }

    if (memberIdSelect) {
        refreshLecturerMemberOptions(null);
    }
}

function startEditLecturer(item) {
    const editId = document.getElementById("lecturerEditId");
    const photoAssetId = document.getElementById("lecturerPhotoAssetId");
    const nameInput = document.getElementById("lecturerName");
    const specializationInput = document.getElementById("lecturerSpecialization");
    const subjectsInput = document.getElementById("lecturerSubjects");
    const bioInput = document.getElementById("lecturerBio");
    const displayOrderInput = document.getElementById("lecturerDisplayOrder");
    const isPublishedInput = document.getElementById("lecturerIsPublished");
    const memberIdSelect = document.getElementById("lecturerMemberId");
    const preview = document.getElementById("lecturerPhotoPreview");
    const status = document.getElementById("lecturerPhotoUploadStatus");
    const saveBtn = document.getElementById("lecturerSaveBtn");
    const cancelBtn = document.getElementById("lecturerCancelEditBtn");

    if (!editId || !nameInput || !specializationInput || !subjectsInput || !bioInput || !displayOrderInput || !isPublishedInput) {
        return;
    }

    refreshLecturerMemberOptions(item.member_id);

    editId.value = String(item.id);
    if (photoAssetId) {
        photoAssetId.value = item.photo_asset_id ? String(item.photo_asset_id) : "";
        setPendingUploadAssetId(photoAssetId, null);
    }
    nameInput.value = item.name || "";
    specializationInput.value = item.specialization || "";
    subjectsInput.value = Array.isArray(item.teaching_subjects) ? item.teaching_subjects.join("\n") : "";
    bioInput.value = item.bio || "";
    displayOrderInput.value = Number.isInteger(Number(item.display_order)) ? String(item.display_order) : "0";
    isPublishedInput.checked = Boolean(item.is_published);
    if (memberIdSelect) {
        memberIdSelect.value = item.member_id ? String(item.member_id) : "";
    }

    if (preview) {
        if (item.photo_url) {
            preview.src = item.photo_url;
            preview.hidden = false;
        } else {
            preview.hidden = true;
            preview.removeAttribute("src");
        }
    }

    if (status) {
        status.textContent = "";
    }

    if (saveBtn) {
        saveBtn.textContent = "Update Lecturer";
    }

    if (cancelBtn) {
        cancelBtn.hidden = false;
    }

    showSection("lecturerManagementSection");
}

function renderLecturersAdmin(rows) {
    const list = document.getElementById("lecturerList");
    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = "<p class=\"admin-note\">No lecturers available.</p>";
        return;
    }

    list.innerHTML = rows.map((item) => {
        const subjects = Array.isArray(item.teaching_subjects) ? item.teaching_subjects : [];
        const hasPhoto = Boolean(item.photo_url);

        return `
            <div class="home-news-admin-item lecturer-admin-item">
                <div class="lecturer-admin-media ${hasPhoto ? "has-photo" : "no-photo"}">
                    ${hasPhoto
                        ? `<img class="home-news-admin-thumb lecturer-admin-thumb" src="${escapeHtml(item.photo_url || "")}" alt="${escapeHtml(item.name || "Lecturer")}">`
                        : `<span class="lecturer-admin-no-photo" aria-hidden="true">No Photo</span>`}
                </div>
                <div class="lecturer-admin-content">
                    <p><strong>${escapeHtml(item.name || "Unknown")}</strong></p>
                    <p><small>Specialization: ${escapeHtml(item.specialization || "N/A")}</small></p>
                    <p><small>Linked member id: ${item.member_id ? escapeHtml(item.member_id) : "Not linked"}</small></p>
                    <p><small>Display order: ${escapeHtml(item.display_order || 0)}</small></p>
                    <p><small>Published: ${item.is_published ? "Yes" : "No"}</small></p>
                    <p><small>Subjects: ${subjects.length ? escapeHtml(subjects.join(", ")) : "N/A"}</small></p>
                    <p>${escapeHtml(item.bio || "")}</p>
                </div>
                <div class="home-news-admin-actions">
                    <button class="home-news-edit-btn lecturer-edit-btn" data-id="${item.id}">Edit</button>
                    <button class="home-news-delete-btn lecturer-delete-btn" data-id="${item.id}">Delete</button>
                </div>
            </div>
        `;
    }).join("");

    list.querySelectorAll(".lecturer-edit-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            const selected = lecturerItemsCache.find((row) => Number(row.id) === id);
            if (selected) {
                startEditLecturer(selected);
            }
        });
    });

    list.querySelectorAll(".lecturer-delete-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            if (Number.isInteger(id)) {
                deleteLecturerEntry(id);
            }
        });
    });
}

async function loadLecturersAdmin() {
    const list = document.getElementById("lecturerList");
    if (!list) {
        return;
    }

    try {
        const rows = await request("/api/admin/lecturers", { method: "GET" });
        lecturerItemsCache = Array.isArray(rows) ? rows : [];
        renderLecturersAdmin(lecturerItemsCache);
    } catch (error) {
        list.innerHTML = `<p class="admin-note">${escapeHtml(error.message || "Failed to load lecturers")}</p>`;
    }
}

async function uploadLecturerPhoto() {
    const fileInput = document.getElementById("lecturerPhotoFile");
    const photoAssetIdInput = document.getElementById("lecturerPhotoAssetId");
    const status = document.getElementById("lecturerPhotoUploadStatus");
    const preview = document.getElementById("lecturerPhotoPreview");
    const button = document.getElementById("uploadLecturerPhotoBtn");

    if (!fileInput || !photoAssetIdInput || !button) {
        return;
    }

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        showToast("Please choose an image first", "error");
        return;
    }

    button.disabled = true;
    if (status) {
        status.textContent = "Uploading...";
    }

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
        if (!response.ok) {
            throw new Error(data.message || "Failed to upload image");
        }

        await cleanupPendingUploadAsset(photoAssetIdInput);
        photoAssetIdInput.value = data.id;
        setPendingUploadAssetId(photoAssetIdInput, data.id);
        if (preview && data.url) {
            preview.src = data.url;
            preview.hidden = false;
        }
        if (status) {
            status.textContent = "Upload successful";
        }
        showToast("Lecturer photo uploaded", "success");
    } catch (error) {
        if (status) {
            status.textContent = "Upload failed";
        }
        showToast(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function saveLecturer(event) {
    event.preventDefault();

    const editId = document.getElementById("lecturerEditId");
    const photoAssetIdInput = document.getElementById("lecturerPhotoAssetId");
    const nameInput = document.getElementById("lecturerName");
    const specializationInput = document.getElementById("lecturerSpecialization");
    const subjectsInput = document.getElementById("lecturerSubjects");
    const bioInput = document.getElementById("lecturerBio");
    const displayOrderInput = document.getElementById("lecturerDisplayOrder");
    const isPublishedInput = document.getElementById("lecturerIsPublished");
    const memberIdSelect = document.getElementById("lecturerMemberId");

    if (!nameInput || !specializationInput || !subjectsInput || !bioInput || !displayOrderInput || !isPublishedInput) {
        return;
    }

    const payload = {
        name: nameInput.value.trim(),
        specialization: specializationInput.value.trim(),
        teaching_subjects: parseSubjectEntries(subjectsInput.value),
        bio: bioInput.value.trim(),
        member_id: memberIdSelect && memberIdSelect.value ? Number(memberIdSelect.value) : null,
        photo_asset_id: photoAssetIdInput && photoAssetIdInput.value ? Number(photoAssetIdInput.value) : null,
        display_order: Number(displayOrderInput.value || 0),
        is_published: Boolean(isPublishedInput.checked)
    };

    if (!payload.name) {
        showToast("Lecturer name is required", "error");
        return;
    }

    if (!payload.specialization) {
        showToast("Specialization is required", "error");
        return;
    }

    const isEdit = Boolean(editId && editId.value);
    const method = isEdit ? "PATCH" : "POST";
    const path = isEdit ? `/api/admin/lecturers/${editId.value}` : "/api/admin/lecturers";

    try {
        await request(path, {
            method,
            body: JSON.stringify(payload)
        });

        if (photoAssetIdInput) {
            setPendingUploadAssetId(photoAssetIdInput, null);
        }

        resetLecturerForm();
        await loadLecturersAdmin();
        addActivityLog(`${isEdit ? "Updated" : "Created"} lecturer ${payload.name}`);
        showToast(`Lecturer ${isEdit ? "updated" : "created"} successfully`, "success");
    } catch (error) {
        showToast(`Could not save lecturer: ${error.message}`, "error");
    }
}

async function deleteLecturerEntry(id) {
    try {
        await request(`/api/admin/lecturers/${id}`, { method: "DELETE" });
        await loadLecturersAdmin();
        addActivityLog(`Deleted lecturer #${id}`);
        showToast("Lecturer deleted successfully", "success");
    } catch (error) {
        showToast(`Could not delete lecturer: ${error.message}`, "error");
    }
}

function resetHomeNewsForm() {
    const form = document.getElementById("homeNewsForm");
    const editId = document.getElementById("homeNewsEditId");
    const imageAssetId = document.getElementById("homeNewsImageAssetId");
    const preview = document.getElementById("homeNewsImagePreview");
    const status = document.getElementById("homeNewsUploadStatus");
    const saveBtn = document.getElementById("homeNewsSaveBtn");
    const cancelBtn = document.getElementById("homeNewsCancelEditBtn");
    const publishDateInput = document.getElementById("homeNewsPublishedAt");
    const isPublishedInput = document.getElementById("homeNewsIsPublished");
    const tagInput = document.getElementById("homeNewsTag");

    if (form) {
        form.reset();
    }

    if (editId) {
        editId.value = "";
    }

    if (imageAssetId) {
        void cleanupPendingUploadAsset(imageAssetId);
        imageAssetId.value = "";
        setPendingUploadAssetId(imageAssetId, null);
    }

    if (preview) {
        preview.hidden = true;
        preview.removeAttribute("src");
    }

    if (status) {
        status.textContent = "";
    }

    if (saveBtn) {
        saveBtn.textContent = "Save Post";
    }

    if (cancelBtn) {
        cancelBtn.hidden = true;
    }

    if (publishDateInput) {
        publishDateInput.value = new Date().toISOString().slice(0, 10);
    }

    if (isPublishedInput) {
        isPublishedInput.checked = true;
    }

    if (tagInput) {
        tagInput.value = "NEWS";
    }
}

function startEditHomeNews(item) {
    const editId = document.getElementById("homeNewsEditId");
    const imageAssetId = document.getElementById("homeNewsImageAssetId");
    const titleInput = document.getElementById("homeNewsTitle");
    const summaryInput = document.getElementById("homeNewsSummary");
    const linkInput = document.getElementById("homeNewsLink");
    const tagInput = document.getElementById("homeNewsTag");
    const publishedAtInput = document.getElementById("homeNewsPublishedAt");
    const isPublishedInput = document.getElementById("homeNewsIsPublished");
    const preview = document.getElementById("homeNewsImagePreview");
    const status = document.getElementById("homeNewsUploadStatus");
    const saveBtn = document.getElementById("homeNewsSaveBtn");
    const cancelBtn = document.getElementById("homeNewsCancelEditBtn");

    if (!editId || !imageAssetId || !titleInput || !summaryInput || !publishedAtInput || !isPublishedInput || !tagInput) {
        return;
    }

    editId.value = String(item.id);
    imageAssetId.value = String(item.image_asset_id || "");
    setPendingUploadAssetId(imageAssetId, null);
    titleInput.value = item.title || "";
    summaryInput.value = item.summary || "";
    if (linkInput) {
        linkInput.value = item.link || "";
    }
    tagInput.value = item.tag || "NEWS";
    publishedAtInput.value = formatDateForInput(item.published_at) || new Date().toISOString().slice(0, 10);
    isPublishedInput.checked = Boolean(item.is_published);

    if (preview) {
        if (item.image_url) {
            preview.src = item.image_url;
            preview.hidden = false;
        } else {
            preview.hidden = true;
            preview.removeAttribute("src");
        }
    }

    if (status) {
        status.textContent = item.image_url ? "Image loaded from saved post" : "";
    }

    if (saveBtn) {
        saveBtn.textContent = "Update Post";
    }

    if (cancelBtn) {
        cancelBtn.hidden = false;
    }

    showSection("homeNewsSection");
}

function renderHomeNewsAdmin(rows) {
    const list = document.getElementById("homeNewsList");
    if (!list) {
        return;
    }

    if (!rows.length) {
        list.innerHTML = "<p class=\"admin-note\">No homepage posts yet.</p>";
        return;
    }

    list.innerHTML = rows.map((item) => `
        <div class="home-news-admin-item">
            <img src="${escapeHtml(item.image_url || "")}" alt="${escapeHtml(item.title || "Home post image")}" class="home-news-admin-thumb">
            <div>
                <p><strong>${escapeHtml(item.title || "Untitled")}</strong></p>
                <p><small>${escapeHtml(item.tag || "NEWS")} | ${escapeHtml(formatDateForDisplay(item.published_at))} | ${item.is_published ? "Visible" : "Hidden"}</small></p>
                <p>${escapeHtml(item.summary || "")}</p>
                <p><small><a href="${escapeHtml(getNewsDetailHref(item))}">Open detail page</a></small></p>
                <p><small>Link: ${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open</a>` : "N/A"}</small></p>
            </div>
            <div class="home-news-admin-actions">
                <button type="button" class="home-news-content-btn" data-id="${item.id}">Add Content</button>
                <button type="button" class="home-news-edit-btn" data-id="${item.id}">Edit</button>
                <button type="button" class="home-news-delete-btn" data-id="${item.id}">Delete</button>
            </div>
        </div>
    `).join("");

    list.querySelectorAll(".home-news-content-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            if (!Number.isInteger(id)) {
                return;
            }

            const selected = homeNewsItemsCache.find((row) => Number(row.id) === id);
            window.location.href = getNewsDetailHref(selected || { id });
        });
    });

    list.querySelectorAll(".home-news-edit-btn").forEach((button) => {
        button.addEventListener("click", () => {
            const id = Number(button.dataset.id);
            const selected = homeNewsItemsCache.find((row) => Number(row.id) === id);
            if (selected) {
                startEditHomeNews(selected);
            }
        });
    });

    list.querySelectorAll(".home-news-delete-btn").forEach((button) => {
        button.addEventListener("click", async () => {
            const id = Number(button.dataset.id);
            if (!Number.isInteger(id)) {
                return;
            }

            try {
                await request(`/api/home-news/${id}`, { method: "DELETE" });
                await loadHomeNewsAdmin();
                addActivityLog(`Deleted home post #${id}`);
                showToast("Homepage post deleted", "success");
            } catch (error) {
                showToast(`Could not delete post: ${error.message}`, "error");
            }
        });
    });
}

async function loadHomeNewsAdmin() {
    const list = document.getElementById("homeNewsList");
    if (!list) {
        return;
    }

    try {
        const rows = await request("/api/home-news", { method: "GET" });
        homeNewsItemsCache = Array.isArray(rows) ? rows : [];
        renderHomeNewsAdmin(homeNewsItemsCache);
    } catch (error) {
        list.innerHTML = `<p class="admin-note">${escapeHtml(error.message || "Failed to load homepage posts")}</p>`;
    }
}

async function uploadHomeNewsImage() {
    const fileInput = document.getElementById("homeNewsImageFile");
    const imageAssetIdInput = document.getElementById("homeNewsImageAssetId");
    const status = document.getElementById("homeNewsUploadStatus");
    const preview = document.getElementById("homeNewsImagePreview");
    const button = document.getElementById("uploadHomeNewsImageBtn");

    if (!fileInput || !imageAssetIdInput || !button) {
        return;
    }

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        showToast("Please choose an image first", "error");
        return;
    }

    button.disabled = true;
    if (status) {
        status.textContent = "Uploading...";
    }

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
        if (!response.ok) {
            throw new Error(data.message || "Failed to upload image");
        }

        await cleanupPendingUploadAsset(imageAssetIdInput);
        imageAssetIdInput.value = data.id;
        setPendingUploadAssetId(imageAssetIdInput, data.id);
        if (preview && data.url) {
            preview.src = data.url;
            preview.hidden = false;
        }
        if (status) {
            status.textContent = "Upload successful";
        }
        showToast("Image uploaded successfully", "success");
    } catch (error) {
        if (status) {
            status.textContent = "Upload failed";
        }
        showToast(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function saveHomeNews(event) {
    event.preventDefault();

    const editId = document.getElementById("homeNewsEditId");
    const imageAssetIdInput = document.getElementById("homeNewsImageAssetId");
    const titleInput = document.getElementById("homeNewsTitle");
    const summaryInput = document.getElementById("homeNewsSummary");
    const linkInput = document.getElementById("homeNewsLink");
    const tagInput = document.getElementById("homeNewsTag");
    const publishedAtInput = document.getElementById("homeNewsPublishedAt");
    const isPublishedInput = document.getElementById("homeNewsIsPublished");

    if (!imageAssetIdInput || !titleInput || !summaryInput || !publishedAtInput || !isPublishedInput || !tagInput) {
        return;
    }

    const imageAssetId = Number(imageAssetIdInput.value);
    if (!Number.isInteger(imageAssetId)) {
        showToast("Please upload image first", "error");
        return;
    }

    const payload = {
        title: titleInput.value.trim(),
        summary: summaryInput.value.trim(),
        content: "",
        imageAssetId,
        link: linkInput ? linkInput.value.trim() : "",
        tag: tagInput.value.trim() || "NEWS",
        publishedAt: formatDateForInput(publishedAtInput.value) || new Date().toISOString().slice(0, 10),
        isPublished: Boolean(isPublishedInput.checked)
    };

    if (!payload.title || !payload.summary) {
        showToast("Title and summary are required", "error");
        return;
    }

    const isEdit = Boolean(editId && editId.value);
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/home-news/${editId.value}` : "/api/home-news";

    try {
        await request(url, {
            method,
            body: JSON.stringify(payload)
        });

        if (imageAssetIdInput) {
            setPendingUploadAssetId(imageAssetIdInput, null);
        }

        resetHomeNewsForm();
        await loadHomeNewsAdmin();
        addActivityLog(`${isEdit ? "Updated" : "Created"} homepage post`);
        showToast(`Homepage post ${isEdit ? "updated" : "created"} successfully`, "success");
    } catch (error) {
        showToast(`Could not save post: ${error.message}`, "error");
    }
}

async function loadHomePageContentAdmin() {
    const heroTitleInput = document.getElementById("homePageHeroTitle");
    const introParagraph1Input = document.getElementById("homePageIntroParagraph1");
    const introParagraph2Input = document.getElementById("homePageIntroParagraph2");
    const githubUrlInput = document.getElementById("homePageGithubUrl");
    const facebookUrlInput = document.getElementById("homePageFacebookUrl");
    const heroImageUrl1Input = document.getElementById("homePageHeroImageUrl1");
    const heroImageUrl2Input = document.getElementById("homePageHeroImageUrl2");
    const heroImageUrl3Input = document.getElementById("homePageHeroImageUrl3");
    const footerTextInput = document.getElementById("homePageFooterText");

    if (!heroTitleInput || !introParagraph1Input || !introParagraph2Input || !footerTextInput) {
        return;
    }

    try {
        const data = await request("/api/admin/homepage-content", { method: "GET" });
        homepageContentState = data || null;

        heroTitleInput.value = data.hero_title || "";
        introParagraph1Input.value = data.intro_paragraph_1 || "";
        introParagraph2Input.value = data.intro_paragraph_2 || "";

        if (githubUrlInput) {
            githubUrlInput.value = data.github_url || "";
        }

        if (facebookUrlInput) {
            facebookUrlInput.value = data.facebook_url || "";
        }

        if (heroImageUrl1Input) {
            heroImageUrl1Input.value = data.hero_image_url_1 || "";
            setPendingUploadAssetId(heroImageUrl1Input, null);
            setHomePageHeroImagePreview(1, data.hero_image_url_1 || "");
        }

        if (heroImageUrl2Input) {
            heroImageUrl2Input.value = data.hero_image_url_2 || "";
            setPendingUploadAssetId(heroImageUrl2Input, null);
            setHomePageHeroImagePreview(2, data.hero_image_url_2 || "");
        }

        if (heroImageUrl3Input) {
            heroImageUrl3Input.value = data.hero_image_url_3 || "";
            setPendingUploadAssetId(heroImageUrl3Input, null);
            setHomePageHeroImagePreview(3, data.hero_image_url_3 || "");
        }

        footerTextInput.value = data.footer_text || "";
    } catch (error) {
        showToast(`Could not load homepage content: ${error.message}`, "error");
    }
}

function setHomePageHeroImagePreview(slot, imageUrl) {
    const preview = document.getElementById(`homePageHeroImagePreview${slot}`);
    const status = document.getElementById(`homePageHeroImageUploadStatus${slot}`);

    if (preview) {
        if (imageUrl) {
            preview.src = imageUrl;
            preview.hidden = false;
        } else {
            preview.hidden = true;
            preview.removeAttribute("src");
        }
    }

    if (status) {
        status.textContent = imageUrl ? "Image loaded from saved homepage content" : "";
    }
}

async function uploadHomePageHeroImage(slot) {
    const fileInput = document.getElementById(`homePageHeroImageFile${slot}`);
    const imageUrlInput = document.getElementById(`homePageHeroImageUrl${slot}`);
    const status = document.getElementById(`homePageHeroImageUploadStatus${slot}`);
    const preview = document.getElementById(`homePageHeroImagePreview${slot}`);
    const button = document.getElementById(`uploadHomePageHeroImageBtn${slot}`);

    if (!fileInput || !imageUrlInput || !button) {
        return;
    }

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        showToast("Please choose an image first", "error");
        return;
    }

    button.disabled = true;
    if (status) {
        status.textContent = "Uploading...";
    }

    let uploadedAssetId = null;

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
        if (!response.ok) {
            throw new Error(data.message || "Failed to upload image");
        }

        uploadedAssetId = Number(data.id);
        if (!Number.isInteger(uploadedAssetId) || uploadedAssetId <= 0) {
            throw new Error("Upload response is missing image asset id");
        }

        const cleanupOk = await cleanupPendingUploadAsset(imageUrlInput);
        if (!cleanupOk && getPendingUploadAssetId(imageUrlInput)) {
            throw new Error("Cannot remove previous temporary image. Please retry.");
        }

        const saved = await request(`/api/admin/homepage-content/hero-image/${slot}`, {
            method: "PATCH",
            body: JSON.stringify({
                image_url: data.url || ""
            })
        });

        homepageContentState = saved || homepageContentState;
        imageUrlInput.value = data.url || "";
        setPendingUploadAssetId(imageUrlInput, null);

        if (preview && data.url) {
            preview.src = data.url;
            preview.hidden = false;
        }

        if (status) {
            status.textContent = "Upload successful and saved";
        }

        showToast(`Hero image ${slot} updated successfully`, "success");
    } catch (error) {
        if (uploadedAssetId) {
            await deleteUploadedImageAssetById(uploadedAssetId);
        }

        if (status) {
            status.textContent = "Upload failed";
        }
        showToast(error.message, "error");
    } finally {
        button.disabled = false;
    }
}

async function saveHomePageContent(event) {
    event.preventDefault();

    const heroTitleInput = document.getElementById("homePageHeroTitle");
    const introParagraph1Input = document.getElementById("homePageIntroParagraph1");
    const introParagraph2Input = document.getElementById("homePageIntroParagraph2");
    const githubUrlInput = document.getElementById("homePageGithubUrl");
    const facebookUrlInput = document.getElementById("homePageFacebookUrl");
    const heroImageUrl1Input = document.getElementById("homePageHeroImageUrl1");
    const heroImageUrl2Input = document.getElementById("homePageHeroImageUrl2");
    const heroImageUrl3Input = document.getElementById("homePageHeroImageUrl3");
    const footerTextInput = document.getElementById("homePageFooterText");
    const saveBtn = document.getElementById("homePageContentSaveBtn");

    if (!heroTitleInput || !introParagraph1Input || !introParagraph2Input || !footerTextInput) {
        return;
    }

    const payload = {
        hero_title: heroTitleInput.value.trim(),
        intro_paragraph_1: introParagraph1Input.value.trim(),
        intro_paragraph_2: introParagraph2Input.value.trim(),
        github_url: githubUrlInput ? githubUrlInput.value.trim() : "",
        facebook_url: facebookUrlInput ? facebookUrlInput.value.trim() : "",
        hero_image_url_1: heroImageUrl1Input ? heroImageUrl1Input.value.trim() : "",
        hero_image_url_2: heroImageUrl2Input ? heroImageUrl2Input.value.trim() : "",
        hero_image_url_3: heroImageUrl3Input ? heroImageUrl3Input.value.trim() : "",
        footer_text: footerTextInput.value.trim()
    };

    if (!payload.hero_title || !payload.intro_paragraph_1 || !payload.intro_paragraph_2 || !payload.footer_text) {
        showToast("Please fill all required homepage content fields", "error");
        return;
    }

    if (payload.github_url && !isValidHttpUrl(payload.github_url)) {
        showToast("GitHub URL must start with http:// or https://", "error");
        return;
    }

    if (payload.facebook_url && !isValidHttpUrl(payload.facebook_url)) {
        showToast("Facebook URL must start with http:// or https://", "error");
        return;
    }

    if (payload.hero_image_url_1 && !isValidHttpUrl(payload.hero_image_url_1)) {
        showToast("Hero image 1 is invalid. Please upload again.", "error");
        return;
    }

    if (payload.hero_image_url_2 && !isValidHttpUrl(payload.hero_image_url_2)) {
        showToast("Hero image 2 is invalid. Please upload again.", "error");
        return;
    }

    if (payload.hero_image_url_3 && !isValidHttpUrl(payload.hero_image_url_3)) {
        showToast("Hero image 3 is invalid. Please upload again.", "error");
        return;
    }

    if (saveBtn) {
        saveBtn.disabled = true;
    }

    try {
        const saved = await request("/api/admin/homepage-content", {
            method: "PUT",
            body: JSON.stringify(payload)
        });

        homepageContentState = saved || payload;

        if (heroImageUrl1Input) {
            setPendingUploadAssetId(heroImageUrl1Input, null);
        }

        if (heroImageUrl2Input) {
            setPendingUploadAssetId(heroImageUrl2Input, null);
        }

        if (heroImageUrl3Input) {
            setPendingUploadAssetId(heroImageUrl3Input, null);
        }

        addActivityLog("Updated homepage content");
        showToast("Homepage content updated successfully", "success");
    } catch (error) {
        showToast(`Could not save homepage content: ${error.message}`, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }
}

async function loadMembers() {
    try {
        const data = await request("/api/members", { method: "GET" });
        memberItemsCache = data;
        refreshLecturerMemberOptions();
        bindMemberSearchEvents();
        renderMemberSections();

        statsState.totalMembers = data.length;
        statsState.activeResearchers = data.filter((member) => member.role === "user").length;
        syncOverviewStats();
    } catch (error) {
        alert(error.message);
    }
}

async function loadAdminProfile() {
    try {
        const data = await request("/api/profile", { method: "GET" });
        currentProfile = data;
        const profile = document.getElementById("adminProfileInfo");
        const displayName = data.member && data.member.name ? data.member.name : data.user.email;
        const photoUrl = data.member && data.member.photo_url ? data.member.photo_url : "";
        const avatarInitial = (displayName || "A").trim().charAt(0).toUpperCase() || "A";

        profile.innerHTML = `
            <div class="dashboard-profile-overview">
                ${photoUrl
                    ? `<img src="${photoUrl}" alt="${displayName} avatar" class="dashboard-profile-avatar">`
                    : `<div class="dashboard-profile-avatar-fallback" aria-hidden="true">${avatarInitial}</div>`}
                <div class="dashboard-profile-meta">
                    <p><strong>${displayName}</strong></p>
                    <p><strong>User ID:</strong> ${data.user.id}</p>
                    <p><strong>Role:</strong> ${data.user.role}</p>
                    <p><strong>Access:</strong> Publication review and member management</p>
                </div>
            </div>
        `;

        const profileNameInput = document.getElementById("profileName");
        const profileBioInput = document.getElementById("profileBio");
        const profileCareerInput = document.getElementById("profileCareer");
        const profilePhotoAssetIdInput = document.getElementById("profilePhotoAssetId");
        const profilePhotoPreview = document.getElementById("profilePhotoPreview");

        if (profileNameInput) {
            profileNameInput.value = data.member && data.member.name ? data.member.name : "";
        }
        if (profileBioInput) {
            profileBioInput.value = data.member && data.member.bio ? data.member.bio : "";
        }
        if (profileCareerInput) {
            profileCareerInput.value = parseCareerEntries(data.member && data.member.career).join("\n");
        }
        if (profilePhotoAssetIdInput) {
            profilePhotoAssetIdInput.value = data.member && data.member.photo_asset_id ? data.member.photo_asset_id : "";
        }
        if (profilePhotoPreview) {
            if (photoUrl) {
                profilePhotoPreview.src = photoUrl;
                profilePhotoPreview.hidden = false;
            } else {
                profilePhotoPreview.hidden = true;
                profilePhotoPreview.removeAttribute("src");
            }
        }
    } catch (error) {
        showToast(error.message, "error");
    }
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

function normalizeSocialLinkIconPresetLabel(value) {
    return String(value || "").trim().toLowerCase();
}

function getSocialLinkIconPresetByLabel(label) {
    const normalizedLabel = normalizeSocialLinkIconPresetLabel(label);
    if (!normalizedLabel) {
        return null;
    }

    return socialLinkIconPresets.find((item) => normalizeSocialLinkIconPresetLabel(item.label) === normalizedLabel) || null;
}

function setPublicPageLinkPresetDatalistOptions() {
    const datalist = document.getElementById("publicPageLinkPresetList");
    if (!datalist) {
        return;
    }

    datalist.innerHTML = socialLinkIconPresets
        .filter((item) => String(item.label || "").trim())
        .map((item) => `<option value="${escapeHtml(String(item.label))}"></option>`)
        .join("");
}

function buildSocialLinkIconPresetSelect(selectedPreset) {
    const select = document.createElement("select");
    select.className = "mf-link-preset-select";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "No preset icon";
    select.appendChild(placeholder);

    socialLinkIconPresets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = String(preset.label || "");
        option.textContent = String(preset.label || "");
        select.appendChild(option);
    });

    if (selectedPreset && selectedPreset.label) {
        if (!socialLinkIconPresets.some((item) => normalizeSocialLinkIconPresetLabel(item.label) === normalizeSocialLinkIconPresetLabel(selectedPreset.label))) {
            const fallbackOption = document.createElement("option");
            fallbackOption.value = String(selectedPreset.label);
            fallbackOption.textContent = String(selectedPreset.label);
            select.appendChild(fallbackOption);
        }
        select.value = String(selectedPreset.label);
    }

    return select;
}

function applySocialLinkPresetToRow({ preset, iconAssetIdInput, iconPreview }) {
    const resolvedPreset = preset || null;

    if (!resolvedPreset) {
        iconAssetIdInput.value = "";
        iconPreview.hidden = true;
        iconPreview.removeAttribute("src");
        return;
    }

    const parsedIconAssetId = Number(resolvedPreset.icon_asset_id);
    const iconAssetId = Number.isInteger(parsedIconAssetId) && parsedIconAssetId > 0 ? parsedIconAssetId : null;
    const iconUrl = String(resolvedPreset.icon_url || "").trim();

    iconAssetIdInput.value = iconAssetId ? String(iconAssetId) : "";

    if (iconUrl) {
        iconPreview.src = iconUrl;
        iconPreview.hidden = false;
    } else {
        iconPreview.hidden = true;
        iconPreview.removeAttribute("src");
    }

}

async function loadSocialLinkIconPresetsForPublicForms() {
    try {
        const data = await request("/api/social-link-icons/public", { method: "GET" });
        const rows = Array.isArray(data) ? data : [];

        if (rows.length) {
            socialLinkIconPresets = rows.map((item) => ({
                label: String(item && item.label ? item.label : "").trim(),
                color: String(item && item.color ? item.color : "").trim(),
                icon_asset_id: Number.isInteger(Number(item && item.icon_asset_id)) ? Number(item.icon_asset_id) : null,
                icon_url: String(item && item.icon_url ? item.icon_url : "").trim()
            })).filter((item) => item.label);
        }
    } catch (error) {
        console.error("Could not load social link icon presets:", error);
    }

    setPublicPageLinkPresetDatalistOptions();
}

function buildPublicPageLinkRow(link = {}) {
    const container = document.getElementById("publicPageLinksContainer");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "mf-link-row";

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "mf-link-url";
    urlInput.placeholder = "https://...";
    urlInput.value = String(link.url || "");

    const iconAssetIdInput = document.createElement("input");
    iconAssetIdInput.type = "hidden";
    iconAssetIdInput.className = "mf-link-icon-asset-id";
    iconAssetIdInput.value = link.icon_asset_id ? String(link.icon_asset_id) : "";

    const iconPreview = document.createElement("img");
    iconPreview.className = "mf-link-icon-preview";
    iconPreview.alt = "Link icon preview";

    const presetByLabel = getSocialLinkIconPresetByLabel(link.label);
    const presetByAssetId = socialLinkIconPresets.find((item) => Number(item.icon_asset_id) === Number(link.icon_asset_id));
    const selectedPreset = presetByAssetId || presetByLabel || null;
    const presetSelect = buildSocialLinkIconPresetSelect(selectedPreset);

    const directIconUrl = String(link.icon_url || "").trim();
    if (directIconUrl) {
        iconPreview.src = directIconUrl;
        iconPreview.hidden = false;
    } else {
        iconPreview.hidden = true;
    }

    if (selectedPreset) {
        applySocialLinkPresetToRow({
            preset: selectedPreset,
            iconAssetIdInput,
            iconPreview
        });
    }

    presetSelect.addEventListener("change", () => {
        const selected = getSocialLinkIconPresetByLabel(presetSelect.value);
        applySocialLinkPresetToRow({
            preset: selected,
            iconAssetIdInput,
            iconPreview
        });
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mf-link-remove";
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(urlInput);
    row.appendChild(presetSelect);
    row.appendChild(iconAssetIdInput);
    row.appendChild(iconPreview);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

function readPublicPageLinksFromRows() {
    const rows = document.querySelectorAll("#publicPageLinksContainer .mf-link-row");
    const result = [];

    rows.forEach((row) => {
        const labelValue = (row.querySelector(".mf-link-preset-select")?.value || "").trim();
        const urlValue = (row.querySelector(".mf-link-url")?.value || "").trim();
        const iconAssetValue = Number((row.querySelector(".mf-link-icon-asset-id")?.value || "").trim());
        const iconAssetId = Number.isInteger(iconAssetValue) && iconAssetValue > 0 ? iconAssetValue : null;
        if (labelValue && urlValue) {
            result.push({ label: labelValue, url: urlValue, icon_asset_id: iconAssetId });
        }
    });

    return result;
}

function populatePublicPageLinkRows(links) {
    const container = document.getElementById("publicPageLinksContainer");
    if (!container) return;

    container.innerHTML = "";
    if (Array.isArray(links) && links.length) {
        links.forEach((item) => buildPublicPageLinkRow(item || {}));
        return;
    }

    buildPublicPageLinkRow();
}

function buildSocialLinkIconPresetRow(preset = {}) {
    const list = document.getElementById("socialLinkIconsList");
    if (!list) {
        return;
    }

    const row = document.createElement("div");
    row.className = "social-icon-preset-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "social-icon-preset-label";
    labelInput.placeholder = "Preset label";
    labelInput.value = String(preset.label || "");

    const assetIdInput = document.createElement("input");
    assetIdInput.type = "hidden";
    assetIdInput.className = "social-icon-preset-asset-id";
    assetIdInput.value = preset.icon_asset_id ? String(preset.icon_asset_id) : "";
    setPendingUploadAssetId(assetIdInput, null);

    const preview = document.createElement("img");
    preview.className = "social-icon-preset-preview";
    preview.alt = "Preset icon preview";
    const iconUrl = String(preset.icon_url || "").trim();
    if (iconUrl) {
        preview.src = iconUrl;
        preview.hidden = false;
    } else {
        preview.hidden = true;
    }

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.className = "social-icon-preset-file";
    fileInput.accept = "image/jpeg,image/png,image/webp";

    const uploadBtn = document.createElement("button");
    uploadBtn.type = "button";
    uploadBtn.className = "social-icon-preset-upload";
    uploadBtn.textContent = "Upload Icon";

    const status = document.createElement("span");
    status.className = "social-icon-preset-status";

    uploadBtn.addEventListener("click", async () => {
        const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
        if (!file) {
            showToast("Please choose an icon file first", "error");
            return;
        }

        uploadBtn.disabled = true;
        status.textContent = "Uploading...";

        let uploadedAssetId = null;

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
            if (!response.ok) {
                throw new Error(data.message || "Failed to upload icon");
            }

            uploadedAssetId = Number(data.id);
            if (!Number.isInteger(uploadedAssetId) || uploadedAssetId <= 0) {
                throw new Error("Upload response is missing icon asset id");
            }

            await cleanupPendingUploadAsset(assetIdInput);
            assetIdInput.value = String(uploadedAssetId);
            setPendingUploadAssetId(assetIdInput, uploadedAssetId);

            if (data.url) {
                preview.src = data.url;
                preview.hidden = false;
            } else {
                preview.hidden = true;
                preview.removeAttribute("src");
            }

            fileInput.value = "";
            status.textContent = "Uploaded";
            showToast("Icon uploaded successfully", "success");
        } catch (error) {
            if (uploadedAssetId) {
                await deleteUploadedImageAssetById(uploadedAssetId);
            }

            status.textContent = "Upload failed";
            showToast(error.message, "error");
        } finally {
            uploadBtn.disabled = false;
        }
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "social-icon-preset-remove";
    removeBtn.textContent = "x";
    removeBtn.addEventListener("click", async () => {
        removeBtn.disabled = true;
        await cleanupPendingUploadAsset(assetIdInput);
        row.remove();
    });

    row.appendChild(labelInput);
    row.appendChild(assetIdInput);
    row.appendChild(preview);
    row.appendChild(fileInput);
    row.appendChild(uploadBtn);
    row.appendChild(status);
    row.appendChild(removeBtn);
    list.appendChild(row);
}

function readSocialLinkIconPresetRows() {
    const rows = document.querySelectorAll("#socialLinkIconsList .social-icon-preset-row");
    const result = [];

    rows.forEach((row) => {
        const label = String(row.querySelector(".social-icon-preset-label")?.value || "").trim();
        const iconAssetValue = Number(String(row.querySelector(".social-icon-preset-asset-id")?.value || "").trim());
        const iconAssetId = Number.isInteger(iconAssetValue) && iconAssetValue > 0 ? iconAssetValue : null;

        if (label) {
            result.push({
                label,
                icon_asset_id: iconAssetId
            });
        }
    });

    return result;
}

async function loadSocialLinkIconsAdmin() {
    const list = document.getElementById("socialLinkIconsList");
    if (!list) {
        return;
    }

    try {
        const rows = await request("/api/admin/social-link-icons", { method: "GET" });
        socialLinkIconPresets = Array.isArray(rows) && rows.length ? rows : socialLinkIconPresets;
    } catch (error) {
        showToast(`Could not load social link icon presets: ${error.message}`, "error");
    }

    list.innerHTML = "";
    const rowsToRender = Array.isArray(socialLinkIconPresets) && socialLinkIconPresets.length
        ? socialLinkIconPresets
        : PUBLIC_PAGE_LINK_PRESETS;
    rowsToRender.forEach((item) => buildSocialLinkIconPresetRow(item));
    setPublicPageLinkPresetDatalistOptions();
}

async function saveSocialLinkIcons(event) {
    event.preventDefault();

    const saveButton = document.getElementById("saveSocialLinkIconsBtn");
    const presets = readSocialLinkIconPresetRows();
    if (!presets.length) {
        showToast("Please add at least one social link icon preset", "error");
        return;
    }

    if (saveButton) {
        saveButton.disabled = true;
    }

    try {
        const saved = await request("/api/admin/social-link-icons", {
            method: "PUT",
            body: JSON.stringify({ presets })
        });

        socialLinkIconPresets = Array.isArray(saved) ? saved : presets;
        setPublicPageLinkPresetDatalistOptions();
        addActivityLog("Updated social link icon presets");
        showToast("Social link icon presets saved", "success");
    } catch (error) {
        showToast(`Could not save social link icon presets: ${error.message}`, "error");
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
        }
    }
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
    populatePublicPageLinkRows(data.links);
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

    if (!fileInput || !heroAssetIdInput || !button) {
        return;
    }

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
        if (!response.ok) {
            throw new Error(data.message || "Failed to upload image");
        }

        await cleanupPendingUploadAsset(heroAssetIdInput);
        heroAssetIdInput.value = data.id;
        setPendingUploadAssetId(heroAssetIdInput, data.id);
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

    if (heroAssetIdInput) {
        void cleanupPendingUploadAsset(heroAssetIdInput);
        heroAssetIdInput.value = "";
        setPendingUploadAssetId(heroAssetIdInput, null);
    }
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
        links: readPublicPageLinksFromRows(),
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

    const heroAssetIdInput = document.getElementById("publicPageHeroPhotoAssetId");
    if (heroAssetIdInput) {
        setPendingUploadAssetId(heroAssetIdInput, null);
    }

    document.querySelectorAll("#publicPageLinksContainer .mf-link-icon-asset-id").forEach((input) => {
        setPendingUploadAssetId(input, null);
    });

    await loadOwnPublicPage();
    addActivityLog("Updated own public page");
    showToast("Public page updated successfully", "success");
}

function openOwnPublicPage() {
    const memberId = Number(currentPublicPage && currentPublicPage.member_id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
        showToast("Cannot open public page yet. Save your public page first.", "error");
        return;
    }

    const slug = String(currentPublicPage && currentPublicPage.name ? currentPublicPage.name : "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");

    const href = slug ? `/member/${encodeURIComponent(`${slug}-${memberId}`)}` : `/member/${memberId}`;
    window.open(href, "_blank", "noopener");
}

async function uploadProfileAvatar() {
    const fileInput = document.getElementById("profilePhotoFile");
    const status = document.getElementById("profilePhotoUploadStatus");
    const photoAssetIdInput = document.getElementById("profilePhotoAssetId");
    const preview = document.getElementById("profilePhotoPreview");
    const button = document.getElementById("uploadProfilePhotoBtn");

    if (!fileInput || !photoAssetIdInput || !button) {
        return;
    }

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
        if (!response.ok) {
            throw new Error(data.message || "Failed to upload image");
        }

        await cleanupPendingUploadAsset(photoAssetIdInput);
        photoAssetIdInput.value = data.id;
        setPendingUploadAssetId(photoAssetIdInput, data.id);
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

    try {
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

        if (profilePhotoAssetIdInput) {
            setPendingUploadAssetId(profilePhotoAssetIdInput, null);
        }

        await loadAdminProfile();
        addActivityLog("Updated own profile");
        showToast("Profile updated successfully", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function approvePublication(id) {
    try {
        await request(`/api/publications/${id}/approve`, { method: "PATCH" });
        await loadPendingPublications();
        await loadAllPublications();
        addActivityLog(`Approved publication #${id}`);
        showToast("Publication approved successfully", "success");
    } catch (error) {
        showToast(`Could not approve publication: ${error.message}`, "error");
    }
}

async function rejectPublication(id) {
    try {
        await request(`/api/publications/${id}/reject`, { method: "PATCH" });
        await loadPendingPublications();
        await loadAllPublications();
        addActivityLog(`Rejected publication #${id}`);
        showToast("Publication rejected successfully", "success");
    } catch (error) {
        showToast(`Could not reject publication: ${error.message}`, "error");
    }
}

async function deletePublication(id) {
    try {
        await request(`/api/admin/publications/${id}`, { method: "DELETE" });
        await loadPendingPublications();
        await loadAllPublications();
        addActivityLog(`Deleted publication #${id}`);
    } catch (error) {
        showToast(error.message, "error");
    }
}

if (isAuthValid) {
    document.getElementById("createMemberForm").addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("memberEmail").value.trim();
        const password = document.getElementById("memberPassword").value;
        const role = document.getElementById("memberRole").value;
        const name = document.getElementById("memberName").value.trim();

        try {
            await request("/api/members", {
                method: "POST",
                body: JSON.stringify({ email, password, role, name })
            });

            document.getElementById("createMemberForm").reset();
            await loadMembers();
            addActivityLog(`Added member ${email} (${role})`);
            showToast("Member added successfully", "success");
        } catch (error) {
            showToast(`Could not add member: ${error.message}`, "error");
        }
    });
}

async function deleteMember(id) {
    try {
        await request(`/api/members/${id}`, { method: "DELETE" });
        await loadMembers();
        addActivityLog(`Deleted member #${id}`);
    } catch (error) {
        showToast(error.message, "error");
    }
}

window.approvePublication = approvePublication;
window.rejectPublication = rejectPublication;
window.deletePublication = deletePublication;
window.deleteMember = deleteMember;
window.editSeminar = startEditSeminar;
window.deleteSeminarEntry = deleteSeminarEntry;

if (isAuthValid) {
    const socialPresetLoadPromise = loadSocialLinkIconPresetsForPublicForms();
    loadSocialLinkIconsAdmin();
    loadAdminProfile();
    socialPresetLoadPromise.then(() => loadOwnPublicPage()).catch((error) => {
        populatePublicPageLinkRows([]);
        if (error && error.message) {
            showToast(error.message, "error");
        }
    });
    loadPendingPublications();
    loadAllPublications();
    loadMembers();
    loadSeminarsAdmin();
    loadLecturersAdmin();
    loadHomeNewsAdmin();
    loadHomePageContentAdmin();
    showSection("profileSection");
    addActivityLog("Admin dashboard opened");

    const seminarForm = document.getElementById("seminarForm");
    const cancelEditBtn = document.getElementById("seminarCancelEditBtn");
    if (seminarForm) {
        seminarForm.addEventListener("submit", saveSeminar);
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", resetSeminarForm);
    }

    const lecturerForm = document.getElementById("lecturerForm");
    if (lecturerForm) {
        lecturerForm.addEventListener("submit", saveLecturer);
    }

    const uploadLecturerPhotoBtn = document.getElementById("uploadLecturerPhotoBtn");
    if (uploadLecturerPhotoBtn) {
        uploadLecturerPhotoBtn.addEventListener("click", uploadLecturerPhoto);
    }

    const lecturerCancelEditBtn = document.getElementById("lecturerCancelEditBtn");
    if (lecturerCancelEditBtn) {
        lecturerCancelEditBtn.addEventListener("click", resetLecturerForm);
    }

    resetLecturerForm();

    const homeNewsForm = document.getElementById("homeNewsForm");
    if (homeNewsForm) {
        homeNewsForm.addEventListener("submit", saveHomeNews);
    }

    const uploadHomeNewsImageBtn = document.getElementById("uploadHomeNewsImageBtn");
    if (uploadHomeNewsImageBtn) {
        uploadHomeNewsImageBtn.addEventListener("click", uploadHomeNewsImage);
    }

    const homeNewsCancelEditBtn = document.getElementById("homeNewsCancelEditBtn");
    if (homeNewsCancelEditBtn) {
        homeNewsCancelEditBtn.addEventListener("click", resetHomeNewsForm);
    }

    resetHomeNewsForm();

    const homePageContentForm = document.getElementById("homePageContentForm");
    if (homePageContentForm) {
        homePageContentForm.addEventListener("submit", saveHomePageContent);
    }

    const uploadHomePageHeroImageBtn1 = document.getElementById("uploadHomePageHeroImageBtn1");
    if (uploadHomePageHeroImageBtn1) {
        uploadHomePageHeroImageBtn1.addEventListener("click", () => uploadHomePageHeroImage(1));
    }

    const uploadHomePageHeroImageBtn2 = document.getElementById("uploadHomePageHeroImageBtn2");
    if (uploadHomePageHeroImageBtn2) {
        uploadHomePageHeroImageBtn2.addEventListener("click", () => uploadHomePageHeroImage(2));
    }

    const uploadHomePageHeroImageBtn3 = document.getElementById("uploadHomePageHeroImageBtn3");
    if (uploadHomePageHeroImageBtn3) {
        uploadHomePageHeroImageBtn3.addEventListener("click", () => uploadHomePageHeroImage(3));
    }

    // Change password
    const editProfileForm = document.getElementById("editProfileForm");
    if (editProfileForm) {
        editProfileForm.addEventListener("submit", saveOwnProfile);
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

    const addPublicPageLinkBtn = document.getElementById("addPublicPageLinkBtn");
    if (addPublicPageLinkBtn) {
        addPublicPageLinkBtn.addEventListener("click", () => buildPublicPageLinkRow());
    }

    const socialLinkIconsForm = document.getElementById("socialLinkIconsForm");
    if (socialLinkIconsForm) {
        socialLinkIconsForm.addEventListener("submit", saveSocialLinkIcons);
    }

    const addSocialLinkIconPresetBtn = document.getElementById("addSocialLinkIconPresetBtn");
    if (addSocialLinkIconPresetBtn) {
        addSocialLinkIconPresetBtn.addEventListener("click", () => buildSocialLinkIconPresetRow());
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

    document.getElementById("logoutBtn").addEventListener("click", () => {
        clearAuth();
        window.location.href = "/";
    });
}

async function updateMemberRole(userId, role, memberEmail) {
    try {
        await request(`/api/members/${userId}/role`, {
            method: "PATCH",
            body: JSON.stringify({ role })
        });

        await loadMembers();
        addActivityLog(`Updated role for ${memberEmail} to ${role}`);
    } catch (error) {
        showToast(error.message, "error");
    }
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
        void cleanupPendingUploadAsset(profilePhotoAssetIdInput);
        profilePhotoAssetIdInput.value = "";
        setPendingUploadAssetId(profilePhotoAssetIdInput, null);
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