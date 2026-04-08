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

function normalizeNavigationLinks() {
	if (typeof window.getPageUrl !== "function") {
		return;
	}

	const navAnchors = document.querySelectorAll("header .nav-container a");
	navAnchors.forEach((anchor) => {
		const href = anchor.getAttribute("href");
		if (!href) {
			return;
		}

		const trimmedHref = href.trim();
		if (!trimmedHref) {
			return;
		}

		if (
			trimmedHref.startsWith("/") ||
			trimmedHref.startsWith("#") ||
			/^(?:https?:|mailto:|tel:|javascript:)/i.test(trimmedHref)
		) {
			return;
		}

		const match = trimmedHref.match(/^\.?\/?([a-z0-9_-]+)\.html(?:[?#].*)?$/i);
		if (!match) {
			return;
		}

		anchor.setAttribute("href", window.getPageUrl(`${match[1]}.html`));
	});
}

normalizeNavigationLinks();

const session = getValidSession();
const token = session ? session.token : null;
const role = session ? session.role : null;
const authActions = document.getElementById("authActions");

if (authActions && token) {
	const dashboardPath = role === "admin" ? getPageUrl("adminDashboard.html") : getPageUrl("memberDashboard.html");

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

function applyOptionalHttpLink(anchor, value) {
	if (!anchor) {
		return;
	}

	const safeUrl = getSafeHttpUrl(value);
	if (safeUrl) {
		anchor.href = safeUrl;
		anchor.target = "_blank";
		anchor.rel = "noopener noreferrer";
		anchor.removeAttribute("aria-disabled");
		anchor.style.pointerEvents = "";
		anchor.style.opacity = "";
		return;
	}

	anchor.href = "#";
	anchor.removeAttribute("target");
	anchor.removeAttribute("rel");
	anchor.setAttribute("aria-disabled", "true");
	anchor.style.pointerEvents = "none";
	anchor.style.opacity = "0.6";
}

function applyOptionalImage(imageElement, value) {
	if (!imageElement) {
		return;
	}

	const safeUrl = getSafeHttpUrl(value);
	if (safeUrl) {
		imageElement.src = safeUrl;
		imageElement.hidden = false;
		return;
	}

	imageElement.removeAttribute("src");
	imageElement.hidden = true;
}

const DEFAULT_HOME_CONTENT = {
	hero_title: "",
	intro_paragraph_1: "",
	intro_paragraph_2: "",
	github_url: "",
	facebook_url: "",
	hero_image_url_1: "",
	hero_image_url_2: "",
	hero_image_url_3: "",
	footer_text: ""
};

let homePageContentCachePromise = null;

function getDefaultHomeContent() {
	return { ...DEFAULT_HOME_CONTENT };
}

async function fetchHomePageContent() {
	if (!homePageContentCachePromise) {
		homePageContentCachePromise = (async () => {
			const response = await fetch(getApiUrl("/api/homepage-content/public"));
			const data = await response.json();

			if (!response.ok) {
				throw new Error((data && data.message) || "Failed to load homepage content");
			}

			return {
				...DEFAULT_HOME_CONTENT,
				...(data && typeof data === "object" ? data : {})
			};
		})();
	}

	try {
		return await homePageContentCachePromise;
	} catch (error) {
		homePageContentCachePromise = null;
		throw error;
	}
}

async function initGlobalFooterText() {
	const footerText = document.getElementById("homeFooterText");
	if (!footerText) {
		return;
	}

	try {
		const data = await fetchHomePageContent();
		footerText.textContent = String(data.footer_text || "").trim();
	} catch (error) {
		footerText.textContent = String(DEFAULT_HOME_CONTENT.footer_text || "");
	}
}



















async function initHomePageContent() {
	const heroTitle = document.getElementById("homeHeroTitle");
	const introParagraph1 = document.getElementById("homeIntroParagraph1");
	const introParagraph2 = document.getElementById("homeIntroParagraph2");
	const githubLink = document.getElementById("homeFollowGithub");
	const facebookLink = document.getElementById("homeFollowFacebook");
	const heroImage1 = document.getElementById("homeHeroImage1");
	const heroImage2 = document.getElementById("homeHeroImage2");
	const heroImage3 = document.getElementById("homeHeroImage3");

	if (!heroTitle || !introParagraph1 || !introParagraph2) {
		return;
	}

	try {
		homePageContentState = await fetchHomePageContent();

		heroTitle.textContent = String(homePageContentState.hero_title || "").trim();
		introParagraph1.textContent = String(homePageContentState.intro_paragraph_1 || "").trim();
		introParagraph2.textContent = String(homePageContentState.intro_paragraph_2 || "").trim();

		applyOptionalHttpLink(githubLink, homePageContentState.github_url || "");
		applyOptionalHttpLink(facebookLink, homePageContentState.facebook_url || "");
		applyOptionalImage(heroImage1, homePageContentState.hero_image_url_1 || "");
		applyOptionalImage(heroImage2, homePageContentState.hero_image_url_2 || "");
		applyOptionalImage(heroImage3, homePageContentState.hero_image_url_3 || "");
	} catch (error) {
		heroTitle.textContent = String(DEFAULT_HOME_CONTENT.hero_title);
		introParagraph1.textContent = String(DEFAULT_HOME_CONTENT.intro_paragraph_1);
		introParagraph2.textContent = String(DEFAULT_HOME_CONTENT.intro_paragraph_2);
		applyOptionalHttpLink(githubLink, DEFAULT_HOME_CONTENT.github_url);
		applyOptionalHttpLink(facebookLink, DEFAULT_HOME_CONTENT.facebook_url);
		applyOptionalImage(heroImage1, DEFAULT_HOME_CONTENT.hero_image_url_1);
		applyOptionalImage(heroImage2, DEFAULT_HOME_CONTENT.hero_image_url_2);
		applyOptionalImage(heroImage3, DEFAULT_HOME_CONTENT.hero_image_url_3);
	}
}

function toNewsSlug(value) {
	return String(value || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-{2,}/g, "-");
}

function getNewsDetailHref(news) {
	const id = Number(news && typeof news === "object" ? news.id : news);
	const title = news && typeof news === "object" ? news.title : "";
	const slug = toNewsSlug(title);
	const basePath = typeof window.getPageUrl === "function" ? window.getPageUrl("newsDetail.html") : "/newsDetail";
	const safeBasePath = String(basePath).replace(/\/$/, "");

	if (slug && Number.isInteger(id) && id > 0) {
		return `/${encodeURIComponent(`${slug}-${id}`)}`;
	}

	if (slug) {
		return `/${encodeURIComponent(slug)}`;
	}

	if (Number.isInteger(id) && id > 0) {
		const separator = safeBasePath.includes("?") ? "&" : "?";
		return `${safeBasePath}${separator}id=${id}`;
	}

	return safeBasePath;
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
		const response = await fetch(getApiUrl("/api/home-news/public?limit=5"));
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
			const newsId = Number(item.id);
			const title = escapeHtml(stripHtml(item.title || "Untitled"));
			const summary = escapeHtml(stripHtml(item.summary || ""));
			const tag = escapeHtml(stripHtml(item.tag || "NEWS"));
			const dateText = escapeHtml(formatHomeNewsDate(item.published_at));
			const summaryImageUrl = typeof item.summary_image_url === "string" && item.summary_image_url.trim() ? item.summary_image_url.trim() : "";
			const detailImageUrl = typeof item.image_url === "string" && item.image_url.trim() ? item.image_url.trim() : "";
			const imageUrl = summaryImageUrl || detailImageUrl;
			const detailHref = getNewsDetailHref(item);
			const ctaLabelRaw = stripHtml(item.cta_label || "KEEP READING");
			const ctaLabel = escapeHtml(ctaLabelRaw || "KEEP READING");

			const readMore = `<a class="home-latest-link" href="${detailHref}">${ctaLabel} &rsaquo;</a>`;

			return `
				<article class="home-latest-item">
					<a href="${detailHref}" aria-label="Read ${title}">
						<img class="home-latest-thumb" src="${escapeHtml(imageUrl)}" alt="${title}">
					</a>
					<div class="home-latest-content">
						<p class="home-latest-tag">${tag}</p>
						<h3 class="home-latest-title"><a href="${detailHref}" class="home-latest-title-link">${title}</a></h3>
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
	if (path.includes("login") || path.includes("dashboard")) {
		return;
	}

	const SEARCH_QUERY_STORAGE_KEY = "siteSearchQuery";
	const SEARCH_ACTIVE_STORAGE_KEY = "siteSearchActive";

	let publicationRows = [];
	let newsRows = [];

	const shell = document.createElement("div");
	shell.className = "site-search-shell";
	shell.innerHTML = `
		<div class="site-search-inner">
			<input id="globalPublicationSearch" type="text" placeholder="Search publications and news..." aria-label="Search publications and news" autocomplete="off">
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

	header.parentNode.insertBefore(shell, header);
	document.body.appendChild(overlay);

	const input = document.getElementById("globalPublicationSearch");
	const clearBtn = document.getElementById("globalSearchClear");
	const resultBox = document.getElementById("globalSearchResults");

	if (!input || !clearBtn || !resultBox) {
		return;
	}

	header.classList.add("site-header-managed");

	const floatingNavShell = document.createElement("div");
	floatingNavShell.className = "site-floating-nav";
	const floatingNav = nav.cloneNode(true);
	const floatingLogout = floatingNav.querySelector("#logoutBtn");
	if (floatingLogout) {
		floatingLogout.removeAttribute("id");
		floatingLogout.setAttribute("data-floating-logout", "true");
	}
	floatingNavShell.appendChild(floatingNav);
	document.body.appendChild(floatingNavShell);

	const renderMessage = (message) => {
		resultBox.innerHTML = `<p class="site-search-message">${escapeHtml(message)}</p>`;
	};

	const closeOverlay = () => {
		overlay.hidden = true;
		document.body.classList.remove("site-search-active");
		sessionStorage.setItem(SEARCH_ACTIVE_STORAGE_KEY, "0");
	};

	const openOverlay = () => {
		overlay.hidden = false;
		document.body.classList.add("site-search-active");
		sessionStorage.setItem(SEARCH_ACTIVE_STORAGE_KEY, "1");
		isFloatingNavVisible = false;
		floatingNavShell.classList.remove("is-visible");
	};

	let isFloatingNavVisible = false;

	const setFloatingNavVisibility = () => {
		if (document.body.classList.contains("site-search-active")) {
			isFloatingNavVisible = false;
			floatingNavShell.classList.remove("is-visible");
			return;
		}

		const headerRect = header.getBoundingClientRect();
		const hideAtMenuTop = headerRect.top >= 1;
		const showAtMenuTop = headerRect.top <= -1;

		if (hideAtMenuTop) {
			isFloatingNavVisible = false;
		} else if (showAtMenuTop) {
			isFloatingNavVisible = true;
		}

		floatingNavShell.classList.toggle("is-visible", isFloatingNavVisible);

		if (isFloatingNavVisible) {
			closeOverlay();
		}
	};

	const renderResults = (query) => {
		const trimmed = query.trim().toLowerCase();
		if (!trimmed) {
			renderMessage("Type to search publications and news.");
			clearBtn.hidden = true;
			return;
		}

		clearBtn.hidden = false;

		const publicationMatches = publicationRows.filter((pub) => {
			const text = [
				stripHtml(pub.title),
				pub.authors,
				pub.journal,
				pub.doi,
				pub.year,
				pub.description
			].join(" ").toLowerCase();

			return text.includes(trimmed);
		}).map((pub) => ({ kind: "publication", data: pub }));

		const newsMatches = newsRows.filter((news) => {
			const text = [
				stripHtml(news.title),
				stripHtml(news.summary),
				stripHtml(news.tag),
				stripHtml(news.content)
			].join(" ").toLowerCase();

			return text.includes(trimmed);
		}).map((news) => ({ kind: "news", data: news }));

		const filtered = publicationMatches.concat(newsMatches).slice(0, 8);

		if (!filtered.length) {
			renderMessage("No publication or news matches your search.");
			return;
		}

		resultBox.innerHTML = filtered.map((item) => {
			if (item.kind === "news") {
				const news = item.data;
				const title = escapeHtml(stripHtml(news.title) || "Untitled news");
				const meta = escapeHtml(["News", stripHtml(news.tag || "NEWS"), formatHomeNewsDate(news.published_at || "")].join(" | "));
				const href = escapeHtml(getNewsDetailHref(news));

				return `
					<a class="site-search-item" href="${href}">
						<strong>${title}</strong>
						<span>${meta}</span>
					</a>
				`;
			}

			const pub = item.data;
			const title = escapeHtml(stripHtml(pub.title) || "Untitled publication");
			const meta = escapeHtml(["Publication", pub.authors || "Unknown authors", pub.journal || "Unknown journal", pub.year || "N/A"].join(" | "));
			const link = getSafePublicationLink(pub);

			if (link) {
				return `
					<a class="site-search-item" href="${escapeHtml(link)}">
						<strong>${title}</strong>
						<span>${meta}</span>
					</a>
				`;
			}

			return `
				<a class="site-search-item" href="${getApiUrl("/publications")}">
					<strong>${title}</strong>
					<span>${meta}</span>
				</a>
			`;
		}).join("");
	};

	try {
		       const [publicationResult, newsResult] = await Promise.allSettled([
			       fetch(getApiUrl("/api/publications/public")),
			       fetch(getApiUrl("/api/home-news/public?limit=12"))
		       ]);
		let hasAnySource = false;

		if (publicationResult.status === "fulfilled") {
			const publicationData = await publicationResult.value.json();
			if (publicationResult.value.ok) {
				publicationRows = Array.isArray(publicationData) ? publicationData : [];
				hasAnySource = true;
			}
		}

		if (newsResult.status === "fulfilled") {
			const newsData = await newsResult.value.json();
			if (newsResult.value.ok) {
				newsRows = Array.isArray(newsData) ? newsData : [];
				hasAnySource = true;
			}
		}

		if (!hasAnySource) {
			throw new Error("Search is temporarily unavailable.");
		}

		renderMessage("Type to search publications and news.");
	} catch (error) {
		renderMessage(error.message || "Search is temporarily unavailable.");
	}

	input.addEventListener("focus", () => {
		openOverlay();
		renderResults(input.value);
	});

	input.addEventListener("input", () => {
		sessionStorage.setItem(SEARCH_QUERY_STORAGE_KEY, input.value);
		openOverlay();
		renderResults(input.value);
	});

	clearBtn.addEventListener("click", () => {
		input.value = "";
		sessionStorage.removeItem(SEARCH_QUERY_STORAGE_KEY);
		renderResults("");
		input.focus();
	});

	overlay.addEventListener("click", (event) => {
		if (event.target === overlay) {
			closeOverlay();
		}
	});

	resultBox.addEventListener("click", (event) => {
		const clickedItem = event.target.closest(".site-search-item");
		if (!clickedItem) {
			return;
		}

		closeOverlay();
	});

	floatingNavShell.addEventListener("click", (event) => {
		const logoutLink = event.target.closest("[data-floating-logout='true']");
		if (!logoutLink) {
			return;
		}

		event.preventDefault();
		clearAuth();
		window.location.href = "/";
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			closeOverlay();
		}
	});

	window.addEventListener("scroll", setFloatingNavVisibility, { passive: true });
	window.addEventListener("resize", () => {
		setFloatingNavVisibility();
	}, { passive: true });

	const savedQuery = sessionStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || "";
	const wasSearchActive = sessionStorage.getItem(SEARCH_ACTIVE_STORAGE_KEY) === "1";
	if (savedQuery) {
		input.value = savedQuery;
		renderResults(savedQuery);
	}
	if (wasSearchActive && savedQuery.trim()) {
		openOverlay();
	}

	setFloatingNavVisibility();
}

initPublicationSearch();
initGlobalFooterText();
initHomePageContent();
initHomeLatestPosts();
