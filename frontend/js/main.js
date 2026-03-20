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
	const dashboardPath = role === "admin" ? "/adminDashboard" : "/memberDashboard";

	authActions.innerHTML = `
		<a href="${dashboardPath}">Dashboard</a>
		<a href="#" id="logoutBtn">Logout</a>
	`;

	const logoutBtn = document.getElementById("logoutBtn");
	logoutBtn.addEventListener("click", (e) => {
		e.preventDefault();
		clearAuth();
		window.location.href = "/";
	});
}

function stripHtml(value) {
	return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function getSafePublicationLink(pub) {
	if (!pub || typeof pub.link !== "string" || !pub.link.trim()) {
		return "";
	}

	try {
		const parsed = new URL(pub.link.trim());
		if (parsed.protocol === "http:" || parsed.protocol === "https:") {
			return parsed.toString();
		}
	} catch (error) {
		return "";
	}

	return "";
}

function formatHomeNewsDate(value) {
	const raw = String(value || "").trim();
	if (!raw) {
		return "N/A";
	}

	const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : raw.split("T")[0];
	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		return "N/A";
	}

	const [yyyy, mm, dd] = normalized.split("-");
	const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const monthIndex = Number(mm) - 1;
	const dayNumber = Number(dd);

	if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(dayNumber)) {
		return "N/A";
	}

	return `${monthNames[monthIndex]} ${dayNumber}, ${yyyy}`;
}

function getSafeHttpUrl(value) {
	if (typeof value !== "string" || !value.trim()) {
		return "";
	}

	try {
		const parsed = new URL(value.trim());
		if (parsed.protocol === "http:" || parsed.protocol === "https:") {
			return parsed.toString();
		}
	} catch (error) {
		return "";
	}

	return "";
}

async function initHomeLatestPosts() {
	const list = document.getElementById("homeLatestPostsList");
	if (!list) {
		return;
	}

	const renderEmpty = (message) => {
		list.innerHTML = `<p class="home-latest-empty">${escapeHtml(message)}</p>`;
	};

	try {
		const response = await fetch("/api/home-news/public?limit=6");
		const rows = await response.json();

		if (!response.ok) {
			throw new Error((rows && rows.message) || "Failed to load latest posts");
		}

		const items = Array.isArray(rows) ? rows : [];
		if (!items.length) {
			renderEmpty("No latest posts yet.");
			return;
		}

		list.innerHTML = items.map((item) => {
			const title = escapeHtml(stripHtml(item.title || "Untitled"));
			const summary = escapeHtml(stripHtml(item.summary || ""));
			const tag = escapeHtml(stripHtml(item.tag || "NEWS"));
			const dateText = escapeHtml(formatHomeNewsDate(item.published_at));
			const imageUrl = typeof item.image_url === "string" && item.image_url.trim() ? item.image_url.trim() : "";
			const safeLink = getSafeHttpUrl(item.link);

			const readMore = safeLink
				? `<a class="home-latest-link" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">KEEP READING ›</a>`
				: `<a class="home-latest-link" href="/publications">KEEP READING ›</a>`;

			return `
				<article class="home-latest-item">
					<img class="home-latest-thumb" src="${escapeHtml(imageUrl)}" alt="${title}">
					<div class="home-latest-content">
						<p class="home-latest-tag">${tag}</p>
						<h3 class="home-latest-title">${title}</h3>
						<p class="home-latest-summary">${summary}</p>
						<div class="home-latest-meta">
							<p class="home-latest-date">${dateText}</p>
							${readMore}
						</div>
					</div>
				</article>
			`;
		}).join("");
	} catch (error) {
		renderEmpty(error.message || "Latest posts are temporarily unavailable.");
	}
}

async function initPublicationSearch() {
	const header = document.querySelector("header");
	const nav = document.querySelector(".nav-container");
	if (!header || !nav) {
		return;
	}

	const path = window.location.pathname.toLowerCase();
	if (path.includes("login") || path.includes("register") || path.includes("dashboard")) {
		return;
	}

	let publicationRows = [];

	const shell = document.createElement("div");
	shell.className = "site-search-shell";
	shell.innerHTML = `
		<div class="site-search-inner">
			<input id="globalPublicationSearch" type="search" placeholder="Search publications..." aria-label="Search publications" autocomplete="off">
			<button id="globalSearchClear" type="button" aria-label="Clear search" hidden>×</button>
		</div>
	`;

	const overlay = document.createElement("div");
	overlay.className = "site-search-overlay";
	overlay.hidden = true;
	overlay.innerHTML = `
		<div class="site-search-result-wrap">
			<div id="globalSearchResults" class="site-search-results"></div>
		</div>
	`;

	header.insertBefore(shell, nav);
	document.body.appendChild(overlay);

	const input = document.getElementById("globalPublicationSearch");
	const clearBtn = document.getElementById("globalSearchClear");
	const resultBox = document.getElementById("globalSearchResults");

	if (!input || !clearBtn || !resultBox) {
		return;
	}

	const renderMessage = (message) => {
		resultBox.innerHTML = `<p class="site-search-message">${escapeHtml(message)}</p>`;
	};

	const closeOverlay = () => {
		overlay.hidden = true;
		document.body.classList.remove("site-search-active");
	};

	const openOverlay = () => {
		overlay.hidden = false;
		document.body.classList.add("site-search-active");
	};

	const setShellVisibility = () => {
		const isAtTop = window.scrollY <= 30;
		shell.classList.toggle("is-hidden", !isAtTop);

		if (!isAtTop) {
			closeOverlay();
		}
	};

	const renderResults = (query) => {
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) {
			renderMessage("Type to search publications.");
			clearBtn.hidden = true;
			return;
		}

		clearBtn.hidden = false;

		const filtered = publicationRows.filter((pub) => {
			const text = [
				stripHtml(pub.title),
				pub.authors,
				pub.journal,
				pub.doi,
				pub.year,
				pub.description
			].join(" ").toLowerCase();

			return text.includes(trimmed);
		}).slice(0, 8);

		if (!filtered.length) {
			renderMessage("No publication matches your search.");
			return;
		}

		resultBox.innerHTML = filtered.map((pub) => {
			const title = escapeHtml(stripHtml(pub.title) || "Untitled publication");
			const meta = escapeHtml([pub.authors || "Unknown authors", pub.journal || "Unknown journal", pub.year || "N/A"].join(" | "));
			const link = getSafePublicationLink(pub);

			if (link) {
				return `
					<a class="site-search-item" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">
						<strong>${title}</strong>
						<span>${meta}</span>
					</a>
				`;
			}

			return `
				<a class="site-search-item" href="/publications">
					<strong>${title}</strong>
					<span>${meta}</span>
				</a>
			`;
		}).join("");
	};

	try {
		const response = await fetch("/api/publications/public");
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Failed to load publication search index");
		}

		publicationRows = Array.isArray(data) ? data : [];
		renderMessage("Type to search publications.");
	} catch (error) {
		renderMessage(error.message || "Search is temporarily unavailable.");
	}

	input.addEventListener("focus", () => {
		if (window.scrollY <= 30) {
			openOverlay();
			renderResults(input.value);
		}
	});

	input.addEventListener("input", () => {
		if (window.scrollY > 30) {
			return;
		}

		openOverlay();
		renderResults(input.value);
	});

	clearBtn.addEventListener("click", () => {
		input.value = "";
		renderResults("");
		input.focus();
	});

	overlay.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closeOverlay();
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeOverlay();
		}
	});

	window.addEventListener("scroll", setShellVisibility, { passive: true });
	setShellVisibility();
}

initPublicationSearch();
initHomeLatestPosts();
