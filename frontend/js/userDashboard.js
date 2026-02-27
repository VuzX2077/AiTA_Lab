const token = localStorage.getItem("token");

if (!token) {
    window.location.href = "login.html";
}

// Decode JWT
function parseJwt(token) {
    return JSON.parse(atob(token.split('.')[1]));
}

const user = parseJwt(token);

if (user.role !== "user") {
    window.location.href = "adminDashboard.html";
}

let editingPublicationId = null;
let myPublications = [];

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

// Load profile
fetch("/api/profile", {
    headers: {
        "Authorization": "Bearer " + token
    }
})
.then(res => res.json())
.then(data => {
    document.getElementById("profileInfo").innerHTML = `
        <p><strong>User ID:</strong> ${data.user.id}</p>
        <p><strong>Role:</strong> ${data.user.role}</p>
        <p><strong>Permissions:</strong> Create / Edit / Delete your own publications</p>
    `;
});

async function loadMyPublications() {
    try {
        const data = await request("/api/my-publications", { method: "GET" });
        myPublications = data;
        const list = document.getElementById("publicationList");

        if (data.length === 0) {
            list.innerHTML = "<p>You have no publications yet.</p>";
            return;
        }

        list.innerHTML = data.map(pub => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong> (${pub.status})</p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
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

document.getElementById("createPubForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const year = document.getElementById("year").value;
    const description = document.getElementById("description").value.trim();
    const submitButton = e.target.querySelector("button[type='submit']");

    try {
        if (editingPublicationId) {
            await request(`/api/publications/${editingPublicationId}`, {
                method: "PUT",
                body: JSON.stringify({ title, year, description })
            });
            editingPublicationId = null;
            submitButton.textContent = "Create";
        } else {
            await request("/api/publications", {
                method: "POST",
                body: JSON.stringify({ title, year, description })
            });
        }

        document.getElementById("createPubForm").reset();
        await loadMyPublications();
    } catch (error) {
        alert(error.message);
    }
});

function startEditPublication(publication) {
    editingPublicationId = publication.id;
    document.getElementById("title").value = publication.title;
    document.getElementById("year").value = publication.year || "";
    document.getElementById("description").value = publication.description;
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

loadMyPublications();

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
});