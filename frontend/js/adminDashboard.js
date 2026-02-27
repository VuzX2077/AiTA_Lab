const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

function parseJwt(token) {
    return JSON.parse(atob(token.split('.')[1]));
}

const user = parseJwt(token);

if (user.role !== "admin") {
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
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p>${pub.description}</p>
                    <p><small>By: ${pub.owner_email || "Unknown"}</small></p>
                </div>
                <div>
                    <button onclick="approvePublication(${pub.id})">Approve</button>
                    <button onclick="deletePublication(${pub.id})">Delete</button>
                </div>
            </div>
        `).join("");
    } catch (error) {
        alert(error.message);
    }
}

async function loadAllPublications() {
    try {
        const data = await request("/api/publications", { method: "GET" });
        const list = document.getElementById("publicationList");

        if (data.length === 0) {
            list.innerHTML = "<p>No publications.</p>";
            return;
        }

        list.innerHTML = data.map(pub => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong> (${pub.status})</p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p><small>By: ${pub.owner_email || "Unknown"}</small></p>
                </div>
                <button onclick="deletePublication(${pub.id})">Delete</button>
            </div>
        `).join("");
    } catch (error) {
        alert(error.message);
    }
}

async function loadMembers() {
    try {
        const data = await request("/api/members", { method: "GET" });
        const list = document.getElementById("memberList");

        if (data.length === 0) {
            list.innerHTML = "<p>No members.</p>";
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
    } catch (error) {
        alert(error.message);
    }
}

async function approvePublication(id) {
    try {
        await request(`/api/publications/${id}/approve`, { method: "PATCH" });
        await loadPendingPublications();
        await loadAllPublications();
    } catch (error) {
        alert(error.message);
    }
}

async function deletePublication(id) {
    try {
        await request(`/api/publications/${id}`, { method: "DELETE" });
        await loadPendingPublications();
        await loadAllPublications();
    } catch (error) {
        alert(error.message);
    }
}

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
    } catch (error) {
        alert(error.message);
    }
});

async function deleteMember(id) {
    try {
        await request(`/api/members/${id}`, { method: "DELETE" });
        await loadMembers();
    } catch (error) {
        alert(error.message);
    }
}

window.approvePublication = approvePublication;
window.deletePublication = deletePublication;
window.deleteMember = deleteMember;

loadPendingPublications();
loadAllPublications();
loadMembers();

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
});