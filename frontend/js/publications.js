function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getSafePublicationLink(pub) {
    const isHttpUrl = (value) => {
        if (!value || typeof value !== "string") {
            return false;
        }

        try {
            const parsed = new URL(value.trim());
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch (error) {
            return false;
        }
    };

    if (isHttpUrl(pub.link)) {
        return pub.link.trim();
    }

    if (typeof pub.title === "string") {
        const match = pub.title.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
        if (match && isHttpUrl(match[1])) {
            return match[1].trim();
        }
    }

    return "";
}

function stripHtml(value) {
    return String(value).replace(/<[^>]*>/g, "").trim();
}

const PUBLICATION_TYPE_CONFIG = {
    journal: {
        label: "Journal Publications",
        sectionId: "journal-publications",
        listId: "publicationListJournal"
    },
    conference: {
        label: "Conference Proceedings",
        sectionId: "conference-proceedings",
        listId: "publicationListConference"
    },
    manuscript: {
        label: "Unpublished Manuscripts",
        sectionId: "unpublished-manuscripts",
        listId: "publicationListManuscript"
    }
};

const PREVIEW_LIMIT = 5;
const DETAIL_PAGE_SIZE = 10;

function getNormalizedType(value) {
    const normalized = String(value || "").trim().toLowerCase();
    return PUBLICATION_TYPE_CONFIG[normalized] ? normalized : "";
}

function getPublicationsPageUrl() {
    if (typeof window.getPageUrl === "function") {
        return window.getPageUrl("publications.html");
    }
    return "/publications";
}

function buildTypePageUrl(type, page) {
    const params = new URLSearchParams();
    params.set("type", type);
    if (page > 1) {
        params.set("page", String(page));
    }

    return `${getPublicationsPageUrl()}?${params.toString()}`;
}

function getViewStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const type = getNormalizedType(params.get("type"));
    const pageValue = Number.parseInt(params.get("page") || "1", 10);
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;

    return { type, page };
}

function renderPublicationList(rows) {
    const items = rows.map((pub) => {
        const authors = escapeHtml(pub.authors || "Unknown authors");
        const cleanTitle = stripHtml(pub.title || "Untitled publication");
        const title = escapeHtml(cleanTitle || "Untitled publication");
        const journal = escapeHtml(pub.journal || "Unknown journal");
        const year = escapeHtml(pub.year || "N/A");
        const link = escapeHtml(getSafePublicationLink(pub));
        const doi = pub.doi ? `, DOI: ${escapeHtml(pub.doi)}` : "";
        const note = pub.description ? ` (${escapeHtml(pub.description)})` : "";
        const titleMarkup = link
            ? `<a class="publication-title" href="${link}" target="_blank" rel="noopener noreferrer">\"${title}\"</a>`
            : `<span class="publication-title">\"${title}\"</span>`;

        return `<li>${authors}, ${titleMarkup}, ${journal}, ${year}${doi}${note}</li>`;
    }).join("");

    return `<ul class="publication-bullet-list">${items}</ul>`;
}

function renderPublicationItems(listEl, rows) {
    if (!listEl) {
        return;
    }

    if (!rows || rows.length === 0) {
        listEl.innerHTML = "<p>No approved publications available yet.</p>";
        return;
    }

    listEl.innerHTML = renderPublicationList(rows);
}

function renderPreviewSection(listEl, rows, type) {
    if (!listEl) {
        return;
    }

    if (!rows || rows.length === 0) {
        listEl.innerHTML = "<p>No approved publications available yet.</p>";
        return;
    }

    const previewRows = rows.slice(0, PREVIEW_LIMIT);
    let markup = renderPublicationList(previewRows);

    const readMoreUrl = escapeHtml(buildTypePageUrl(type, 1));
    markup += `<p class="publication-read-more-wrap"><a class="publication-read-more" href="${readMoreUrl}">Read more</a></p>`;

    listEl.innerHTML = markup;
}

function renderPagination(totalItems, currentPage, type) {
    const totalPages = Math.max(1, Math.ceil(totalItems / DETAIL_PAGE_SIZE));

    return `
        <div class="publication-pagination" aria-label="Publication pagination">
            <button type="button" class="publication-page-btn" id="publicationPrevBtn" aria-label="Previous page" ${currentPage <= 1 ? "disabled" : ""}>&larr;</button>
            <span class="publication-page-text">${currentPage}/${totalPages}</span>
            <button type="button" class="publication-page-btn" id="publicationNextBtn" aria-label="Next page" ${currentPage >= totalPages ? "disabled" : ""}>&rarr;</button>
        </div>
    `;
}

function setDetailModeLayout(type) {
    const publicationsPage = document.querySelector(".publications-page");
    if (publicationsPage) {
        publicationsPage.classList.toggle("publication-detail-mode", !!type);
    }

    const toc = document.querySelector(".publications-page .toc");
    if (toc) {
        toc.hidden = !!type;
    }

    Object.entries(PUBLICATION_TYPE_CONFIG).forEach(([key, config]) => {
        const section = document.getElementById(config.sectionId);
        if (!section) {
            return;
        }
        section.hidden = !!type && key !== type;
    });
}

function renderTypeDetail(listEl, rows, type, page) {
    if (!listEl) {
        return;
    }

    if (!rows || rows.length === 0) {
        listEl.innerHTML = "<p>No approved publications available yet.</p>";
        return;
    }

    const totalPages = Math.max(1, Math.ceil(rows.length / DETAIL_PAGE_SIZE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * DETAIL_PAGE_SIZE;
    const pageRows = rows.slice(start, start + DETAIL_PAGE_SIZE);

    let markup = `<p class="publication-back-link-wrap"><a class="publication-back-link" href="${escapeHtml(getPublicationsPageUrl())}">&larr; Back to all publication types</a></p>`;
    markup += renderPublicationList(pageRows);
    markup += renderPagination(rows.length, safePage, type);

    listEl.innerHTML = markup;

    const prevBtn = listEl.querySelector("#publicationPrevBtn");
    const nextBtn = listEl.querySelector("#publicationNextBtn");

    if (prevBtn) {
        prevBtn.onclick = (e) => {
            e.preventDefault();
            if (safePage > 1) {
                window.location.href = buildTypePageUrl(type, safePage - 1);
            }
        };
    }

    if (nextBtn) {
        nextBtn.onclick = (e) => {
            e.preventDefault();
            if (safePage < totalPages) {
                window.location.href = buildTypePageUrl(type, safePage + 1);
            }
        };
    }
}

async function loadApprovedPublications() {
    const listJournal = document.getElementById("publicationListJournal");
    const listConference = document.getElementById("publicationListConference");
    const listManuscript = document.getElementById("publicationListManuscript");
    const viewState = getViewStateFromUrl();

    try {
        const response = await fetch(getApiUrl("/api/publications/public"));
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load publications");
        }

        const grouped = {
            journal: [],
            conference: [],
            manuscript: []
        };

        data.forEach((pub) => {
            const type = String(pub.publication_type || "journal").toLowerCase();
            if (!grouped[type]) {
                grouped.journal.push(pub);
                return;
            }
            grouped[type].push(pub);
        });

        setDetailModeLayout(viewState.type);

        if (viewState.type) {
            const config = PUBLICATION_TYPE_CONFIG[viewState.type];
            const selectedList = document.getElementById(config.listId);
            renderTypeDetail(selectedList, grouped[viewState.type], viewState.type, viewState.page);
            return;
        }

        renderPreviewSection(listJournal, grouped.journal, "journal");
        renderPreviewSection(listConference, grouped.conference, "conference");
        renderPreviewSection(listManuscript, grouped.manuscript, "manuscript");
    } catch (error) {
        const message = `<p>${escapeHtml(error.message)}</p>`;
        if (listJournal) listJournal.innerHTML = message;
        if (listConference) listConference.innerHTML = message;
        if (listManuscript) listManuscript.innerHTML = message;
    }
}

loadApprovedPublications();
