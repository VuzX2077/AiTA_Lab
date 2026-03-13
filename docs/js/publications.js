async function loadApprovedPublications() {
    const list = document.getElementById("publicationList");

    if (!list) {
        return;
    }

    try {
        const response = await fetch("/api/publications/public");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load publications");
        }

        if (data.length === 0) {
            list.innerHTML = "<p>No approved publications available.</p>";
            return;
        }

        const escapeHtml = (value) => String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const getSafePublicationLink = (pub) => {
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

            // Backward compatibility for old records that stored <a href="..."> inside title.
            if (typeof pub.title === "string") {
                const match = pub.title.match(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
                if (match && isHttpUrl(match[1])) {
                    return match[1].trim();
                }
            }

            return "";
        };

        const stripHtml = (value) => String(value).replace(/<[^>]*>/g, "").trim();

        const items = data.map((pub) => {
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

        list.innerHTML = `<ul class="publication-bullet-list">${items}</ul>`;
    } catch (error) {
        list.innerHTML = `<p>${error.message}</p>`;
    }
}

loadApprovedPublications();
