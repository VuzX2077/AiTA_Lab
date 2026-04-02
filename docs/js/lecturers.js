function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function toArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) {
            return [];
        }

        try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    return [];
}

function getApi(path) {
    if (typeof window.getApiUrl === "function") {
        return window.getApiUrl(path);
    }
    return path;
}

function toMemberSlug(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");
}

function getMemberDetailHref(lecturer) {
    const memberId = Number(lecturer && lecturer.member_id);
    if (!Number.isInteger(memberId) || memberId <= 0) {
        return "";
    }

    const name = String(lecturer && lecturer.name ? lecturer.name : "").trim();
    const slug = toMemberSlug(name);
    if (slug) {
        return `/member/${encodeURIComponent(`${slug}-${memberId}`)}`;
    }

    return `/member/${memberId}`;
}

let lecturerItemsCache = [];

function normalizeCourses(lecturer) {
    const subjects = toArray(lecturer && lecturer.teaching_subjects);
    return subjects.map((item) => String(item || "").trim()).filter(Boolean);
}

function renderLecturerCard(lecturer) {
    const name = escapeHtml(lecturer && lecturer.name ? lecturer.name : "Unknown Lecturer");
    const specialization = escapeHtml(lecturer && lecturer.specialization ? lecturer.specialization : "Updating specialization");
    const bio = escapeHtml(lecturer && lecturer.bio ? lecturer.bio : "No profile summary yet.");
    const photoUrl = escapeHtml(lecturer && lecturer.photo_url ? lecturer.photo_url : "");
    const courses = normalizeCourses(lecturer);
    const memberHref = getMemberDetailHref(lecturer);
    const nameMarkup = memberHref
        ? `<a class="lecturer-name-link" href="${escapeHtml(memberHref)}">${name}</a>`
        : name;

    const courseMarkup = courses.length
        ? `<ul class="lecturer-course-list">${courses
            .slice(0, 6)
            .map((course) => `<li>${escapeHtml(course)}</li>`)
            .join("")}</ul>`
        : "<p class=\"lecturer-course-empty\">Courses are being updated by administrator.</p>";

    const imageMarkup = photoUrl
        ? `<img class="lecturer-avatar" src="${photoUrl}" alt="${name}">`
        : "<div class=\"lecturer-avatar lecturer-avatar-fallback\" aria-hidden=\"true\">No Photo</div>";

    return `
        <article class="lecturer-card">
            <div class="lecturer-card-head">
                ${imageMarkup}
                <div>
                    <h2 class="lecturer-name">${nameMarkup}</h2>
                    <p class="lecturer-specialization"><strong>Specialization:</strong> ${specialization}</p>
                </div>
            </div>
            <p class="lecturer-bio">${bio}</p>
            <div class="lecturer-courses">
                <h3>Teaching Subjects</h3>
                ${courseMarkup}
            </div>
        </article>
    `;
}

function renderLecturerList(rows) {
    const container = document.getElementById("lecturersList");
    if (!container) {
        return;
    }

    if (!rows.length) {
        container.innerHTML = "<p>No lecturers match your search.</p>";
        return;
    }

    container.innerHTML = rows.map(renderLecturerCard).join("");
}

function applyLecturerSearchFilter(rows) {
    const searchInput = document.getElementById("lecturerSearchInput");
    const keyword = String(searchInput ? searchInput.value : "").trim().toLowerCase();

    if (!keyword) {
        return rows;
    }

    return rows.filter((lecturer) => {
        const name = String(lecturer && lecturer.name ? lecturer.name : "").toLowerCase();
        const specialization = String(lecturer && lecturer.specialization ? lecturer.specialization : "").toLowerCase();
        const subjects = normalizeCourses(lecturer).join(" ").toLowerCase();

        return name.includes(keyword) || specialization.includes(keyword) || subjects.includes(keyword);
    });
}

function bindLecturerSearchEvents() {
    const searchInput = document.getElementById("lecturerSearchInput");
    const resetBtn = document.getElementById("lecturerSearchResetBtn");

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            renderLecturerList(applyLecturerSearchFilter(lecturerItemsCache));
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (searchInput) {
                searchInput.value = "";
            }
            renderLecturerList(lecturerItemsCache);
        });
    }
}

async function loadLecturers() {
    const container = document.getElementById("lecturersList");
    if (!container) {
        return;
    }

    try {
        const response = await fetch(getApi("/api/lecturers/public"));
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data && data.message ? data.message : "Failed to load lecturers");
        }

        const rows = Array.isArray(data) ? data : [];
        lecturerItemsCache = rows;
        bindLecturerSearchEvents();

        if (!rows.length) {
            container.innerHTML = "<p>No lecturers have been published yet.</p>";
            return;
        }

        renderLecturerList(rows);
    } catch (error) {
        container.innerHTML = `<p>${escapeHtml(error.message || "Unable to load lecturers right now.")}</p>`;
    }
}

loadLecturers();
