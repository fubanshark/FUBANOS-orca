
/* =========================================
   FUBAN OS — MILESTONE ENGINE
   Achievement System
   Version 1.0
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY = "fuban_milestone_achievements";

    const CATEGORIES = [
        "Personal Growth",
        "Academic",
        "Science",
        "Creativity",
        "Exploration",
        "Life Milestones",
        "Sleeping",
        "Diary Writer"
    ];

    const ICONS = {
        star: "⭐",
        moon: "🌙",
        sun: "☀️",
        trophy: "🏆",
        book: "📚",
        "graduation-cap": "🎓",
        flask: "🧪",
        palette: "🎨",
        mountain: "⛰️",
        leaf: "🍃",
        music: "🎵",
        pen: "✍️",
        bed: "🛏️",
        orbit: "🪐"
    };

    // -----------------------------------------
    // DOM ELEMENTS
    // -----------------------------------------

    const $ = (id) => document.getElementById(id);

    const form = $("achievement-form");
    const modal = $("achievement-modal");
    const deleteModal = $("delete-achievement-modal");

    const lists = {
        incomplete: $("incomplete-achievement-list"),
        achieved: $("achieved-achievement-list"),
        archive: $("archive-achievement-list")
    };

    const panels = {
        incomplete: $("incomplete-panel"),
        achieved: $("achieved-panel"),
        archive: $("archive-panel")
    };

    const tabs = {
        incomplete: $("tab-incomplete"),
        achieved: $("tab-achieved"),
        archive: $("tab-archive")
    };

    const searchInput = $("achievement-search");
    const categoryFilter = $("achievement-category-filter");

    let achievements = [];
    let activeTab = "incomplete";
    let pendingDeleteId = null;
    let selectedLogoType = "emoji";
    let uploadedImageData = null;

    // -----------------------------------------
    // HELPERS
    // -----------------------------------------

    function createId() {
        return "achievement_" +
            Date.now() + "_" +
            Math.random().toString(36).slice(2, 9);
    }

    function today() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function escapeHTML(value = "") {
        return String(value).replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[char]);
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements));
    }

    function loadData() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

            if (Array.isArray(saved)) {
                achievements = saved;
            } else {
                achievements = createDefaultAchievements();
                saveData();
            }
        } catch (error) {
            console.error("Cannot load achievements:", error);
            achievements = createDefaultAchievements();
            saveData();
        }
    }

    function showNotification(message) {
        const notification = $("milestone-notification");
        if (!notification) return;

        notification.textContent = message;
        notification.hidden = false;

        clearTimeout(showNotification.timeout);

        showNotification.timeout = setTimeout(() => {
            notification.hidden = true;
        }, 2800);
    }

    function formatDate(dateString) {
        if (!dateString) return "Not set";

        const date = new Date(dateString + "T00:00:00");

        if (Number.isNaN(date.getTime())) return "Not set";

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // -----------------------------------------
    // DEFAULT ACHIEVEMENTS
    // -----------------------------------------

    function createDefaultAchievements() {
        const presets = [
            {
                name: "Dream Architect",
                description: "Build a consistent and healthy sleeping routine.",
                category: "Sleeping",
                emoji: "🌙"
            },
            {
                name: "Six-Month Chronicler",
                description: "Keep writing your diary for six months.",
                category: "Diary Writer",
                emoji: "📖"
            },
            {
                name: "Knowledge Seeker",
                description: "Celebrate your progress in learning.",
                category: "Academic",
                emoji: "🎓"
            },
            {
                name: "Little Scientist",
                description: "Complete a personal science milestone.",
                category: "Science",
                emoji: "🔬"
            },
            {
                name: "Creative Mind",
                description: "Complete a creative project.",
                category: "Creativity",
                emoji: "🎨"
            },
            {
                name: "Explorer",
                description: "Discover somewhere new.",
                category: "Exploration",
                emoji: "🧭"
            },
            {
                name: "Growing Up",
                description: "Reach an important personal milestone.",
                category: "Life Milestones",
                emoji: "🌱"
            },
            {
                name: "Better Every Day",
                description: "Make progress toward becoming your best self.",
                category: "Personal Growth",
                emoji: "⭐"
            }
        ];

        return presets.map((item, index) => ({
            id: `system_${index + 1}`,
            name: item.name,
            description: item.description,
            category: item.category,
            logoType: "emoji",
            emoji: item.emoji,
            icon: "",
            image: null,
            zoom: 100,
            positionX: 50,
            positionY: 50,
            startDate: today(),
            targetDate: "",
            progress: 0,
            status: "incomplete",
            achievedDate: null,
            isSystem: true,
            createdAt: new Date().toISOString()
        }));
    }

    // -----------------------------------------
    // SUMMARY
    // -----------------------------------------

    function updateSummary() {
        const total = achievements.filter(a => a.status !== "archive").length;
        const incomplete = achievements.filter(a => a.status === "incomplete").length;
        const achieved = achievements.filter(a => a.status === "achieved").length;

        if ($("total-achievements")) {
            $("total-achievements").textContent = total;
        }

        if ($("incomplete-count")) {
            $("incomplete-count").textContent = incomplete;
        }

        if ($("achieved-count")) {
            $("achieved-count").textContent = achieved;
        }
    }

    // -----------------------------------------
    // LOGO RENDERING
    // -----------------------------------------

    function getLogoHTML(item) {
        if (item.logoType === "image" && item.image) {
            return `
                <div class="achievement-logo image-logo">
                    <img
                        src="${item.image}"
                        alt=""
                        style="
                            object-fit: cover;
                            transform:
                                translate(
                                    ${(50 - (item.positionX ?? 50)) * 0.5}%,
                                    ${(50 - (item.positionY ?? 50)) * 0.5}%
                                )
                                scale(${(item.zoom || 100) / 100});
                        "
                    >
                </div>
            `;
        }

        if (item.logoType === "icon") {
            return `
                <div class="achievement-logo icon-logo">
                    ${ICONS[item.icon] || "⭐"}
                </div>
            `;
        }

        return `
            <div class="achievement-logo emoji-logo">
                ${escapeHTML(item.emoji || "⭐")}
            </div>
        `;
    }

    // -----------------------------------------
    // ACHIEVEMENT CARD
    // -----------------------------------------

    function createCard(item) {
        const card = document.createElement("article");

        card.className = "achievement-card";
        card.dataset.id = item.id;

        const progress = Math.max(0, Math.min(100, Number(item.progress) || 0));

        const isAchieved = item.status === "achieved";
        const isArchived = item.status === "archive";

        card.innerHTML = `
            <div class="achievement-card-header">
                ${getLogoHTML(item)}

                <div class="achievement-actions">
                    <button
                        type="button"
                        class="edit-achievement"
                        title="Edit"
                        aria-label="Edit achievement"
                    >✎</button>

                    ${!item.isSystem ? `
                        <button
                            type="button"
                            class="delete-achievement"
                            title="Delete"
                            aria-label="Delete achievement"
                        >×</button>
                    ` : ""}

                    ${!isArchived ? `
                        <button
                            type="button"
                            class="archive-achievement"
                            title="Archive"
                            aria-label="Archive achievement"
                        >▣</button>
                    ` : `
                        <button
                            type="button"
                            class="restore-achievement"
                            title="Restore"
                            aria-label="Restore achievement"
                        >↶</button>
                    `}
                </div>
            </div>

            <h3>${escapeHTML(item.name)}</h3>

            <p>${escapeHTML(item.description || "")}</p>

            ${item.category ? `
                <span class="achievement-category">
                    ${escapeHTML(item.category)}
                </span>
            ` : ""}

            <div class="achievement-progress">
                <div class="achievement-progress-info">
                    <span>${escapeHTML(item.progressLabel || (isAchieved ? "Completed" : "Progress"))}</span>
                    <strong>${progress}%</strong>
                </div>

                <div class="achievement-progress-track">
                    <div
                        class="achievement-progress-fill"
                        style="width: ${progress}%"
                    ></div>
                </div>

                <div class="achievement-date">
                    <span>Target: ${formatDate(item.targetDate)}</span>
                    <span>
                        ${isAchieved
                            ? "Achieved: " + formatDate(item.achievedDate)
                            : "Started: " + formatDate(item.startDate)}
                    </span>
                </div>
            </div>
        `;

        // Edit
        card.querySelector(".edit-achievement")
            .addEventListener("click", () => openEditModal(item.id));

        // Delete
        card.querySelector(".delete-achievement")
            ?.addEventListener("click", () => openDeleteModal(item.id));

        // Archive
        card.querySelector(".archive-achievement")
            ?.addEventListener("click", () => archiveAchievement(item.id));

        // Restore
        card.querySelector(".restore-achievement")
            ?.addEventListener("click", () => restoreAchievement(item.id));

        return card;
    }

    // -----------------------------------------
    // RENDER ACHIEVEMENTS
    // -----------------------------------------

    function renderAchievements() {
        const keyword = (searchInput?.value || "").toLowerCase().trim();
        const category = categoryFilter?.value || "";

        Object.values(lists).forEach(list => {
            if (list) list.innerHTML = "";
        });

        const statusMap = {
            incomplete: "incomplete",
            achieved: "achieved",
            archive: "archive"
        };

        Object.entries(statusMap).forEach(([key, status]) => {
            const list = lists[key];
            if (!list) return;

            const filtered = achievements.filter(item => {
                const matchesStatus = item.status === status;

                const matchesSearch =
                    item.name.toLowerCase().includes(keyword) ||
                    (item.description || "").toLowerCase().includes(keyword);

                const matchesCategory =
                    !category ||
                    category === "all" ||
                    (category === "uncategorized"
                        ? !item.category
                        : item.category === category);

                return matchesStatus && matchesSearch && matchesCategory;
            });

            filtered.forEach(item => {
                list.appendChild(createCard(item));
            });

            updateEmptyState(key, filtered.length);
        });

        updateSummary();
    }

    function updateEmptyState(key, count) {
        const emptyIds = {
            incomplete: "incomplete-empty",
            achieved: "achieved-empty",
            archive: "archive-empty"
        };

        const empty = $(emptyIds[key]);

        if (empty) {
            empty.hidden = count > 0;
        }
    }

    // -----------------------------------------
    // TAB SWITCHING
    // -----------------------------------------

    function switchTab(tabName) {
        if (!panels[tabName]) return;

        activeTab = tabName;

        Object.entries(panels).forEach(([key, panel]) => {
            if (panel) panel.hidden = key !== tabName;
        });

        Object.entries(tabs).forEach(([key, button]) => {
            if (!button) return;

            button.classList.toggle("active", key === tabName);
            button.setAttribute(
                "aria-selected",
                key === tabName ? "true" : "false"
            );
        });
    }

    Object.entries(tabs).forEach(([key, button]) => {
        button?.addEventListener("click", () => switchTab(key));
    });

    // -----------------------------------------
    // CATEGORY FILTER
    // -----------------------------------------

    function setupCategoryFilter() {
        if (!categoryFilter) return;

        // Preserve existing HTML options.
        if (categoryFilter.options.length <= 1) {
            CATEGORIES.forEach(category => {
                const option = document.createElement("option");
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
        }
    }

    searchInput?.addEventListener("input", renderAchievements);
    categoryFilter?.addEventListener("change", renderAchievements);

    // -----------------------------------------
    // MODAL CONTROL
    // -----------------------------------------

    function openModal() {
        if (!modal) return;

        modal.hidden = false;
        $("achievement-name")?.focus();
    }

    function closeModal() {
        if (modal) modal.hidden = true;
        form?.reset();

        if ($("achievement-id")) {
            $("achievement-id").value = "";
        }

        uploadedImageData = null;
        selectedLogoType = "emoji";

        resetLogoAdjustment();
        selectLogoType("emoji");
        setModalMode(false);

        if (progressValue && progressSlider) {
            progressValue.textContent = `${progressSlider.value}%`;
        }

        updateLogoPreview();
    }

    function setModalMode(isEditing) {
        const heading = $("achievement-modal-title");
        const saveButton = $("save-achievement");

        if (heading) {
            heading.textContent = isEditing
                ? "Edit Achievement"
                : "Create Achievement";
        }

        if (saveButton) {
            saveButton.textContent = isEditing
                ? "Save Changes"
                : "Save Achievement";
        }
    }

    $("open-achievement-modal")?.addEventListener("click", () => {
        closeModal();
        setModalMode(false);
        openModal();
    });

    $("cancel-achievement")?.addEventListener("click", closeModal);
    $("close-achievement-modal")?.addEventListener("click", closeModal);
    modal?.addEventListener("click", event => {
        if (event.target === modal) closeModal();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && modal && !modal.hidden) {
            closeModal();
        }
    });

    // -----------------------------------------
    // LOGO TYPE
    // -----------------------------------------

    function selectLogoType(type) {
        selectedLogoType = type;

        document.querySelectorAll("[data-logo-type]").forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset.logoType === type
            );
            button.setAttribute(
                "aria-pressed",
                button.dataset.logoType === type ? "true" : "false"
            );
        });

        document.querySelectorAll(".logo-type-panel").forEach(panel => {
            panel.hidden = panel.dataset.logoTypePanel !== type;
        });

        updateLogoPreview();
    }

    document.querySelectorAll("[data-logo-type]").forEach(button => {
        button.addEventListener("click", () => {
            selectLogoType(button.dataset.logoType);
        });
    });

    function updateLogoPreview() {
        const emoji = $("achievement-emoji")?.value || "⭐";
        const icon = $("achievement-icon")?.value || "star";

        const previewEmoji = $("achievement-emoji-preview");
        const previewIcon = $("achievement-icon-preview");
        const previewImage = $("achievement-image-preview");
        const imagePlaceholder = $("achievement-image-placeholder");
        const logoAdjustment = $("logo-adjustment");
        const zoom = Number($("logo-zoom")?.value || 100);
        const positionX = Number($("logo-position-x")?.value || 50);
        const positionY = Number($("logo-position-y")?.value || 50);

        if (previewEmoji) {
            previewEmoji.hidden = selectedLogoType !== "emoji";
            previewEmoji.textContent = emoji;
        }

        if (previewIcon) {
            previewIcon.hidden = selectedLogoType !== "icon";
            previewIcon.textContent = ICONS[icon] || "⭐";
        }

        if (previewImage) {
            previewImage.hidden =
                selectedLogoType !== "image" || !uploadedImageData;
            previewImage.src = uploadedImageData || "";
            previewImage.style.transform =
                `translate(${(50 - positionX) * 0.5}%, ${(50 - positionY) * 0.5}%) scale(${zoom / 100})`;
        }

        if (imagePlaceholder) {
            imagePlaceholder.hidden =
                selectedLogoType !== "image" || Boolean(uploadedImageData);
        }

        if (logoAdjustment) {
            logoAdjustment.hidden =
                selectedLogoType !== "image" || !uploadedImageData;
        }

        if ($("logo-zoom-value")) $("logo-zoom-value").textContent = `${zoom}%`;
        if ($("logo-position-x-value")) $("logo-position-x-value").textContent = `${positionX}%`;
        if ($("logo-position-y-value")) $("logo-position-y-value").textContent = `${positionY}%`;
    }

    $("achievement-emoji")?.addEventListener("input", updateLogoPreview);
    $("achievement-icon")?.addEventListener("change", updateLogoPreview);

    // -----------------------------------------
    // IMAGE UPLOAD
    // -----------------------------------------

    $("achievement-image-upload")?.addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showNotification("Please select an image file.");
            event.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showNotification("Image must be smaller than 2 MB.");
            event.target.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            uploadedImageData = reader.result;
            selectLogoType("image");
            updateLogoPreview();
        };

        reader.onerror = () => {
            uploadedImageData = null;
            event.target.value = "";
            updateLogoPreview();
            showNotification("Could not read the selected image.");
        };

        reader.readAsDataURL(file);
    });

    // -----------------------------------------
    // IMAGE ADJUSTMENT
    // -----------------------------------------

    function resetLogoAdjustment() {
        if ($("logo-zoom")) $("logo-zoom").value = 100;
        if ($("logo-position-x")) $("logo-position-x").value = 50;
        if ($("logo-position-y")) $("logo-position-y").value = 50;
    }

    ["logo-zoom", "logo-position-x", "logo-position-y"].forEach(id => {
        $(id)?.addEventListener("input", updateLogoPreview);
    });

    $("reset-logo-adjustment")?.addEventListener("click", () => {
        resetLogoAdjustment();
        updateLogoPreview();
    });

    // -----------------------------------------
    // FORM DATA
    // -----------------------------------------

    function getFormData() {
        const progress = Math.max(
            0,
            Math.min(100, Number($("achievement-initial-progress")?.value || 0))
        );

        return {
            name: $("achievement-name")?.value.trim() || "",
            description: $("achievement-description")?.value.trim() || "",
            category: $("achievement-category")?.value || "",
            logoType: selectedLogoType,
            emoji: $("achievement-emoji")?.value || "⭐",
            icon: $("achievement-icon")?.value || "star",
            image: uploadedImageData,
            zoom: Number($("logo-zoom")?.value || 100),
            positionX: Number($("logo-position-x")?.value || 50),
            positionY: Number($("logo-position-y")?.value || 50),
            startDate: $("achievement-start-date")?.value || today(),
            targetDate: $("achievement-target-date")?.value || "",
            progress
        };
    }

    // -----------------------------------------
    // PROGRESS
    // -----------------------------------------

    function updateProgressStatus(item) {
        item.progress = Math.max(
            0,
            Math.min(100, Number(item.progress) || 0)
        );

        if (item.progress >= 100) {
            if (item.status !== "achieved") {
                item.status = "achieved";
                item.achievedDate = today();
                showNotification("Achievement completed! ✨");
            }
        } else {
            if (item.status === "achieved") {
                item.status = "incomplete";
                item.achievedDate = null;
            }
        }
    }

    const progressSlider = $("achievement-initial-progress");
    const progressValue = $("achievement-initial-progress-value");

    progressSlider?.addEventListener("input", () => {
        if (progressValue) {
            progressValue.textContent = `${progressSlider.value}%`;
        }
    });

    // -----------------------------------------
    // CREATE / UPDATE
    // -----------------------------------------

    form?.addEventListener("submit", event => {
        event.preventDefault();

        const data = getFormData();

        if (!data.name) {
            showNotification("Please enter an achievement name.");
            return;
        }

        const id = $("achievement-id")?.value;

        if (id) {
            const existing = achievements.find(item => item.id === id);

            if (!existing) return;

            if (
                window.FubanAchievementSync &&
                !window.FubanAchievementSync.setBaseProgress(existing, data.progress)
            ) {
                showNotification("Could not update linked achievement progress.");
                return;
            }

            Object.assign(existing, data);

            // Keep system ownership and archive status.
            if (existing.status !== "archive") {
                updateProgressStatus(existing);
            } else {
                existing.progress = data.progress;
            }

            showNotification("Achievement updated.");
        } else {
            const newAchievement = {
                id: createId(),
                ...data,
                status: "incomplete",
                achievedDate: null,
                isSystem: false,
                createdAt: new Date().toISOString()
            };

            updateProgressStatus(newAchievement);
            achievements.push(newAchievement);

            showNotification("Achievement created!");
        }

        saveData();
        window.FubanAchievementSync?.updateAchievements();
        renderAchievements();
        closeModal();

        if (activeTab !== "archive") {
            switchTab(
                achievements.some(a => a.id === id && a.status === "achieved")
                    ? "achieved"
                    : "incomplete"
            );
        }
    });

    // -----------------------------------------
    // EDIT
    // -----------------------------------------

    function openEditModal(id) {
        const item = achievements.find(a => a.id === id);
        if (!item) return;

        $("achievement-id").value = item.id;
        $("achievement-name").value = item.name;
        $("achievement-description").value = item.description || "";
        $("achievement-category").value = item.category || "";
        $("achievement-start-date").value = item.startDate || "";
        $("achievement-target-date").value = item.targetDate || "";
        $("achievement-initial-progress").value = item.progress || 0;

        if (progressValue) {
            progressValue.textContent = `${item.progress || 0}%`;
        }

        $("achievement-emoji").value = item.emoji || "⭐";
        $("achievement-icon").value = item.icon || "star";

        uploadedImageData = item.image || null;

        $("logo-zoom").value = item.zoom || 100;
        $("logo-position-x").value = item.positionX ?? 50;
        $("logo-position-y").value = item.positionY ?? 50;

        selectLogoType(item.logoType || "emoji");

        const heading = modal?.querySelector("h2");
        if (heading) setModalMode(true);

        openModal();
        updateLogoPreview();
    }

    // -----------------------------------------
    // DELETE
    // -----------------------------------------

    function openDeleteModal(id) {
        const item = achievements.find(a => a.id === id);

        if (!item || item.isSystem) return;

        pendingDeleteId = id;

        if (deleteModal) deleteModal.hidden = false;
    }

    function closeDeleteModal() {
        pendingDeleteId = null;

        if (deleteModal) deleteModal.hidden = true;
    }

    $("close-delete-modal")?.addEventListener("click", closeDeleteModal);
    $("cancel-delete-achievement")?.addEventListener("click", closeDeleteModal);

    $("confirm-delete-achievement")?.addEventListener("click", () => {
        if (!pendingDeleteId) return;

        const item = achievements.find(a => a.id === pendingDeleteId);

        if (!item || item.isSystem) {
            closeDeleteModal();
            return;
        }

        achievements = achievements.filter(a => a.id !== pendingDeleteId);

        saveData();
        renderAchievements();
        closeDeleteModal();

        showNotification("Achievement deleted.");
    });

    // -----------------------------------------
    // ARCHIVE / RESTORE
    // -----------------------------------------

    function archiveAchievement(id) {
        const item = achievements.find(a => a.id === id);
        if (!item) return;

        item.status = "archive";

        saveData();
        renderAchievements();

        showNotification("Achievement archived.");
    }

    function restoreAchievement(id) {
        const item = achievements.find(a => a.id === id);
        if (!item) return;

        item.status = item.progress >= 100 ? "achieved" : "incomplete";

        saveData();
        renderAchievements();

        showNotification("Achievement restored.");
    }

    // -----------------------------------------
    // INITIALIZE
    // -----------------------------------------

    loadData();
    window.FubanSystemAchievements?.refresh();
    loadData();
    setupCategoryFilter();
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) {
            loadData();
            renderAchievements();
        }
    });
    window.addEventListener("fuban:system-achievements-updated", () => {
        loadData();
        renderAchievements();
    });
    renderAchievements();
    switchTab("incomplete");

    // Initial progress label
    if (progressSlider && progressValue) {
        progressValue.textContent = `${progressSlider.value}%`;
    }

    console.log("FUBAN OS — Milestone Engine initialized.");
});
