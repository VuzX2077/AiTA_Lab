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

        list.innerHTML = data.map(pub => `
            <div>
                <div>
                    <p><strong>${pub.title}</strong></p>
                    <p><small>Authors: ${pub.authors || "N/A"}</small></p>
                    <p><small>Journal: ${pub.journal || "N/A"}</small></p>
                    <p><small>Year: ${pub.year || "N/A"}</small></p>
                    <p><small>DOI: ${pub.doi || "N/A"}</small></p>
                    <p>${pub.description}</p>
                    <p><small>Status: ${pub.status}</small></p>
                    <p><small>Author: ${pub.owner_email || "N/A"}</small></p>
                </div>
            </div>
        `).join("");
    } catch (error) {
        list.innerHTML = `<p>${error.message}</p>`;
    }
}

loadApprovedPublications();
