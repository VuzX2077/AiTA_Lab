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
                <div>
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
        const list = document.getElementById("publicationList");
        const approvedList = document.getElementById("approvedPublicationList");
        const rejectedList = document.getElementById("rejectedPublicationList");

        const approved = data.filter((pub) => String(pub.status || "").toLowerCase() === "approved");
        const rejected = data.filter((pub) => String(pub.status || "").toLowerCase() === "rejected");

        if (data.length === 0) {
            list.innerHTML = "<p>No publications.</p>";
            approvedList.innerHTML = "<p>No approved publications.</p>";
            rejectedList.innerHTML = "<p>No rejected publications.</p>";
            statsState.totalPublications = 0;
            statsState.approvedPublications = 0;
            statsState.rejectedPublications = 0;
            syncOverviewStats();
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

        list.innerHTML = data.map(publicationTemplate).join("");
        approvedList.innerHTML = approved.length ? approved.map(publicationTemplate).join("") : "<p>No approved publications.</p>";
        rejectedList.innerHTML = rejected.length ? rejected.map(publicationTemplate).join("") : "<p>No rejected publications.</p>";

        statsState.totalPublications = data.length;
        statsState.approvedPublications = approved.length;
        statsState.rejectedPublications = rejected.length;
        syncOverviewStats();
    } catch (error) {
        showToast(error.message, "error");
    }
}

async function loadMembers() {
    try {
        const data = await request("/api/members", { method: "GET" });
        const list = document.getElementById("memberList");
        const rolesList = document.getElementById("rolesMemberList");

        if (data.length === 0) {
            list.innerHTML = "<p>No members.</p>";
            rolesList.innerHTML = "<p>No members found.</p>";
            statsState.totalMembers = 0;
            statsState.activeResearchers = 0;
            syncOverviewStats();
            return;
        }

        list.innerHTML = data.map(member => `
            <div>
                <div>
                    <p><strong>${member.email}</strong></p>
                    <p><small>Name: ${member.name || "N/A"}</small></p>
                    <p><small>Role: ${member.role}</small></p>
                    <p><small>Position: ${member.position || "N/A"}</small></p>
                </div>
                <button onclick="deleteMember(${member.user_id})">Delete</button>
            </div>
        `).join("");

        rolesList.innerHTML = data.map(member => `
            <div>
                <p><strong>${member.email}</strong></p>
                <p><small>Current Role: ${member.role}</small></p>
                <div class="roles-actions">
                    <select id="roleSelect-${member.user_id}" ${Number(member.user_id) === currentAdminId ? "disabled" : ""}>
                        <option value="user" ${member.role === "user" ? "selected" : ""}>User</option>
                        <option value="admin" ${member.role === "admin" ? "selected" : ""}>Admin</option>
                    </select>
                    <button class="save-role-btn" data-id="${member.user_id}" data-email="${member.email}" data-current-role="${member.role}" ${Number(member.user_id) === currentAdminId ? "disabled" : ""}>
                        ${Number(member.user_id) === currentAdminId ? "Protected" : "Save Role"}
                    </button>
                </div>
                ${Number(member.user_id) === currentAdminId ? '<p><small>You cannot change your own role.</small></p>' : ""}
            </div>
        `).join("");

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
        const position = document.getElementById("memberPosition").value.trim();

        try {
            await request("/api/members", {
                method: "POST",
                body: JSON.stringify({ email, password, role, name, position })
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

if (isAuthValid) {
    loadAdminProfile();
    loadPendingPublications();
    loadAllPublications();
    loadMembers();
    showSection("profileSection");
    addActivityLog("Admin dashboard opened");

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