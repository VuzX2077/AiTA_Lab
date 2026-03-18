function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function formatSeminarDate(value) {
    if (!value) {
        return "N/A";
    }

    const parsedDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
        return escapeHtml(value);
    }

    return parsedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "2-digit"
    }).replace(/ /g, "-");
}

function formatSeminarTime(startTime, endTime) {
    const start = String(startTime || "").trim();
    const end = String(endTime || "").trim();

    if (!start && !end) {
        return "N/A";
    }

    if (!start) {
        return escapeHtml(end);
    }

    if (!end) {
        return escapeHtml(start);
    }

    return `${escapeHtml(start)} - ${escapeHtml(end)}`;
}

function renderSeminars(rows) {
    const body = document.getElementById("seminarTableBody");
    if (!body) {
        return;
    }

    if (!rows || rows.length === 0) {
        body.innerHTML = "<tr><td colspan=\"4\">No seminar schedule available yet.</td></tr>";
        return;
    }

    body.innerHTML = rows.map((seminar, index) => {
        const rowClass = index % 2 === 0 ? "seminar-row-highlight" : "seminar-row-base";
        return `
            <tr class="${rowClass}">
                <td>${formatSeminarDate(seminar.seminar_date)}</td>
                <td>${formatSeminarTime(seminar.start_time, seminar.end_time)}</td>
                <td>${escapeHtml(seminar.member_name || "N/A")}</td>
                <td>${escapeHtml(seminar.title || "Untitled")}</td>
            </tr>
        `;
    }).join("");
}

async function loadSeminars() {
    const body = document.getElementById("seminarTableBody");

    try {
        const response = await fetch("/api/seminars/public");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Failed to load seminars");
        }

        renderSeminars(data);
    } catch (error) {
        if (body) {
            body.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
        }
    }
}

loadSeminars();
