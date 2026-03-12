async function loadApprovedPublications() {
    const list = document.getElementById("publicationList");

    if (!list) {
        return;
    }

    try {
        const response = await fetch(getApiUrl("/api/publications/public"));
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

        const items = data.map((pub) => {
            const authors = escapeHtml(pub.authors || "Unknown authors");
            const title = escapeHtml(pub.title || "Untitled publication");
            const journal = escapeHtml(pub.journal || "Unknown journal");
            const year = escapeHtml(pub.year || "N/A");
            const doi = pub.doi ? `, DOI: ${escapeHtml(pub.doi)}` : "";
            const note = pub.description ? ` (${escapeHtml(pub.description)})` : "";

            return `<li>${authors}, <span class="publication-title">\"${title}\"</span>, ${journal}, ${year}${doi}${note}</li>`;
        }).join("");

        list.innerHTML = `<ul class="publication-bullet-list">${items}</ul>`;
    } catch (error) {
        list.innerHTML = `<p>${error.message}</p>`;
    }
}

loadApprovedPublications();
