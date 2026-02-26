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

// Create publication
document.getElementById("createPubForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value;
    const abstract = document.getElementById("abstract").value;

    await fetch("/api/publications", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ title, abstract })
    });

    alert("Publication created");
    location.reload();
});

// Load publications
fetch("/api/publications")
.then(res => res.json())
.then(data => {
    const list = document.getElementById("publicationList");
    data.forEach(pub => {
        list.innerHTML += `
            <div>
                <p><strong>${pub.title}</strong></p>
                <button onclick="deletePub(${pub.id})">Delete</button>
            </div>
        `;
    });
});

async function deletePub(id) {
    await fetch(`/api/publications/${id}`, {
        method: "DELETE",
        headers: {
            "Authorization": "Bearer " + token
        }
    });

    alert("Deleted");
    location.reload();
}

document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
});