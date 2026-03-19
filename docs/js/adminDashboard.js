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

async function request(url, options = {}) {
    let response;

    try {
        response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token,
                ...(options.headers || {})
            }
        });
    } catch (error) {
        throw new Error("Cannot connect to server. Make sure backend is running at http://localhost:3000.");
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

        if (response.status === 404 && url.includes("/members/") && url.includes("/role")) {
            throw new Error("Role API is not available yet. Please restart the backend server and try again.");
        }

        throw new Error(data.message || response.statusText || "Request failed");
    }

    return data;
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

async function loadMembers() {
    try {
        const data = await request("/api/members", { method: "GET" });
        memberItemsCache = data;
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
        const profile = document.getElementById("adminProfileInfo");
        const displayName = data.member && data.member.name ? data.member.name : data.user.email;

        profile.innerHTML = `
            <p><strong>${displayName}</strong></p>
            <p><strong>User ID:</strong> ${data.user.id}</p>
            <p><strong>Role:</strong> ${data.user.role}</p>
            <p><strong>Access:</strong> Publication review and member management</p>
        `;
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
    loadAdminProfile();
    loadPendingPublications();
    loadAllPublications();
    loadMembers();
    loadSeminarsAdmin();
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