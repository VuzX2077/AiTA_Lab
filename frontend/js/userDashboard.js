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
    `;
});

// Load publications (read-only)
fetch("/api/publications")
.then(res => res.json())
.then(data => {
    const list = document.getElementById("publicationList");
    data.forEach(pub => {
        list.innerHTML += `<p>• ${pub.title}</p>`;
    });
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "index.html";
});