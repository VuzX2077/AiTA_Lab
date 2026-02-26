const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const authActions = document.getElementById("authActions");

if (authActions && token) {
	const dashboardPath = role === "admin" ? "adminDashboard.html" : "userDashboard.html";

	authActions.innerHTML = `
		<a href="${dashboardPath}">Dashboard</a>
		<a href="#" id="logoutBtn">Logout</a>
	`;

	const logoutBtn = document.getElementById("logoutBtn");
	logoutBtn.addEventListener("click", (e) => {
		e.preventDefault();
		localStorage.removeItem("token");
		localStorage.removeItem("role");
		window.location.href = "index.html";
	});
}
