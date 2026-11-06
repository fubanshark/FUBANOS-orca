document.addEventListener("DOMContentLoaded", () => {

    /* =====================================
       STORAGE
    ===================================== */

    const STORAGE = {
        missions: "fuban_dashboard_missions",
        rooms: "fuban_dashboard_rooms",
        wallpaper: "fuban_dashboard_wallpaper",
        opacity: "fuban_dashboard_wallpaper_opacity"
    };

    function readStorage(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) ?? fallback;
        } catch {
            return fallback;
        }
    }

    function saveStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error("Storage error:", error);
            alert("Unable to save data.");
            return false;
        }
    }

    function createId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return `fuban-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    }

    let missions = readStorage(STORAGE.missions, []);
    let rooms = readStorage(STORAGE.rooms, []);

    const today = new Date();

    function getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    /* =====================================
       MISSION CATEGORY COLORS
    ===================================== */

    const missionColors = {
        "Mathematics": "#004AAD",
        "Biology": "#7ED957",
        "Chemistry": "#8C52FF",
        "Physics": "#FF3131",
        "Earth & Astronomy": "#5CE1E6",
        "Painting & Art": "#FFBD59",
        "Music Skills": "#00BF63",
        "Sleeping": "#93D4FA",
        "Fitness / Workout": "#FF914D",
        "English Language": "#FF66C4",
        "Japanese Language": "#FF66C4",
        "Russian Language": "#FF66C4"
    };

    function getMissionColor(category) {
        return missionColors[category] || "#FFFFFF";
    }


    /* =====================================
       MODAL SYSTEM
    ===================================== */

    function openModal(id) {
        document.getElementById(id)?.classList.add("show");
    }

    function closeModal(id) {
        document.getElementById(id)?.classList.remove("show");
    }

    // Close buttons

    document.querySelectorAll("[data-close]").forEach(button => {

        button.addEventListener("click", () => {
            closeModal(button.dataset.close);
        });

    });

    // Click outside modal

    document.querySelectorAll(".modal-overlay").forEach(modal => {

        modal.addEventListener("click", event => {

            if (event.target === modal) {
                modal.classList.remove("show");
            }

        });

    });

    // Escape key

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            document.querySelectorAll(".modal-overlay.show")
                .forEach(modal => {
                    modal.classList.remove("show");
                });

        }

    });


    /* =====================================
       MISSION SYSTEM
    ===================================== */

    const missionList = document.getElementById("mission-list");
    const missionForm = document.getElementById("mission-form");
    const getMissionAchievementSync = window.FubanAchievementSync?.setupForm({
        formId: "mission-form",
        toggleId: "mission-sync-achievement-enabled",
        panelId: "mission-sync-achievement-fields",
        selectId: "mission-sync-achievement",
        amountId: "mission-sync-achievement-progress"
    }) || (() => ({ valid: true, value: null }));

    function getMissionXpReward(mission) {
        const reward = Number(mission.xpReward ?? 10);

        return Number.isInteger(reward) && reward >= 0 && reward <= 1000
            ? reward
            : 0;
    }

    function formatMissionXpReward(mission) {
        const reward = getMissionXpReward(mission);

        if (mission.type !== "percentage") {
            return `+${reward} XP`;
        }

        const progress = Math.max(
            0,
            Math.min(100, Number(mission.progress) || 0)
        );

        return `${Math.floor(reward * progress / 100)} / ${reward} XP`;
    }

    missions
        .filter(mission => mission.type === "percentage")
        .forEach(mission => {
            const progress = Math.max(
                0,
                Math.min(100, Number(mission.progress) || 0)
            );

            window.FubanXP.setMissionProgress(
                mission.id,
                Math.floor(getMissionXpReward(mission) * progress / 100)
            );
        });

    // Open mission modal

    document.getElementById("add-mission-button")
        ?.addEventListener("click", () => {

            openModal("mission-modal");

        });


    // Create mission

    missionForm?.addEventListener("submit", event => {

        event.preventDefault();

        const name = document.getElementById("mission-name")
            .value.trim();

        const category = document.getElementById("mission-category")
            .value;

        const subcategory = document.getElementById("mission-subcategory")
            .value.trim();

        const type = document.getElementById("mission-type")
            .value;

        const xpReward = document.getElementById("mission-xp-reward")
            .valueAsNumber;
        const achievementSync = getMissionAchievementSync();

        if (
            !name ||
            !category ||
            !Number.isInteger(xpReward) ||
            xpReward < 0 ||
            xpReward > 1000 ||
            !achievementSync.valid
        ) {
            alert(achievementSync.valid
                ? "Please enter a mission XP reward from 0 to 1000."
                : "Select an achievement and a progress amount from 1 to 100.");
            return;
        }

        missions.push({

            id: createId(),

            name,
            category,
            subcategory,
            type,
            xpReward,

            progress: 0,

            date: getDateKey(new Date()),
            ...(achievementSync.value
                ? { achievementSync: achievementSync.value }
                : {})

        });

        if (!saveStorage(STORAGE.missions, missions)) {
            missions.pop();
            return;
        }

        window.FubanAchievementSync?.updateAchievements();
        window.FubanSystemAchievements?.refresh();

        renderMissions();
        updateCalendar();

        closeModal("mission-modal");

        missionForm.reset();

    });


    // Render missions

    function renderMissions() {

        if (!missionList) return;

        const todayKey = getDateKey(new Date());

        const todayMissions = missions.filter(
            mission => mission.date === todayKey
        );

        missionList.innerHTML = "";

        if (!todayMissions.length) {

            missionList.innerHTML =
                '<p class="empty-message">No missions yet.</p>';

        }

        todayMissions.forEach(mission => {

            const color = getMissionColor(mission.category);


            // Mission item

            const item = document.createElement("article");

            item.className = "mission-item";

            item.style.setProperty("--mission-color", color);


            // Top section

            const top = document.createElement("div");

            top.className = "mission-item-top";


            // Mission information

            const info = document.createElement("div");

            info.className = "mission-info";


            const name = document.createElement("span");

            name.className = "mission-name";

            name.textContent = mission.name;


            const category = document.createElement("span");

            category.className = "mission-category";

            category.textContent = mission.subcategory
                ? `${mission.category} / ${mission.subcategory}`
                : mission.category;

            const xpReward = document.createElement("span");

            xpReward.className = "mission-xp-reward";
            xpReward.textContent = formatMissionXpReward(mission);


            const colorMarker = document.createElement("span");

            colorMarker.className = "mission-color-marker";

            colorMarker.style.backgroundColor = color;


            info.append(colorMarker, name, category, xpReward);


            // Delete button

            const remove = document.createElement("button");

            remove.className = "mission-delete";

            remove.type = "button";

            remove.textContent = "×";

            remove.setAttribute("aria-label", "Delete mission");


            remove.addEventListener("click", () => {

                missions = missions.filter(
                    current => current.id !== mission.id
                );

                if (saveStorage(STORAGE.missions, missions)) {
                    window.FubanAchievementSync?.updateAchievements();
                    window.FubanSystemAchievements?.refresh();
                }
                function createId() {
    return "fuban-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 12);
}

                renderMissions();

                updateCalendar();

            });


            top.append(info, remove);


            // Progress bar

            const track = document.createElement("div");

            track.className = "mission-progress-track";


            const fill = document.createElement("div");

            fill.className = "mission-progress-fill";

            fill.style.width = `${mission.progress}%`;

            fill.style.backgroundColor = color;


            track.appendChild(fill);


            // Mission controls

            const controls = document.createElement("div");

            controls.className = "mission-controls";


            if (mission.type === "percentage") {

                // Percentage tracking

                const range = document.createElement("input");

                range.type = "range";

                range.min = 0;

                range.max = 100;

                range.value = mission.progress;

                range.className = "mission-range";

                range.style.accentColor = color;

                range.setAttribute(
                    "aria-label",
                    "Mission progress"
                );


                range.addEventListener("input", () => {

                    mission.progress = Number(range.value);

                    fill.style.width = `${mission.progress}%`;

                    if (saveStorage(STORAGE.missions, missions)) {
                        window.FubanAchievementSync?.updateAchievements();
                        window.FubanSystemAchievements?.refresh();

                        const earnedXp = Math.floor(
                            getMissionXpReward(mission) *
                            mission.progress / 100
                        );
                        xpReward.textContent =
                            `${earnedXp} / ${getMissionXpReward(mission)} XP`;

                        window.FubanXP.setMissionProgress(
                            mission.id,
                            earnedXp
                        );
                    }

                    renderActivity();

                });


                controls.appendChild(range);


            } else {

                // Checkbox tracking

                const label = document.createElement("label");

                label.className = "mission-checkbox-label";


                const checkbox = document.createElement("input");

                checkbox.type = "checkbox";

                checkbox.className = "mission-checkbox";

                checkbox.checked = Number(mission.progress) === 100;

                checkbox.style.accentColor = color;


                checkbox.addEventListener("change", () => {

                    mission.progress = checkbox.checked ? 100 : 0;

                    fill.style.width = `${mission.progress}%`;

                    if (saveStorage(STORAGE.missions, missions)) {
                        window.FubanAchievementSync?.updateAchievements();
                        window.FubanSystemAchievements?.refresh();

                        if (mission.progress === 100) {
                            window.FubanXP.award(
                                `mission:${mission.id}`,
                                getMissionXpReward(mission),
                                "mission"
                            );
                        }
                    }

                    renderActivity();

                });


                label.append(
                    checkbox,
                    document.createTextNode("Completed")
                );

                controls.appendChild(label);

            }


            item.append(top, track, controls);

            missionList.appendChild(item);

        });


        renderActivity();

    }

    const dashboardXpTotal = document.getElementById(
        "dashboard-xp-total"
    );

    function renderXpTotal() {
        if (!dashboardXpTotal) return;

        const total = window.FubanXP.getTotal();
        dashboardXpTotal.textContent =
            total === null ? "XP unavailable" : `${total} XP`;
    }

    window.addEventListener("fuban:xp-change", renderXpTotal);
    window.addEventListener("storage", event => {
        if (event.key === "fuban_xp_ledger") renderXpTotal();
    });
    renderXpTotal();


    /* =====================================
       ACTIVITY DONUT
    ===================================== */

    function renderActivity() {

        const todayKey = getDateKey(new Date());

        const todayMissions = missions.filter(
            mission => mission.date === todayKey
        );


        const donut = document.getElementById("activity-donut");

        const efficiency = document.getElementById("efficiency-value");

        const summary = document.getElementById(
            "activity-summary-text"
        );

        const categoryList = document.getElementById(
            "activity-category-list"
        );


        if (!donut || !efficiency || !summary || !categoryList) {
            return;
        }


        // No missions

        if (!todayMissions.length) {

            donut.style.background =
                "conic-gradient(rgba(255,255,255,0.17) 0deg 360deg)";

            donut.style.setProperty("--donut-value", "0%");

            efficiency.textContent = "0%";

            summary.textContent = "No activity recorded yet.";

            categoryList.innerHTML = "";

            return;

        }


        // Calculate average mission progress

        const totalProgress = todayMissions.reduce(
            (sum, mission) => {
                return sum + Number(mission.progress || 0);
            },
            0
        );

        const average = totalProgress / todayMissions.length;


        // Display efficiency

        efficiency.textContent = `${average.toFixed(1)}%`;

        donut.style.setProperty(
            "--donut-value",
            `${average}%`
        );


        // Completed missions

        const completed = todayMissions.filter(
            mission => Number(mission.progress) === 100
        ).length;

        summary.textContent =
            `${completed} of ${todayMissions.length} missions completed.`;


        // Group missions by category

        const categories = {};

        todayMissions.forEach(mission => {

            const name = mission.category;

            if (!categories[name]) {

                categories[name] = {
                    total: 0,
                    progress: 0
                };

            }

            categories[name].total++;

            categories[name].progress += Number(
                mission.progress || 0
            );

        });


        // Create donut color segments

        let currentAngle = 0;

        const gradientParts = Object.entries(categories).map(
            ([name, data]) => {

                const angle =
                    (data.total / todayMissions.length) * 360;

                const start = currentAngle;

                const end = currentAngle + angle;

                currentAngle = end;

                return `${getMissionColor(name)} ${start}deg ${end}deg`;

            }
        );


        donut.style.background =
            `conic-gradient(${gradientParts.join(", ")})`;


        // Category legend

        categoryList.innerHTML = "";

        Object.entries(categories).forEach(([name, data]) => {

            const percent = Math.round(
                data.progress / data.total
            );


            const row = document.createElement("div");

            row.className = "activity-category-row";


            const marker = document.createElement("span");

            marker.className = "activity-marker";

            marker.style.backgroundColor = getMissionColor(name);


            const label = document.createElement("span");

            label.className = "activity-category-name";

            label.textContent = name;


            const value = document.createElement("span");

            value.className = "activity-category-percent";

            value.textContent = `${percent}%`;


            row.append(marker, label, value);

            categoryList.appendChild(row);

        });

    }


    /* =====================================
       CALENDAR
    ===================================== */

    let calendarDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    let selectedDate = getDateKey(today);


    const calendarMonth = document.getElementById("calendar-month");

    const calendarDays = document.getElementById("calendar-days");


    function renderCalendar(container) {

        if (!container) return;


        const year = calendarDate.getFullYear();

        const month = calendarDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();

        const daysInMonth = new Date(
            year,
            month + 1,
            0
        ).getDate();


        container.innerHTML = "";

        const fragment = document.createDocumentFragment();


        // Empty spaces before first day

        for (let i = 0; i < firstDay; i++) {

            const empty = document.createElement("div");

            empty.className = "calendar-day empty";

            fragment.appendChild(empty);

        }


        // Days of the month

        for (let day = 1; day <= daysInMonth; day++) {

            const date = new Date(year, month, day);

            const dateKey = getDateKey(date);


            const button = document.createElement("button");

            button.type = "button";

            button.className = "calendar-day";


            // Day number

            const dayNumber = document.createElement("span");

            dayNumber.className = "calendar-day-number";

            dayNumber.textContent = day;


            // Mission dots

            const dots = document.createElement("div");

            dots.className = "calendar-mission-dots";


            const dayMissions = missions.filter(
                mission => mission.date === dateKey
            );


            dayMissions.forEach(mission => {

                const dot = document.createElement("span");

                dot.className = "calendar-mission-dot";

                dot.style.backgroundColor =
                    getMissionColor(mission.category);

                dot.title =
                    `${mission.name} (${mission.category})`;

                dots.appendChild(dot);

            });


            button.append(dayNumber, dots);


            // Today

            if (dateKey === getDateKey(new Date())) {

                button.classList.add("today");

            }


            // Selected date

            if (dateKey === selectedDate) {

                button.classList.add("selected");

            }


            // Mission indicator

            if (dayMissions.length) {

                button.classList.add("has-mission");

                button.setAttribute(
                    "aria-label",
                    `${day} - ${dayMissions.length} missions`
                );

            }


            // Select date

            button.addEventListener("click", () => {

                selectedDate = dateKey;

                renderCalendar(calendarDays);

            });


            fragment.appendChild(button);

        }


        container.appendChild(fragment);

    }


    function updateCalendar() {

        if (calendarMonth) {

            calendarMonth.textContent =
                calendarDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric"
                });

        }

        renderCalendar(calendarDays);

    }


    // Previous month

    document.getElementById("calendar-prev")
        ?.addEventListener("click", () => {

            calendarDate.setMonth(calendarDate.getMonth() - 1);

            updateCalendar();

        });


    // Next month

    document.getElementById("calendar-next")
        ?.addEventListener("click", () => {

            calendarDate.setMonth(calendarDate.getMonth() + 1);

            updateCalendar();

        });


    // Calendar expand link navigates directly to calendar.html.


    /* =====================================
       ROOMS
    ===================================== */

    const roomList = document.getElementById("room-list");


    // Open room modal

    document.getElementById("add-room-button")
        ?.addEventListener("click", () => {

            openModal("room-modal");

        });


    // Add room

    document.getElementById("room-form")
        ?.addEventListener("submit", event => {

            event.preventDefault();


            const name = document.getElementById("room-name")
                .value.trim();

            let url = document.getElementById("room-url")
                .value.trim();


            if (!name || !url) return;


            try {

                const parsed = new URL(url);

                if (!["http:", "https:"].includes(parsed.protocol)) {

                    throw new Error("Invalid protocol");

                }

                url = parsed.href;


            } catch {

                alert("Please enter a valid website URL.");

                return;

            }


            rooms.push({

                id: createId(),

                name,

                url

            });


            saveStorage(STORAGE.rooms, rooms);

            renderRooms();

            closeModal("room-modal");

            event.target.reset();

        });


    // Render rooms

    function renderRooms() {

        if (!roomList) return;


        roomList.innerHTML = "";


        if (!rooms.length) {

            roomList.innerHTML =
                '<p class="empty-message">No rooms added yet.</p>';

            return;

        }


        rooms.forEach(room => {


            const item = document.createElement("div");

            item.className = "room-item";


            // Room icon

            const icon = document.createElement("span");

            icon.className = "room-icon";

            icon.textContent = "↗";


            // Website link

            const link = document.createElement("a");

            link.href = room.url;

            link.target = "_blank";

            link.rel = "noopener noreferrer";

            link.textContent = room.name;


            link.addEventListener("click", event => {

                event.stopPropagation();

            });


            // Action buttons

            const actions = document.createElement("div");

            actions.className = "room-actions";


            // Edit

            const edit = document.createElement("button");

            edit.type = "button";

            edit.textContent = "Edit";


            edit.addEventListener("click", () => {


                const newName = prompt(
                    "Website name:",
                    room.name
                );

                if (newName === null || !newName.trim()) return;


                const newUrl = prompt(
                    "Website URL:",
                    room.url
                );

                if (newUrl === null || !newUrl.trim()) return;


                try {

                    const parsed = new URL(newUrl.trim());

                    if (!["http:", "https:"].includes(parsed.protocol)) {

                        throw new Error("Invalid URL");

                    }


                    room.name = newName.trim();

                    room.url = parsed.href;


                    saveStorage(STORAGE.rooms, rooms);

                    renderRooms();


                } catch {

                    alert("Please enter a valid website URL.");

                }

            });


            // Delete

            const remove = document.createElement("button");

            remove.type = "button";

            remove.textContent = "Delete";


            remove.addEventListener("click", () => {


                if (!confirm(`Delete ${room.name}?`)) return;


                rooms = rooms.filter(
                    current => current.id !== room.id
                );


                saveStorage(STORAGE.rooms, rooms);

                renderRooms();

            });


            actions.append(edit, remove);

            item.append(icon, link, actions);

            roomList.appendChild(item);

        });

    }


    
/* =====================================
   DASHBOARD WALLPAPER SYSTEM
===================================== */

const wallpaperLayer = document.querySelector(
    ".dashboard-wallpaper"
);

const overlay = document.querySelector(
    ".wallpaper-overlay"
);

const wallpaperUpload = document.getElementById(
    "wallpaper-upload"
);

const wallpaperOpacity = document.getElementById(
    "wallpaper-opacity"
);

const opacityValue = document.getElementById(
    "wallpaper-opacity-value"
);

const wallpaperOptions = document.querySelectorAll(
    ".wallpaper-option"
);

const defaultWallpaper =
    "assets/wallpapers/1403447.jpg";

let selectedWallpaper =
    localStorage.getItem(STORAGE.wallpaper) || defaultWallpaper;


/* Apply wallpaper */

function applyWallpaper(path) {
    if (!wallpaperLayer) return;

    wallpaperLayer.style.backgroundImage =
        `url("${path}")`;
}


/* Apply darkness */

function applyWallpaperOpacity(value) {
    if (!overlay) return;

    const opacity = Number(value) / 100;

    overlay.style.backgroundColor =
        document.documentElement.dataset.theme === "light"
            ? `rgba(245, 245, 237, ${Math.max(0.18, 0.55 - opacity * 0.3)})`
            : `rgba(0, 0, 0, ${Math.min(0.78, opacity + 0.08)})`;

    if (opacityValue) {
        opacityValue.textContent = `${value}%`;
    }
}

window.addEventListener("fuban:theme-change", () => {
    applyWallpaperOpacity(
        localStorage.getItem(STORAGE.opacity) ?? "45"
    );
});

window.addEventListener("storage", event => {
    if (event.key === "fuban_settings_v1") {
        applyWallpaperOpacity(
            localStorage.getItem(STORAGE.opacity) ?? "45"
        );
    }
});


/* Highlight selected wallpaper */

function updateWallpaperSelection() {
    wallpaperOptions.forEach(option => {

        const isSelected =
            option.dataset.wallpaper === selectedWallpaper;

        option.classList.toggle("selected", isSelected);

    });
}


/* Load saved settings */

const savedOpacity =
    localStorage.getItem(STORAGE.opacity) ?? "45";

applyWallpaper(selectedWallpaper);
applyWallpaperOpacity(savedOpacity);

if (wallpaperOpacity) {
    wallpaperOpacity.value = savedOpacity;
}

updateWallpaperSelection();


/* Open wallpaper modal */

document.getElementById("wallpaper-open")
    ?.addEventListener("click", () => {
        openModal("wallpaper-modal");
    });


/* Select built-in wallpaper */

wallpaperOptions.forEach(option => {

    option.addEventListener("click", () => {

        selectedWallpaper = option.dataset.wallpaper;

        applyWallpaper(selectedWallpaper);

        updateWallpaperSelection();

    });

});


/* Upload custom wallpaper */

wallpaperUpload?.addEventListener("change", event => {

    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        event.target.value = "";
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        alert("Image must be smaller than 5 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {

        selectedWallpaper = reader.result;

        applyWallpaper(selectedWallpaper);

        updateWallpaperSelection();

    };

    reader.readAsDataURL(file);

});


/* Darkness slider */

wallpaperOpacity?.addEventListener("input", () => {

    applyWallpaperOpacity(wallpaperOpacity.value);

});


/* Save wallpaper settings */

document.getElementById("wallpaper-save")
    ?.addEventListener("click", () => {

        try {

            localStorage.setItem(
                STORAGE.wallpaper,
                selectedWallpaper
            );

            localStorage.setItem(
                STORAGE.opacity,
                wallpaperOpacity?.value ?? "45"
            );

        } catch (error) {

            alert(
                "Unable to save wallpaper. Try a smaller image."
            );

            return;
        }

        closeModal("wallpaper-modal");

    });


    /* =====================================
       JOURNAL PREVIEW
    ===================================== */

    function renderJournalPreview() {

        const preview = document.getElementById(
            "journal-preview-text"
        );

        if (!preview) return;


        const journalText = localStorage.getItem(
            "fuban_latest_journal"
        );


        if (journalText) {

            preview.textContent = journalText;

        }

    }


    /* =====================================
       INITIAL RENDER
    ===================================== */

    renderMissions();

    renderActivity();

    renderRooms();

    updateCalendar();

    renderJournalPreview();

});