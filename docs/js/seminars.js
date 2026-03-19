function escapeHtml(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function isValidHttpUrl(value) {
	if (!value || typeof value !== "string") {
		return false;
	}

	try {
		const parsed = new URL(value.trim());
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch (error) {
		return false;
	}
}

function extractDateOnly(value) {
	const raw = String(value || "").trim();
	if (!raw) {
		return "";
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		return raw;
	}

	const isoDatePart = raw.split("T")[0];
	if (/^\d{4}-\d{2}-\d{2}$/.test(isoDatePart)) {
		return isoDatePart;
	}

	return "";
}

function formatDateEnglish(value) {
	const dateOnly = extractDateOnly(value);
	if (!dateOnly) {
		return "N/A";
	}

	const [yyyy, mm, dd] = dateOnly.split("-");
	const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
	const monthIndex = Number(mm) - 1;
	const dayNumber = Number(dd);

	if (monthIndex < 0 || monthIndex > 11 || !Number.isInteger(dayNumber)) {
		return "N/A";
	}

	return `${monthNames[monthIndex]} ${dayNumber}, ${yyyy}`;
}

function formatSeminarDateHeading(value) {
	return formatDateEnglish(value);
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

function getGroupKey(dateValue) {
	return extractDateOnly(dateValue) || String(dateValue || "unknown");
}

function groupSeminarsByDate(rows) {
	const grouped = [];
	const indexMap = new Map();

	rows.forEach((item) => {
		const key = getGroupKey(item.seminar_date);
		if (!indexMap.has(key)) {
			indexMap.set(key, grouped.length);
			grouped.push({ key, dateLabel: formatSeminarDateHeading(item.seminar_date), entries: [] });
		}

		grouped[indexMap.get(key)].entries.push(item);
	});

	return grouped;
}

function renderSeminarModalDetail(item) {
	const modalBody = document.getElementById("seminarModalBody");
	if (!modalBody) {
		return;
	}

	const safeLink = isValidHttpUrl(item.paper_link) ? item.paper_link.trim() : "";
	const paperLinkMarkup = safeLink
		? `<a href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safeLink)}</a>`
		: "N/A";

	modalBody.innerHTML = `
		<p><strong>Date:</strong> ${escapeHtml(formatSeminarDateHeading(item.seminar_date))}</p>
		<p><strong>Time:</strong> ${formatSeminarTime(item.start_time, item.end_time)}</p>
		<p><strong>Member:</strong> ${escapeHtml(item.member_name || "N/A")}</p>
		<p><strong>Title:</strong> ${escapeHtml(item.title || "Untitled")}</p>
		<p><strong>Paper Link:</strong> ${paperLinkMarkup}</p>
	`;
}

function openSeminarModal() {
	const modal = document.getElementById("seminarDetailModal");
	if (!modal) {
		return;
	}
	modal.hidden = false;
	document.body.classList.add("seminar-modal-open");
}

function closeSeminarModal() {
	const modal = document.getElementById("seminarDetailModal");
	if (!modal) {
		return;
	}
	modal.hidden = true;
	document.body.classList.remove("seminar-modal-open");
}

function bindSeminarModalEvents(rows) {
	const timeline = document.getElementById("seminarTimeline");
	const closeButton = document.getElementById("seminarModalCloseBtn");
	const modal = document.getElementById("seminarDetailModal");

	if (timeline) {
		timeline.querySelectorAll(".seminar-detail-btn").forEach((button) => {
			button.addEventListener("click", () => {
				const index = Number(button.dataset.index);
				const item = rows[index];
				if (!item) {
					return;
				}
				renderSeminarModalDetail(item);
				openSeminarModal();
			});
		});
	}

	if (closeButton) {
		closeButton.onclick = closeSeminarModal;
	}

	if (modal) {
		modal.onclick = (event) => {
			const target = event.target;
			if (target && target.dataset && target.dataset.close === "true") {
				closeSeminarModal();
			}
		};
	}

	document.onkeydown = (event) => {
		if (event.key === "Escape") {
			closeSeminarModal();
		}
	};
}

function renderSeminars(rows) {
	const timeline = document.getElementById("seminarTimeline");
	if (!timeline) {
		return;
	}

	if (!rows || rows.length === 0) {
		timeline.innerHTML = "<p>No seminar schedule available yet.</p>";
		return;
	}

	const grouped = groupSeminarsByDate(rows);
	timeline.innerHTML = grouped.map((group) => {
		const items = group.entries.map((seminar) => {
			const originalIndex = rows.indexOf(seminar);
			return `
				<article class="seminar-card-item">
					<p class="seminar-card-meta"> ${formatSeminarTime(seminar.start_time, seminar.end_time)} | ${escapeHtml(seminar.member_name || "N/A")}</p>
					<h3 class="seminar-card-title">${escapeHtml(seminar.title || "Untitled")}</h3>
					<button type="button" class="seminar-detail-btn" data-index="${originalIndex}">View Details</button>
				</article>
			`;
		}).join("");

		return `
			<section class="seminar-date-group">
				<h2>${escapeHtml(group.dateLabel)}</h2>
				<div class="seminar-card-list">
					${items}
				</div>
			</section>
		`;
	}).join("");

	bindSeminarModalEvents(rows);
}

function applySeminarFilters(rows) {
	const searchInput = document.getElementById("seminarSearchInput");
	const dateInput = document.getElementById("seminarDateFilter");

	const keyword = String(searchInput ? searchInput.value : "").trim().toLowerCase();
	const selectedDate = extractDateOnly(dateInput ? dateInput.value : "");

	return rows.filter((item) => {
		const member = String(item.member_name || "").toLowerCase();
		const title = String(item.title || "").toLowerCase();
		const seminarDate = extractDateOnly(item.seminar_date);

		const matchesKeyword = !keyword || member.includes(keyword) || title.includes(keyword);
		const matchesDate = !selectedDate || seminarDate === selectedDate;

		return matchesKeyword && matchesDate;
	});
}

function bindSeminarFilterEvents(allRows) {
	const searchInput = document.getElementById("seminarSearchInput");
	const dateInput = document.getElementById("seminarDateFilter");
	const resetBtn = document.getElementById("seminarFilterResetBtn");

	const rerender = () => {
		const filteredRows = applySeminarFilters(allRows);
		renderSeminars(filteredRows);
	};

	if (searchInput) {
		searchInput.addEventListener("input", rerender);
	}

	if (dateInput) {
		dateInput.addEventListener("change", rerender);
	}

	if (resetBtn) {
		resetBtn.addEventListener("click", () => {
			if (searchInput) {
				searchInput.value = "";
			}
			if (dateInput) {
				dateInput.value = "";
			}
			rerender();
		});
	}
}

async function loadSeminars() {
	const timeline = document.getElementById("seminarTimeline");

	try {
		const response = await fetch("/api/seminars/public");
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || "Failed to load seminars");
		}

		renderSeminars(data);
		bindSeminarFilterEvents(data);
	} catch (error) {
		if (timeline) {
			timeline.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
		}
	}
}

loadSeminars();
