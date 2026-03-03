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
    window.location.href = "login.html";
} else if (user.role !== "user") {
    isAuthValid = false;
    window.location.href = "adminDashboard.html";
}

let editingPublicationId = null;
let myPublications = [];

const sidebarLinks = document.querySelectorAll(".sidebar-link[data-target]");
const dashboardPanels = document.querySelectorAll(".dashboard-panel");

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
            window.location.href = "login.html";
        }
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// Load profile
if (isAuthValid) {
    fetch("/api/profile", {
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(async (res) => {
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                clearAuth();
                window.location.href = "login.html";
            }

            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.message || "Failed to load profile");
        }

        return res.json();
    })
    .then(data => {
        document.getElementById("profileInfo").innerHTML = `
            <p><strong>User ID:</strong> ${data.user.id}</p>
            <p><strong>Role:</strong> ${data.user.role}</p>
            <p><strong>Permissions:</strong> Create / Edit / Delete your own publications</p>
        `;
    })
    .catch((error) => {
        if (error.message) {
            alert(error.message);
        }
    });
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
        alert(error.message);
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
        const authors = document.getElementById("authors").value.trim();
        const journal = document.getElementById("journal").value.trim();
        const year = document.getElementById("year").value;
        const description = document.getElementById("description").value.trim();
        const doiInput = document.getElementById("doi").value.trim();
        const doi = doiInput || null;
        const submitButton = e.target.querySelector("button[type='submit']");

        try {
            if (editingPublicationId) {
                await request(`/api/publications/${editingPublicationId}`, {
                    method: "PUT",
                    body: JSON.stringify({ title, authors, journal, year, description, doi })
                });
                editingPublicationId = null;
                submitButton.textContent = "Create";
            } else {
                await request("/api/publications", {
                    method: "POST",
                    body: JSON.stringify({ title, authors, journal, year, description, doi })
                });
            }

            document.getElementById("createPubForm").reset();
            await loadMyPublications();
        } catch (error) {
            alert(error.message);
        }
    });
}

function startEditPublication(publication) {
    editingPublicationId = publication.id;
    showSection("submitSection");
    document.getElementById("title").value = publication.title;
    document.getElementById("authors").value = publication.authors || "";
    document.getElementById("journal").value = publication.journal || "";
    document.getElementById("year").value = publication.year || "";
    document.getElementById("description").value = publication.description;
    document.getElementById("doi").value = publication.doi || "";
    document.querySelector("#createPubForm button[type='submit']").textContent = "Update";
}

async function deletePublication(id) {
    try {
        await request(`/api/publications/${id}`, { method: "DELETE" });

        if (editingPublicationId === id) {
            editingPublicationId = null;
            document.getElementById("createPubForm").reset();
            document.querySelector("#createPubForm button[type='submit']").textContent = "Create";
        }

        await loadMyPublications();
    } catch (error) {
        alert(error.message);
    }
}

window.startEditPublication = startEditPublication;

if (isAuthValid) {
    loadMyPublications();
    showSection("profileSection");

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        clearAuth();
        window.location.href = "index.html";
    });
}