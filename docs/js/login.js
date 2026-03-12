function clearAuth() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (error) {
        return null;
    }
}

function getValidSession() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
        return null;
    }

    const payload = parseJwt(token);
    const isExpired = !payload || !payload.exp || payload.exp * 1000 <= Date.now();

    if (isExpired) {
        clearAuth();
        return null;
    }

    return { role };
}

const session = getValidSession();
if (session) {
    window.location.href = session.role === "admin" ? "./adminDashboard.html" : "./memberDashboard.html";
}

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch(getApiUrl("/api/login"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);

        if (data.role === "admin") {
            window.location.href = "./adminDashboard.html";
        } else if (data.role === "user") {
            window.location.href = "./memberDashboard.html";
        } else {
            window.location.href = "./index.html";
        }

    } catch (error) {
        alert("Server error. If you are using GitHub Pages, set API_BASE_URL in docs/js/config.js.");
    }
});