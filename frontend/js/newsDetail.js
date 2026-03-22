function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
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

function getNewsIdFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));
    return Number.isInteger(id) && id > 0 ? id : null;
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

let currentNews = null;
let adminToken = getAdminToken();

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
    metaEl.innerHTML = `By AiTA@FPTU &bull; <span class="news-detail-tag">${safeTag}</span>`;
    imageEl.src = imageUrl;
    imageEl.alt = item.title || "News cover image";

    const paragraphs = contentSource
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
        .join("");

    contentEl.innerHTML = paragraphs || `<p>${safeSummary}</p>`;

    linksEl.innerHTML = externalUrl
        ? `<a href="${escapeHtml(externalUrl)}" target="_blank" rel="noopener noreferrer" class="news-detail-external-link">Open external source</a>`
        : "";

    status.hidden = true;
    article.hidden = false;
}

function bindAdminForm(item) {
    const panel = document.getElementById("newsAdminPanel");
    const form = document.getElementById("newsAdminForm");
    const idInput = document.getElementById("newsAdminId");
    const imageAssetIdInput = document.getElementById("newsAdminImageAssetId");
    const titleInput = document.getElementById("newsAdminTitle");
    const summaryInput = document.getElementById("newsAdminSummary");
    const contentInput = document.getElementById("newsAdminContent");
    const tagInput = document.getElementById("newsAdminTag");
    const publishedAtInput = document.getElementById("newsAdminPublishedAt");
    const linkInput = document.getElementById("newsAdminLink");
    const isPublishedInput = document.getElementById("newsAdminIsPublished");
    const preview = document.getElementById("newsAdminImagePreview");

    if (!panel || !form || !idInput || !imageAssetIdInput || !titleInput || !summaryInput || !contentInput || !tagInput || !publishedAtInput || !linkInput || !isPublishedInput || !preview) {
        return;
    }

    panel.hidden = false;

    idInput.value = String(item.id || "");
    imageAssetIdInput.value = String(item.image_asset_id || "");
    titleInput.value = item.title || "";
    summaryInput.value = item.summary || "";
    contentInput.value = item.content || "";
    tagInput.value = item.tag || "NEWS";
    publishedAtInput.value = formatDateForInput(item.published_at);
    linkInput.value = item.link || "";
    isPublishedInput.checked = Boolean(item.is_published);

    if (item.image_url) {
        preview.src = item.image_url;
        preview.hidden = false;
    } else {
        preview.hidden = true;
        preview.removeAttribute("src");
    }

    form.addEventListener("submit", saveNewsFromAdminForm);

    const uploadBtn = document.getElementById("newsAdminUploadBtn");
    if (uploadBtn) {
        uploadBtn.addEventListener("click", uploadNewsImageFromAdminForm);
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
    const summaryInput = document.getElementById("newsAdminSummary");
    const contentInput = document.getElementById("newsAdminContent");
    const tagInput = document.getElementById("newsAdminTag");
    const publishedAtInput = document.getElementById("newsAdminPublishedAt");
    const linkInput = document.getElementById("newsAdminLink");
    const isPublishedInput = document.getElementById("newsAdminIsPublished");
    const saveStatus = document.getElementById("newsAdminSaveStatus");

    if (!adminToken || !idInput || !imageAssetIdInput || !titleInput || !summaryInput || !contentInput || !tagInput || !publishedAtInput || !linkInput || !isPublishedInput || !saveStatus) {
        return;
    }

    const imageAssetId = Number(imageAssetIdInput.value);
    if (!Number.isInteger(imageAssetId)) {
        saveStatus.textContent = "Please upload/select a valid image first.";
        return;
    }

    const payload = {
        title: titleInput.value.trim(),
        summary: summaryInput.value.trim(),
        content: contentInput.value.trim(),
        imageAssetId,
        link: linkInput.value.trim(),
        tag: tagInput.value.trim() || "NEWS",
        ctaLabel: currentNews && currentNews.cta_label ? String(currentNews.cta_label).trim() : "KEEP READING",
        publishedAt: formatDateForInput(publishedAtInput.value),
        isPublished: Boolean(isPublishedInput.checked)
    };

    if (!payload.title || !payload.summary || !payload.content || !payload.publishedAt) {
        saveStatus.textContent = "Title, summary, content, and publish date are required.";
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
        saveStatus.textContent = "Saved successfully.";
    } catch (error) {
        saveStatus.textContent = error.message || "Could not save news.";
    }
}

async function loadNewsDetail() {
    const status = document.getElementById("newsDetailStatus");
    if (!status) {
        return;
    }

    const newsId = getNewsIdFromQuery();
    if (!newsId) {
        status.textContent = "Invalid news id.";
        return;
    }

    try {
        let response = await fetch(apiUrl(`/api/home-news/public/${newsId}`));
        let data = await response.json().catch(() => ({}));

        if (!response.ok && adminToken) {
            response = await fetch(apiUrl(`/api/home-news/${newsId}`), {
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

        if (adminToken) {
            bindAdminForm(data);
        }
    } catch (error) {
        status.textContent = error.message || "Failed to load news.";
    }
}

loadNewsDetail();
