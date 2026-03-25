function apiUrl(path) {
    if (typeof window.getApiUrl === "function") {
        return window.getApiUrl(path);
    }

    return path;
}

function safeArray(value) {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    return [];
}

function safeActivities(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return {
            advisor: [],
            conference_committee: [],
            peer_review: []
        };
    }

    return {
        advisor: safeArray(value.advisor),
        conference_committee: safeArray(value.conference_committee),
        peer_review: safeArray(value.peer_review)
    };
}

function safeProjects(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { principal_investigator: [] };
    }

    return {
        principal_investigator: safeArray(value.principal_investigator)
    };
}

function getMemberIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const queryId = Number(params.get("id"));
    if (Number.isInteger(queryId) && queryId > 0) {
        return queryId;
    }

    const match = String(window.location.pathname || "").match(/\/member\/(\d+)$/i);
    if (match) {
        const pathId = Number(match[1]);
        if (Number.isInteger(pathId) && pathId > 0) {
            return pathId;
        }
    }

    return null;
}

function renderList(listEl, data) {
    if (!listEl) return false;

    const items = safeArray(data)
        .map((item) => String(item || "").trim())
        .filter(Boolean);

    if (!items.length) {
        listEl.innerHTML = "";
        return false;
    }

    listEl.innerHTML = "";
    items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        listEl.appendChild(li);
    });

    return true;
}

function renderLinks(data) {
    const wrap = document.getElementById("memberLinks");
    if (!wrap) return;

    const links = safeArray(data)
        .filter((item) => item && typeof item === "object")
        .filter((item) => String(item.label || "").trim() && String(item.url || "").trim());

    if (!links.length) {
        wrap.innerHTML = "";
        wrap.hidden = true;
        return;
    }

    wrap.hidden = false;
    wrap.innerHTML = "";

    links.forEach((item) => {
        const a = document.createElement("a");
        a.className = "tag-link";
        a.href = String(item.url || "").trim();
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = String(item.label || "").trim();

        const color = String(item.color || "").trim();
        if (color) {
            a.style.background = color;
        }

        wrap.appendChild(a);
    });
}

function renderToc(entries) {
    const tocWrap = document.getElementById("detailTocWrap");
    const toc = document.getElementById("detailToc");
    if (!tocWrap || !toc) return;

    const visibleEntries = entries.filter((entry) => entry.visible);
    if (!visibleEntries.length) {
        toc.innerHTML = "";
        tocWrap.hidden = true;
        return;
    }

    tocWrap.hidden = false;
    toc.innerHTML = "";

    visibleEntries.forEach((entry) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${entry.anchor}`;
        a.textContent = entry.label;
        li.appendChild(a);
        toc.appendChild(li);
    });
}

async function loadMemberDetail() {
    const memberId = getMemberIdFromUrl();
    const nameEl = document.getElementById("memberName");
    const quoteEl = document.getElementById("memberQuote");
    const emptyEl = document.getElementById("detailEmpty");

    if (!memberId) {
        if (nameEl) nameEl.textContent = "Member not found";
        if (quoteEl) quoteEl.textContent = "Invalid member id.";
        if (emptyEl) emptyEl.hidden = false;
        return;
    }

    try {
        const response = await fetch(apiUrl(`/api/members/public/${memberId}`));
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || "Failed to load member detail");
        }

        if (nameEl) nameEl.textContent = payload.name || "Member Profile";
        if (quoteEl) {
            quoteEl.textContent = payload.quote || "";
            quoteEl.hidden = !quoteEl.textContent;
        }

        const imageWrap = document.getElementById("memberHeroWrap");
        const heroImage = document.getElementById("memberHeroImage");
        const heroUrl = String(payload.hero_photo_url || "").trim();

        if (imageWrap && heroImage) {
            if (heroUrl) {
                heroImage.src = heroUrl;
                heroImage.alt = payload.name || "Member hero picture";
                imageWrap.hidden = false;
            } else {
                imageWrap.hidden = true;
            }
        }

        renderLinks(payload.links);

        const educationVisible = renderList(document.getElementById("educationList"), payload.education);
        const workVisible = renderList(document.getElementById("workingExperienceList"), payload.working_experience);
        const awardVisible = renderList(document.getElementById("awardsGrantsList"), payload.awards_grants);
        const journalVisible = renderList(document.getElementById("journalPublicationsList"), payload.journal_publications);
        const conferenceVisible = renderList(document.getElementById("conferenceProceedingsList"), payload.conference_proceedings);
        const bookVisible = renderList(document.getElementById("bookChaptersList"), payload.book_chapters);
        const patentsVisible = renderList(document.getElementById("patentsList"), payload.patents);

        const activities = safeActivities(payload.academic_activities);
        const activitiesAdvisorVisible = renderList(document.getElementById("activitiesAdvisorList"), activities.advisor);
        const activitiesConferenceVisible = renderList(document.getElementById("activitiesConferenceList"), activities.conference_committee);
        const activitiesPeerReviewVisible = renderList(document.getElementById("activitiesPeerReviewList"), activities.peer_review);

        const projects = safeProjects(payload.projects);
        const projectsPiVisible = renderList(document.getElementById("projectsPiList"), projects.principal_investigator);

        const sectionEducation = document.getElementById("section-education");
        const sectionWork = document.getElementById("section-working-experience");
        const sectionAward = document.getElementById("section-awards-grants");
        const sectionJournal = document.getElementById("section-journal-publications");
        const sectionConference = document.getElementById("section-conference-proceedings");
        const sectionBook = document.getElementById("section-book-chapters");
        const sectionPatents = document.getElementById("section-patents");
        const sectionActivities = document.getElementById("section-academic-activities");
        const sectionProjects = document.getElementById("section-projects");

        const activitiesAdvisorWrap = document.getElementById("activities-advisor-wrap");
        const activitiesConferenceWrap = document.getElementById("activities-conference-wrap");
        const activitiesPeerReviewWrap = document.getElementById("activities-peer-review-wrap");
        const projectsPiWrap = document.getElementById("projects-pi-wrap");

        if (sectionEducation) sectionEducation.hidden = !educationVisible;
        if (sectionWork) sectionWork.hidden = !workVisible;
        if (sectionAward) sectionAward.hidden = !awardVisible;
        if (sectionJournal) sectionJournal.hidden = !journalVisible;
        if (sectionConference) sectionConference.hidden = !conferenceVisible;
        if (sectionBook) sectionBook.hidden = !bookVisible;
        if (sectionPatents) sectionPatents.hidden = !patentsVisible;

        if (activitiesAdvisorWrap) activitiesAdvisorWrap.hidden = !activitiesAdvisorVisible;
        if (activitiesConferenceWrap) activitiesConferenceWrap.hidden = !activitiesConferenceVisible;
        if (activitiesPeerReviewWrap) activitiesPeerReviewWrap.hidden = !activitiesPeerReviewVisible;
        if (sectionActivities) sectionActivities.hidden = !(activitiesAdvisorVisible || activitiesConferenceVisible || activitiesPeerReviewVisible);

        if (projectsPiWrap) projectsPiWrap.hidden = !projectsPiVisible;
        if (sectionProjects) sectionProjects.hidden = !projectsPiVisible;

        const hasAnyContent = educationVisible || workVisible || awardVisible || journalVisible || conferenceVisible || bookVisible || patentsVisible
            || activitiesAdvisorVisible || activitiesConferenceVisible || activitiesPeerReviewVisible || projectsPiVisible;

        if (emptyEl) {
            emptyEl.hidden = hasAnyContent;
        }

        renderToc([
            { anchor: "section-education", label: "Education", visible: educationVisible },
            { anchor: "section-working-experience", label: "Working Experience", visible: workVisible },
            { anchor: "section-awards-grants", label: "Awards & Grants", visible: awardVisible },
            { anchor: "section-journal-publications", label: "Journal Publications", visible: journalVisible },
            { anchor: "section-conference-proceedings", label: "Conference Proceedings", visible: conferenceVisible },
            { anchor: "section-book-chapters", label: "Book Chapters", visible: bookVisible },
            { anchor: "section-patents", label: "Patents", visible: patentsVisible },
            { anchor: "section-academic-activities", label: "Academic Activities", visible: !sectionActivities?.hidden },
            { anchor: "section-projects", label: "Projects", visible: !sectionProjects?.hidden }
        ]);
    } catch (error) {
        if (nameEl) nameEl.textContent = "Member profile";
        if (quoteEl) {
            quoteEl.hidden = false;
            quoteEl.textContent = error.message || "Failed to load member detail.";
        }
        if (emptyEl) emptyEl.hidden = false;
    }
}

document.addEventListener("DOMContentLoaded", loadMemberDetail);
