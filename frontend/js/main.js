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

	return { token, role };
}

const session = getValidSession();
const token = session ? session.token : null;
const role = session ? session.role : null;
const authActions = document.getElementById("authActions");

if (authActions && token) {
	const dashboardPath = role === "admin" ? "../admin/adminDashboard.html" : "../member/memberDashboard.html";

	authActions.innerHTML = `
		<a href="${dashboardPath}">Dashboard</a>
		<a href="#" id="logoutBtn">Logout</a>
	`;

	const logoutBtn = document.getElementById("logoutBtn");
	logoutBtn.addEventListener("click", (e) => {
		e.preventDefault();
		clearAuth();
		window.location.href = "index.html";
	});
}
