document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("http://localhost:3000/api/login", {
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

        alert("Login successful!");
        if (data.role === "admin") {
            window.location.href = "adminDashboard.html";
        } else if (data.role === "user") {
            window.location.href = "userDashboard.html";
        } else {
            window.location.href = "index.html";
        }

    } catch (error) {
        alert("Server error");
    }
});