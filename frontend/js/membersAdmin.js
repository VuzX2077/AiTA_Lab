const LINK_PRESETS = [
    { label: "Personal Page", color: "#1565c0" },
    { label: "ORCID", color: "#a6ce39" },
    { label: "Google Scholar", color: "#4285f4" },
    { label: "Scopus Author ID", color: "#e07b34" },
    { label: "Web of Science", color: "#193e7c" },
    { label: "ResearchGate", color: "#00b5a0" },
];

const memberPage = window.MemberPage || {};
const adminToken = memberPage.adminToken || null;

function openModal() {
    const modal = document.getElementById("memberModal");
    if (modal) modal.style.display = "flex";
}

function closeModal() {
    const modal = document.getElementById("memberModal");
    if (modal) modal.style.display = "none";
}

function buildLinkRow(lk = {}) {
    const container = document.getElementById("mfLinksContainer");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "mf-link-row";

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.className = "mf-link-label";
    labelInput.placeholder = "Label";
    labelInput.value = lk.label || "";
    labelInput.setAttribute("list", "linkPresetList");

    const urlInput = document.createElement("input");
    urlInput.type = "url";
    urlInput.className = "mf-link-url";
    urlInput.placeholder = "https://...";
    urlInput.value = lk.url || "";

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "mf-link-color";
    colorInput.value = lk.color || "#1565c0";

    labelInput.addEventListener("change", () => {
        const preset = LINK_PRESETS.find(
            p => p.label.toLowerCase() === labelInput.value.toLowerCase()
        );
        if (preset) colorInput.value = preset.color;
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "mf-link-remove";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => row.remove());

    row.appendChild(labelInput);
    row.appendChild(urlInput);
    row.appendChild(colorInput);
    row.appendChild(removeBtn);
    container.appendChild(row);
}

function readLinksFromForm() {
    const rows = document.querySelectorAll(".mf-link-row");
    const result = [];

    rows.forEach(row => {
        const label = row.querySelector(".mf-link-label").value.trim();
        const url = row.querySelector(".mf-link-url").value.trim();
        const color = row.querySelector(".mf-link-color").value;
        if (label && url) result.push({ label, url, color });
    });

    return result;
}

function populateForm(m) {
    document.getElementById("mfUserId").value = m.user_id || "";
    document.getElementById("mfName").value = m.name || "";
    document.getElementById("mfPosition").value = m.position || "";
    document.getElementById("mfSection").value = m.section || "researchers";
    document.getElementById("mfPhoto").value = m.photo_url || "";
    document.getElementById("mfBio").value = m.bio || "";
    document.getElementById("mfCareer").value = (memberPage.safeArr ? memberPage.safeArr(m.career) : []).join("\n");

    const container = document.getElementById("mfLinksContainer");
    if (!container) return;
    container.innerHTML = "";

    const links = memberPage.safeArr ? memberPage.safeArr(m.links) : [];
    links.forEach(lk => buildLinkRow(lk));
}

function openEditModal(m) {
    document.getElementById("mmodalTitle").textContent = "Edit Member";
    document.getElementById("mfMode").value = "edit";
    document.getElementById("mfEmailRow").style.display = "none";
    document.getElementById("mfPasswordRow").style.display = "none";
    populateForm(m);
    openModal();
}

function openAddModal(sectionId) {
    document.getElementById("mmodalTitle").textContent = "Add Member";
    document.getElementById("mfMode").value = "add";
    document.getElementById("mfEmailRow").style.display = "block";
    document.getElementById("mfPasswordRow").style.display = "block";
    document.getElementById("mfEmail").value = "";
    document.getElementById("mfPassword").value = "";
    populateForm({ section: sectionId });
    openModal();
}

async function handleSubmit(e) {
    e.preventDefault();

    const mode = document.getElementById("mfMode").value;
    const userId = document.getElementById("mfUserId").value;
    const name = document.getElementById("mfName").value.trim();

    if (!name) {
        memberPage.showToast?.("Name is required", "error");
        return;
    }

    const payload = {
        name,
        position: document.getElementById("mfPosition").value.trim(),
        section: document.getElementById("mfSection").value,
        photo_url: document.getElementById("mfPhoto").value.trim(),
        bio: document.getElementById("mfBio").value.trim(),
        career: document
            .getElementById("mfCareer")
            .value.split("\n")
            .map(s => s.trim())
            .filter(Boolean),
        links: readLinksFromForm(),
    };

    const submitBtn = document.getElementById("mmodalSubmit");
    submitBtn.disabled = true;

    try {
        if (mode === "add") {
            const email = document.getElementById("mfEmail").value.trim();
            const password = document.getElementById("mfPassword").value;
            if (!email || !password) {
                memberPage.showToast?.("Email and password are required", "error");
                return;
            }

            Object.assign(payload, { email, password, role: "user" });

            const res = await fetch("/api/members", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to add member");
            memberPage.showToast?.("Member added");
        } else {
            const res = await fetch(`/api/members/${userId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${adminToken}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to update member");
            memberPage.showToast?.("Member updated");
        }

        closeModal();
        memberPage.loadMembers?.();
    } catch (err) {
        memberPage.showToast?.(err.message, "error");
    } finally {
        submitBtn.disabled = false;
    }
}

async function confirmDelete(m) {
    if (!confirm(`Delete "${m.name}"? This cannot be undone.`)) return;

    try {
        const res = await fetch(`/api/members/${m.user_id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${adminToken}` },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to delete member");
        memberPage.showToast?.("Member deleted");
        memberPage.loadMembers?.();
    } catch (err) {
        memberPage.showToast?.(err.message, "error");
    }
}

window.MemberAdmin = {
    openEditModal,
    openAddModal,
    confirmDelete,
};

document.addEventListener("DOMContentLoaded", () => {
    if (!adminToken) return;

    document.getElementById("mmodalClose")?.addEventListener("click", closeModal);
    document.getElementById("mmodalCancel")?.addEventListener("click", closeModal);
    document.getElementById("memberModal")?.addEventListener("click", e => {
        if (e.target === document.getElementById("memberModal")) closeModal();
    });

    document.getElementById("addLinkBtn")?.addEventListener("click", () => buildLinkRow());
    document.getElementById("memberForm")?.addEventListener("submit", handleSubmit);
});
