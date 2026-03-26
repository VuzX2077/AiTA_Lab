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

function renderPublicationItems(listEl, rows) {
    if (!listEl) {
        return;
    }

    if (!rows || rows.length === 0) {
        listEl.innerHTML = "<p>No approved publications available.</p>";
        return;
    }

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

    listEl.innerHTML = `<ul class="publication-bullet-list">${items}</ul>`;
}

async function loadApprovedPublications() {
    const listJournal = document.getElementById("publicationListJournal");
    const listConference = document.getElementById("publicationListConference");
    const listManuscript = document.getElementById("publicationListManuscript");

    try {
        const response = await fetch(getApiUrl("/api/publications/publications/public"));
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

        renderPublicationItems(listJournal, grouped.journal);
        renderPublicationItems(listConference, grouped.conference);
        renderPublicationItems(listManuscript, grouped.manuscript);
    } catch (error) {
        const message = `<p>${escapeHtml(error.message)}</p>`;
        if (listJournal) listJournal.innerHTML = message;
        if (listConference) listConference.innerHTML = message;
        if (listManuscript) listManuscript.innerHTML = message;
    }
}

loadApprovedPublications();
