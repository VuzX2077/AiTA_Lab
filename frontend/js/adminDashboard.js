function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
}

const token = localStorage.getItem("token");
let isAuthValid = true;

if (!token) {
    isAuthValid = false;
    window.location.href = "login.html";
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
        return null;
    }
}

const user = parseJwt(token);

const sidebarLinks = document.querySelectorAll(".sidebar-link[data-target]");
const adminPanels = document.querySelectorAll(".admin-panel");
const activityLogs = [];

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
    window.location.href = "login.html";
} else if (user.role !== "admin") {
    isAuthValid = false;
    window.location.href = "userDashboard.html";
}

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
            window.location.href = "login.html";
        }
        throw new Error(data.message || "Request failed");
    }

    return data;
}

async function loadPendingPublications() {
    try {
        const data = await request("/api/publications/pending", { method: "GET" });
        const list = document.getElementById("pendingPublicationList");

        if (data.length === 0) {
            list.innerHTML = "<p>No pending publications.</p>";
            return;
        }

        list.innerHTML = data.map(pub => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong></p>
                    <p><small>Authors: ${pub.authors || "N/A"}</small></p>
                    <p><small>Journal: ${pub.journal || "N/A"}</small></p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p><small>DOI: ${pub.doi || "N/A"}</small></p>
                    <p>${pub.description}</p>
                    <p><small>By: ${pub.owner_email || "Unknown"}</small></p>
                </div>
                <div>
                    <button onclick="approvePublication(${pub.id})">Approve</button>
                    <button onclick="rejectPublication(${pub.id})">Reject</button>
                    <button onclick="deletePublication(${pub.id})">Delete</button>
                </div>
            </div>
        `).join("");

        document.getElementById("statPendingPublications").textContent = data.length;
    } catch (error) {
        alert(error.message);
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
            document.getElementById("statTotalPublications").textContent = "0";
            document.getElementById("statApprovedPublications").textContent = "0";
            document.getElementById("statRejectedPublications").textContent = "0";
            return;
        }

        const publicationTemplate = (pub) => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong> (${pub.status})</p>
                    <p><small>Authors: ${pub.authors || "N/A"}</small></p>
                    <p><small>Journal: ${pub.journal || "N/A"}</small></p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p><small>DOI: ${pub.doi || "N/A"}</small></p>
                    <p><small>By: ${pub.owner_email || "Unknown"}</small></p>
                </div>
                <button onclick="deletePublication(${pub.id})">Delete</button>
            </div>
        `;

        list.innerHTML = data.map(publicationTemplate).join("");
        approvedList.innerHTML = approved.length ? approved.map(publicationTemplate).join("") : "<p>No approved publications.</p>";
        rejectedList.innerHTML = rejected.length ? rejected.map(publicationTemplate).join("") : "<p>No rejected publications.</p>";

        document.getElementById("statTotalPublications").textContent = data.length;
        document.getElementById("statApprovedPublications").textContent = approved.length;
        document.getElementById("statRejectedPublications").textContent = rejected.length;
    } catch (error) {
        alert(error.message);
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
            document.getElementById("statTotalMembers").textContent = "0";
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
            </div>
        `).join("");

        document.getElementById("statTotalMembers").textContent = data.length;
    } catch (error) {
        alert(error.message);
    }
}

async function loadAdminProfile() {
    try {
        const data = await request("/api/profile", { method: "GET" });
        const profile = document.getElementById("adminProfileInfo");
        profile.innerHTML = `
            <p><strong>User ID:</strong> ${data.user.id}</p>
            <p><strong>Role:</strong> ${data.user.role}</p>
            <p><strong>Access:</strong> Publication review and member management</p>
        `;
    } catch (error) {
        alert(error.message);
    }
}

async function approvePublication(id) {
    try {
        await request(`/api/publications/${id}/approve`, { method: "PATCH" });
        await loadPendingPublications();
        await loadAllPublications();
        addActivityLog(`Approved publication #${id}`);
    } catch (error) {
        alert(error.message);
    }
}

async function rejectPublication(id) {
    try {
        await request(`/api/publications/${id}/reject`, { method: "PATCH" });
        await loadPendingPublications();
        await loadAllPublications();
        addActivityLog(`Rejected publication #${id}`);
    } catch (error) {
        alert(error.message);
    }
}

async function deletePublication(id) {
    try {
        await request(`/api/admin/publications/${id}`, { method: "DELETE" });
        await loadPendingPublications();
        await loadAllPublications();
        addActivityLog(`Deleted publication #${id}`);
    } catch (error) {
        alert(error.message);
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
        const bio = document.getElementById("memberBio").value.trim();

        try {
            await request("/api/members", {
                method: "POST",
                body: JSON.stringify({ email, password, role, name, position, bio })
            });

            document.getElementById("createMemberForm").reset();
            await loadMembers();
            addActivityLog(`Added member ${email} (${role})`);
        } catch (error) {
            alert(error.message);
        }
    });
}

async function deleteMember(id) {
    try {
        await request(`/api/members/${id}`, { method: "DELETE" });
        await loadMembers();
        addActivityLog(`Deleted member #${id}`);
    } catch (error) {
        alert(error.message);
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
        window.location.href = "index.html";
    });
}