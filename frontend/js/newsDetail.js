function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDateForInput(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const datePart = raw.split("T")[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "";
}

function formatDisplayDate(value) {
    const normalized = formatDateForInput(value);
    if (!normalized) {
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

function toNewsSlug(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

function normalizeNewsSlug(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return "";
    }

    let decoded = raw;
    try {
        decoded = decodeURIComponent(raw);
    } catch (error) {
        decoded = raw;
    }

    return toNewsSlug(decoded);
}

function getNewsSlugFromPath() {
    const path = String(window.location.pathname || "");
    const match = path.match(/^\/news\/([^/?#]+)/i);
    return match ? normalizeNewsSlug(match[1]) : "";
}

function getNewsLookupFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    if (Number.isInteger(id) && id > 0) {
        return { id, slug: "" };
    }

    const querySlug = normalizeNewsSlug(params.get("slug"));
    if (querySlug) {
        return { id: null, slug: querySlug };
    }

    const pathSlug = getNewsSlugFromPath();
    return { id: null, slug: pathSlug };
}

function getNewsDetailHref(news) {
    const id = Number(news && typeof news === "object" ? news.id : news);
    const title = news && typeof news === "object" ? news.title : "";
    const slug = toNewsSlug(title);
    const basePath = typeof window.getPageUrl === "function" ? window.getPageUrl("news.html") : "/news";

    if (basePath.toLowerCase().endsWith(".html")) {
        if (slug) {
            return `${basePath}?slug=${encodeURIComponent(slug)}`;
        }
        if (Number.isInteger(id) && id > 0) {
            return `${basePath}?id=${id}`;
        }
        return basePath;
    }

    if (slug) {
        return `${String(basePath).replace(/\/$/, "")}/${encodeURIComponent(slug)}`;
    }

    if (Number.isInteger(id) && id > 0) {
        return `${basePath}?id=${id}`;
    }

    return basePath;
}

function parseJwt(token) {
    try {
        return JSON.parse(atob(token.split(".")[1]));
    } catch (error) {
        return null;
    }
}

function getAdminToken() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "admin") {
        return "";
    }

    const payload = parseJwt(token);
    if (!payload || !payload.exp || payload.exp * 1000 <= Date.now()) {
        return "";
    }

    return token;
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

function apiUrl(path) {
    if (typeof window.getApiUrl === "function") {
        return window.getApiUrl(path);
    }

    return path;
}

function showToast(message, type = "success") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = String(message || "");
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add("show"));

    setTimeout(() => {
        toast.classList.remove("show");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, 2600);
}

function stripHtml(value) {
    return String(value || "").replace(/<[^>]*>/g, "");
}

function truncateText(value, maxLength) {
    const text = String(value || "").trim();
    if (!text || text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

let currentNews = null;
let adminToken = getAdminToken();
let currentAuthors = [];
let newsSearchItems = [];

function buildNewsSearchLabel(item) {
    const title = String(item && item.title ? item.title : "Untitled").trim();
    return `${title} (#${item.id})`;
}

function parseNewsIdFromSearchLabel(value) {
    const raw = String(value || "").trim();
    if (!raw) {
        return null;
    }

    const byLabelMatch = raw.match(/\(#(\d+)\)\s*$/);
    if (byLabelMatch) {
        const parsed = Number(byLabelMatch[1]);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
    }

    const numericOnly = Number(raw);
    return Number.isInteger(numericOnly) && numericOnly > 0 ? numericOnly : null;
}

function resolveTypedNewsId(value) {
    const parsedByLabel = parseNewsIdFromSearchLabel(value);
    if (parsedByLabel) {
        return parsedByLabel;
    }

    const normalizedTitle = String(value || "").trim().toLowerCase();
    if (!normalizedTitle) {
        return null;
    }

    const found = newsSearchItems.find((item) => String(item.title || "").trim().toLowerCase() === normalizedTitle);
    return found ? Number(found.id) : null;
}

function setLinkedNewsFieldValue(inputEl, hiddenEl, newsId) {
    if (!inputEl || !hiddenEl) {
        return;
    }

    if (!Number.isInteger(Number(newsId)) || Number(newsId) <= 0) {
        inputEl.value = "";
        hiddenEl.value = "";
        return;
    }

    const id = Number(newsId);
    const selected = newsSearchItems.find((item) => Number(item.id) === id);
    inputEl.value = selected ? buildNewsSearchLabel(selected) : `#${id}`;
    hiddenEl.value = String(id);
}

function bindLinkedNewsAutocomplete(inputEl, hiddenEl, currentId) {
    if (!inputEl || !hiddenEl) {
        return;
    }

    const syncSelection = () => {
        const resolvedId = resolveTypedNewsId(inputEl.value);
        if (!resolvedId) {
            hiddenEl.value = "";
            return;
        }

        if (Number(resolvedId) === Number(currentId)) {
            inputEl.value = "";
            hiddenEl.value = "";
            return;
        }

        hiddenEl.value = String(resolvedId);
        const selected = newsSearchItems.find((item) => Number(item.id) === resolvedId);
        if (selected) {
            inputEl.value = buildNewsSearchLabel(selected);
        }
    };

    inputEl.addEventListener("change", syncSelection);
    inputEl.addEventListener("blur", syncSelection);
}

async function loadNewsSearchItems() {
    if (!adminToken) {
        newsSearchItems = [];
        return [];
    }

    try {
        const response = await fetch(apiUrl("/api/home-news"), {
            headers: {
                "Authorization": "Bearer " + adminToken
            }
        });

        if (!response.ok) {
            newsSearchItems = [];
            return [];
        }

        const rows = await response.json().catch(() => []);
        newsSearchItems = Array.isArray(rows)
            ? rows
                .filter((row) => Number.isInteger(Number(row.id)))
                .map((row) => ({
                    id: Number(row.id),
                    title: String(row.title || "Untitled")
                }))
            : [];

        return newsSearchItems;
    } catch (error) {
        newsSearchItems = [];
        return [];
    }
}

function renderNewsSearchOptions(currentId) {
    const datalist = document.getElementById("newsAdminNewsOptions");
    if (!datalist) {
        return;
    }

    const options = newsSearchItems
        .filter((item) => Number(item.id) !== Number(currentId))
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((item) => `<option value="${escapeHtml(buildNewsSearchLabel(item))}"></option>`)
        .join("");

    datalist.innerHTML = options;
}

async function fetchMembers() {
    try {
        const response = await fetch(apiUrl("/api/members/public"));
        if (!response.ok) {
            throw new Error("Failed to fetch members");
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching members:", error);
        return [];
    }
}

function renderAuthorsList() {
    const list = document.getElementById("newsAdminAuthorsList");
    if (!list) return;

    list.innerHTML = currentAuthors.map((author, index) => `
        <div class="news-admin-author-item">
            <span>${escapeHtml(author.name)}</span>
            <button type="button" class="news-admin-author-remove" onclick="removeAuthor(${index})">Remove</button>
        </div>
    `).join("");
}

function removeAuthor(index) {
    currentAuthors.splice(index, 1);
    renderAuthorsList();
}

async function openAuthorsModal() {
    const modal = document.getElementById("newsAdminAuthorsModal");
    const list = document.getElementById("newsAdminAuthorsOptionsList");
    if (!modal || !list) return;

    const members = await fetchMembers();
    
    // Filter out already added authors
    const addedIds = new Set(currentAuthors.map(a => a.id));
    const availableMembers = members.filter(m => !addedIds.has(m.member_id));

    list.innerHTML = availableMembers.map(member => `
        <div class="news-admin-author-option" onclick="selectAuthor(${member.member_id}, '${escapeHtml(member.name)}')">
            <span class="news-admin-author-option-name">${escapeHtml(member.name)}</span>
            <span class="news-admin-author-option-role">${escapeHtml(member.position || "Member")}</span>
        </div>
    `).join("");

    modal.classList.add("is-open");
}

function selectAuthor(id, name) {
    currentAuthors.push({ id, name, link: null });
    renderAuthorsList();
    document.getElementById("newsAdminAuthorsModal").classList.remove("is-open");
}

function closeAuthorsModal() {
    const modal = document.getElementById("newsAdminAuthorsModal");
    if (modal) {
        modal.classList.remove("is-open");
    }
}

function buildAuthorHighlightHtml(author) {
    const authorName = typeof author.name === "string" ? author.name.trim() : "";
    if (!authorName) {
        return "";
    }

    const safeName = escapeHtml(authorName);
    const safeLink = getSafeHttpUrl(author.link);

    if (safeLink) {
        return `<a href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer" class="news-inline-author">${safeName}</a>`;
    }

    return `<span class="news-inline-author">${safeName}</span>`;
}

function highlightAuthorsInEscapedText(escapedText, authors) {
    let html = escapedText;
    if (!Array.isArray(authors) || authors.length === 0) {
        return html;
    }

    const normalizedAuthors = authors
        .map((author) => ({
            ...author,
            name: typeof author.name === "string" ? author.name.trim() : ""
        }))
        .filter((author) => author.name)
        .sort((a, b) => b.name.length - a.name.length);

    normalizedAuthors.forEach((author) => {
        const escapedName = escapeHtml(author.name);
        const highlightHtml = buildAuthorHighlightHtml(author);
        if (!escapedName || !highlightHtml) {
            return;
        }

        const pattern = new RegExp(escapeRegExp(escapedName), "gi");
        html = html.replace(pattern, highlightHtml);
    });

    return html;
}

function renderBlockContentHtml(block, authors) {
    const pattern = /\[([^\]]+)\]\(([^\s)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(block)) !== null) {
        const [rawMatch, label, url] = match;
        const before = block.slice(lastIndex, match.index);
        if (before) {
            const beforeHtml = highlightAuthorsInEscapedText(escapeHtml(before), authors).replace(/\n/g, "<br>");
            parts.push(beforeHtml);
        }

        const safeUrl = getSafeHttpUrl(url);
        if (safeUrl) {
            const labelHtml = highlightAuthorsInEscapedText(escapeHtml(label), authors);
            parts.push(`<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" class="news-inline-link">${labelHtml}</a>`);
        } else {
            const rawHtml = highlightAuthorsInEscapedText(escapeHtml(rawMatch), authors);
            parts.push(rawHtml);
        }

        lastIndex = match.index + rawMatch.length;
    }

    const tail = block.slice(lastIndex);
    if (tail) {
        const tailHtml = highlightAuthorsInEscapedText(escapeHtml(tail), authors).replace(/\n/g, "<br>");
        parts.push(tailHtml);
    }

    return parts.join("");
}

function getShareArticleUrl(item) {
    const detailHref = getNewsDetailHref(item);
    return new URL(detailHref, window.location.origin).toString();
}

function renderShareSection(item) {
    const sectionEl = document.getElementById("newsShareSection");
    const facebookEl = document.getElementById("newsShareFacebook");
    const xEl = document.getElementById("newsShareX");
    const linkedInEl = document.getElementById("newsShareLinkedIn");
    const copyEl = document.getElementById("newsShareCopy");

    if (!sectionEl || !facebookEl || !xEl || !linkedInEl || !copyEl) {
        return;
    }

    const articleUrl = getShareArticleUrl(item);
    const articleTitle = String(item && item.title ? item.title : "AiTA Lab News").trim();
    const encodedUrl = encodeURIComponent(articleUrl);
    const encodedTitle = encodeURIComponent(articleTitle);

    facebookEl.href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    xEl.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    linkedInEl.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

    copyEl.onclick = async () => {
        try {
            await navigator.clipboard.writeText(articleUrl);
            showToast("Article link copied", "success");
        } catch (error) {
            showToast("Could not copy article link", "error");
        }
    };

    sectionEl.hidden = false;
}

function renderNewsDetail(item) {
    const article = document.getElementById("newsDetailArticle");
    const status = document.getElementById("newsDetailStatus");
    const dateEl = document.getElementById("newsDetailDate");
    const titleEl = document.getElementById("newsDetailTitle");
    const metaEl = document.getElementById("newsDetailMeta");
    const imageEl = document.getElementById("newsDetailImage");
    const contentEl = document.getElementById("newsDetailContent");
    const linksEl = document.getElementById("newsDetailLinks");

    if (!article || !status || !dateEl || !titleEl || !metaEl || !imageEl || !contentEl || !linksEl) {
        return;
    }

    const safeTitle = escapeHtml(item.title || "Untitled");
    const safeSummary = escapeHtml(item.summary || "");
    const safeTag = escapeHtml(item.tag || "NEWS");
    const safeDate = escapeHtml(formatDisplayDate(item.published_at));
    const imageUrl = typeof item.image_url === "string" ? item.image_url.trim() : "";
    const externalUrl = getSafeHttpUrl(item.link);
    const rawContent = String(item.content || "").trim();
    const contentSource = rawContent || String(item.summary || "");

    dateEl.textContent = safeDate;
    titleEl.textContent = item.title || "Untitled";
    metaEl.innerHTML = `By <span class="news-inline-author">AiTA@FPTU</span> &bull; <span class="news-detail-tag">${safeTag}</span>`;
    imageEl.src = imageUrl;
    imageEl.alt = item.title || "News cover image";

    const paragraphs = contentSource
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${renderBlockContentHtml(block, item.authors)}</p>`)
        .join("");

    contentEl.innerHTML = paragraphs || `<p>${safeSummary}</p>`;

    const authorsEl = document.getElementById("newsDetailAuthors");
    if (authorsEl) {
        authorsEl.hidden = true;
    }

    linksEl.innerHTML = externalUrl
        ? `<a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" class="news-detail-external-link">Open external source</a>`
        : "";

    renderShareSection(item);

    status.hidden = true;
    article.hidden = false;
}

function buildNeighborCardHtml(label, arrow, item) {
    const title = escapeHtml(truncateText(item.title || "Untitled", 68));
    const summary = escapeHtml(truncateText(stripHtml(item.summary || ""), 115));
    const dateText = escapeHtml(formatDisplayDate(item.published_at));

    return `
        <span class="news-neighbor-label">${escapeHtml(label)}</span>
        <div class="news-neighbor-headline">${escapeHtml(arrow)} ${title}</div>
        <p class="news-neighbor-summary">${summary || "Open this article to continue reading."}</p>
        <span class="news-neighbor-date">${dateText}</span>
    `;
}

function renderNewsConnections(data) {
    const section = document.getElementById("newsConnections");
    const newerEl = document.getElementById("newsNavNewer");
    const olderEl = document.getElementById("newsNavOlder");

    if (!section || !newerEl || !olderEl) {
        return;
    }

    const left = data && data.left ? data.left : null;
    const right = data && data.right ? data.right : null;

    if (left) {
        newerEl.href = getNewsDetailHref(left);
        newerEl.innerHTML = buildNeighborCardHtml("Left connection", "←", left);
        newerEl.hidden = false;
    } else {
        newerEl.hidden = true;
        newerEl.removeAttribute("href");
        newerEl.innerHTML = "";
    }

    if (right) {
        olderEl.href = getNewsDetailHref(right);
        olderEl.innerHTML = buildNeighborCardHtml("Right connection", "→", right);
        olderEl.hidden = false;
    } else {
        olderEl.hidden = true;
        olderEl.removeAttribute("href");
        olderEl.innerHTML = "";
    }

    section.hidden = !left && !right;
}

async function loadNewsConnections(newsId) {
    try {
        const response = await fetch(apiUrl(`/api/home-news/public/${newsId}/connections?limit=3`));
        if (!response.ok) {
            return;
        }

        const data = await response.json().catch(() => null);
        if (!data) {
            return;
        }

        renderNewsConnections(data);
    } catch (error) {
        // Do not block detail rendering when the connections panel fails.
    }
}

async function bindAdminForm(item) {
    const panel = document.getElementById("newsAdminPanel");
    const btnContainer = document.getElementById("newsEditBtnContainer");
    const editBtn = document.getElementById("newsEditBtn");
    const modal = document.getElementById("newsEditModal");
    const closeBtn = document.getElementById("newsModalClose");
    
    const form = document.getElementById("newsAdminForm");
    const idInput = document.getElementById("newsAdminId");
    const imageAssetIdInput = document.getElementById("newsAdminImageAssetId");
    const titleInput = document.getElementById("newsAdminTitle");
    const contentInput = document.getElementById("newsAdminContent");
    const tagInput = document.getElementById("newsAdminTag");
    const publishedAtInput = document.getElementById("newsAdminPublishedAt");
    const leftNewsSearchInput = document.getElementById("newsAdminLeftNewsSearch");
    const leftNewsIdInput = document.getElementById("newsAdminLeftNewsId");
    const rightNewsSearchInput = document.getElementById("newsAdminRightNewsSearch");
    const rightNewsIdInput = document.getElementById("newsAdminRightNewsId");
    const linkInput = document.getElementById("newsAdminLink");
    const isPublishedInput = document.getElementById("newsAdminIsPublished");
    const preview = document.getElementById("newsAdminImagePreview");

    if (!form || !idInput || !imageAssetIdInput || !titleInput || !contentInput || !tagInput || !publishedAtInput || !leftNewsSearchInput || !leftNewsIdInput || !rightNewsSearchInput || !rightNewsIdInput || !linkInput || !isPublishedInput || !preview) {
        return;
    }

    // Show edit button, hide old admin panel
    if (panel) {
        panel.hidden = true;
    }
    if (btnContainer) {
        btnContainer.hidden = false;
    }

    // Set up modal controls
    if (editBtn && modal && closeBtn) {
        editBtn.addEventListener("click", () => {
            modal.classList.add("is-open");
        });

        closeBtn.addEventListener("click", () => {
            modal.classList.remove("is-open");
        });

        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("is-open");
            }
        });

        // Close on Escape key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("is-open")) {
                modal.classList.remove("is-open");
            }
        });
    }

    idInput.value = String(item.id || "");
    imageAssetIdInput.value = String(item.image_asset_id || "");
    titleInput.value = item.title || "";
    contentInput.value = (item.content || "");
    tagInput.value = item.tag || "NEWS";
    publishedAtInput.value = formatDateForInput(item.published_at);
    linkInput.value = item.link || "";
    isPublishedInput.checked = Boolean(item.is_published);

    await loadNewsSearchItems();
    renderNewsSearchOptions(item.id);
    setLinkedNewsFieldValue(leftNewsSearchInput, leftNewsIdInput, Number(item.left_news_id));
    setLinkedNewsFieldValue(rightNewsSearchInput, rightNewsIdInput, Number(item.right_news_id));
    bindLinkedNewsAutocomplete(leftNewsSearchInput, leftNewsIdInput, item.id);
    bindLinkedNewsAutocomplete(rightNewsSearchInput, rightNewsIdInput, item.id);

    if (item.image_url) {
        preview.src = item.image_url;
        preview.hidden = false;
    } else {
        preview.hidden = true;
        preview.removeAttribute("src");
    }

    form.addEventListener("submit", (e) => {
        saveNewsFromAdminForm(e);
        // Close modal after save
        if (modal) {
            modal.classList.remove("is-open");
        }
    });

    const uploadBtn = document.getElementById("newsAdminUploadBtn");
    if (uploadBtn) {
        uploadBtn.addEventListener("click", uploadNewsImageFromAdminForm);
    }

    // Initialize authors
    currentAuthors = item.authors && Array.isArray(item.authors) ? item.authors.map(a => ({
        id: a.id,
        name: a.name,
        link: a.link || null
    })) : [];
    renderAuthorsList();

    // Set up authors modal
    const addAuthorBtn = document.getElementById("newsAdminAddAuthorBtn");
    if (addAuthorBtn) {
        addAuthorBtn.addEventListener("click", openAuthorsModal);
    }

    const authorsModal = document.getElementById("newsAdminAuthorsModal");
    if (authorsModal) {
        // Allow clicking backdrop to close
        authorsModal.addEventListener("click", (e) => {
            if (e.target === authorsModal) {
                closeAuthorsModal();
            }
        });
        
        // Allow Escape key to close
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && authorsModal.classList.contains("is-open")) {
                closeAuthorsModal();
            }
        });
    }
}

async function uploadNewsImageFromAdminForm() {
    const fileInput = document.getElementById("newsAdminImageFile");
    const imageAssetIdInput = document.getElementById("newsAdminImageAssetId");
    const statusEl = document.getElementById("newsAdminUploadStatus");
    const preview = document.getElementById("newsAdminImagePreview");
    const uploadBtn = document.getElementById("newsAdminUploadBtn");

    if (!adminToken || !fileInput || !imageAssetIdInput || !uploadBtn) {
        return;
    }

    const file = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
    if (!file) {
        if (statusEl) {
            statusEl.textContent = "Please choose an image first.";
        }
        return;
    }

    uploadBtn.disabled = true;
    if (statusEl) {
        statusEl.textContent = "Uploading image...";
    }

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(apiUrl("/api/uploads/images"), {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + adminToken
            },
            body: formData
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || "Failed to upload image");
        }

        imageAssetIdInput.value = String(data.id || "");
        if (preview && data.url) {
            preview.src = data.url;
            preview.hidden = false;
        }

        if (statusEl) {
            statusEl.textContent = "Upload successful.";
        }
    } catch (error) {
        if (statusEl) {
            statusEl.textContent = error.message || "Upload failed.";
        }
    } finally {
        uploadBtn.disabled = false;
    }
}

async function saveNewsFromAdminForm(event) {
    event.preventDefault();

    const idInput = document.getElementById("newsAdminId");
    const imageAssetIdInput = document.getElementById("newsAdminImageAssetId");
    const titleInput = document.getElementById("newsAdminTitle");
    const contentInput = document.getElementById("newsAdminContent");
    const tagInput = document.getElementById("newsAdminTag");
    const publishedAtInput = document.getElementById("newsAdminPublishedAt");
    const leftNewsSearchInput = document.getElementById("newsAdminLeftNewsSearch");
    const leftNewsIdInput = document.getElementById("newsAdminLeftNewsId");
    const rightNewsSearchInput = document.getElementById("newsAdminRightNewsSearch");
    const rightNewsIdInput = document.getElementById("newsAdminRightNewsId");
    const linkInput = document.getElementById("newsAdminLink");
    const isPublishedInput = document.getElementById("newsAdminIsPublished");
    const saveStatus = document.getElementById("newsAdminSaveStatus");

    if (!adminToken || !idInput || !imageAssetIdInput || !titleInput || !contentInput || !tagInput || !publishedAtInput || !leftNewsSearchInput || !leftNewsIdInput || !rightNewsSearchInput || !rightNewsIdInput || !linkInput || !isPublishedInput || !saveStatus) {
        return;
    }

    const imageAssetId = Number(imageAssetIdInput.value);
    if (!Number.isInteger(imageAssetId)) {
        saveStatus.textContent = "Please upload/select a valid image first.";
        showToast("Please upload/select a valid image first.", "error");
        return;
    }

    const currentId = Number(idInput.value);
    const leftNewsId = leftNewsIdInput.value ? Number(leftNewsIdInput.value) : resolveTypedNewsId(leftNewsSearchInput.value);
    const rightNewsId = rightNewsIdInput.value ? Number(rightNewsIdInput.value) : resolveTypedNewsId(rightNewsSearchInput.value);

    if (leftNewsSearchInput.value.trim() && (!Number.isInteger(leftNewsId) || leftNewsId <= 0)) {
        saveStatus.textContent = "Left connected news is invalid. Please choose from suggestions.";
        showToast("Left connected news is invalid. Please choose from suggestions.", "error");
        return;
    }

    if (rightNewsSearchInput.value.trim() && (!Number.isInteger(rightNewsId) || rightNewsId <= 0)) {
        saveStatus.textContent = "Right connected news is invalid. Please choose from suggestions.";
        showToast("Right connected news is invalid. Please choose from suggestions.", "error");
        return;
    }

    if (Number.isInteger(leftNewsId) && leftNewsId === currentId) {
        saveStatus.textContent = "Left connected news cannot be the current article.";
        showToast("Left connected news cannot be the current article.", "error");
        return;
    }

    if (Number.isInteger(rightNewsId) && rightNewsId === currentId) {
        saveStatus.textContent = "Right connected news cannot be the current article.";
        showToast("Right connected news cannot be the current article.", "error");
        return;
    }

    if (Number.isInteger(leftNewsId) && Number.isInteger(rightNewsId) && leftNewsId === rightNewsId) {
        saveStatus.textContent = "Left and right connected news must be different.";
        showToast("Left and right connected news must be different.", "error");
        return;
    }

    const payload = {
        title: titleInput.value.trim(),
        summary: currentNews && typeof currentNews.summary === "string" ? currentNews.summary : "",
        content: contentInput.value.trim(),
        imageAssetId,
        summaryImageAssetId: currentNews && Number.isInteger(Number(currentNews.summary_image_asset_id))
            ? Number(currentNews.summary_image_asset_id)
            : undefined,
        leftNewsId: Number.isInteger(leftNewsId) ? leftNewsId : null,
        rightNewsId: Number.isInteger(rightNewsId) ? rightNewsId : null,
        link: linkInput.value.trim(),
        tag: tagInput.value.trim() || "NEWS",
        ctaLabel: currentNews && currentNews.cta_label ? String(currentNews.cta_label).trim() : "KEEP READING",
        publishedAt: formatDateForInput(publishedAtInput.value),
        isPublished: Boolean(isPublishedInput.checked),
        authors: currentAuthors || []
    };

    if (!payload.title || !payload.content || !payload.publishedAt) {
        saveStatus.textContent = "Title, content, and publish date are required.";
        showToast("Title, content, and publish date are required.", "error");
        return;
    }

    saveStatus.textContent = "Saving...";

    try {
        const response = await fetch(apiUrl(`/api/home-news/${idInput.value}`), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + adminToken
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.message || "Failed to save news");
        }

        currentNews = { ...currentNews, ...data };
        renderNewsDetail(currentNews);
        loadNewsConnections(currentId);
        saveStatus.textContent = "Saved successfully.";
        showToast("News updated", "success");
    } catch (error) {
        saveStatus.textContent = error.message || "Could not save news.";
        showToast(error.message || "Could not save news.", "error");
    }
}

async function loadNewsDetail() {
    const status = document.getElementById("newsDetailStatus");
    if (!status) {
        return;
    }

    const lookup = getNewsLookupFromUrl();
    if (!lookup.id && !lookup.slug) {
        status.textContent = "Invalid news link.";
        return;
    }

    try {
        let response;
        if (lookup.id) {
            response = await fetch(apiUrl(`/api/home-news/public/${lookup.id}`));
        } else {
            response = await fetch(apiUrl(`/api/home-news/public/slug/${encodeURIComponent(lookup.slug)}`));
        }

        let data = await response.json().catch(() => ({}));

        if (!response.ok && adminToken && lookup.id) {
            response = await fetch(apiUrl(`/api/home-news/${lookup.id}`), {
                headers: {
                    "Authorization": "Bearer " + adminToken
                }
            });
            data = await response.json().catch(() => ({}));
        }

        if (!response.ok) {
            throw new Error(data.message || "News not found");
        }

        currentNews = data;
        renderNewsDetail(data);
        loadNewsConnections(Number(data.id));

        const canonicalPath = new URL(getNewsDetailHref(data), window.location.origin);
        if (window.location.pathname !== canonicalPath.pathname || window.location.search !== canonicalPath.search) {
            window.history.replaceState({}, "", canonicalPath.pathname + canonicalPath.search);
        }

        if (adminToken) {
            bindAdminForm(data);
        }
    } catch (error) {
        status.textContent = error.message || "Failed to load news.";
    }
}

loadNewsDetail();
