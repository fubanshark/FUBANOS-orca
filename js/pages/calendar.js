
document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       FUBAN OS - CALENDAR
       Monthly + Daily View
    ========================================= */


    /* =========================================
       1. STORAGE
    ========================================= */

    const STORAGE = {
        missions: "fuban_dashboard_missions",
        habits: "fuban_calendar_habits",
        goals: "fuban_calendar_goals",
        reviews: "fuban_calendar_daily_reviews"
    };

    function readStorage(key, fallback) {
        try {
            const value = localStorage.getItem(key);

            if (value === null) return fallback;

            const parsed = JSON.parse(value);

            return parsed ?? fallback;

        } catch (error) {
            console.error("Storage read error:", key, error);
            return fallback;
        }
    }

    function saveStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;

        } catch (error) {
            console.error("Storage save error:", key, error);

            alert(
                "Unable to save data. Please check your device storage."
            );

            return false;
        }
    }

    /* =========================================
   DASHBOARD WALLPAPER CONNECTION
========================================= */

    const DASHBOARD_WALLPAPER_KEY = "fuban_dashboard_wallpaper";

    const DEFAULT_CALENDAR_WALLPAPER =
        "assets/wallpapers/1403447.jpg";

    const calendarWallpaperLayer = document.querySelector(
        ".calendar-wallpaper"
    );

    function applyDashboardWallpaper() {

        if (!calendarWallpaperLayer) return;

        const savedWallpaper = localStorage.getItem(
            DASHBOARD_WALLPAPER_KEY
        );

        const wallpaper =
            savedWallpaper || DEFAULT_CALENDAR_WALLPAPER;

        calendarWallpaperLayer.style.backgroundImage =
            `url("${wallpaper}")`;

    }

    // Load the wallpaper selected in Dashboard.
    applyDashboardWallpaper();

    // Update Calendar when wallpaper changes in another tab.
    window.addEventListener("storage", event => {

        if (event.key === DASHBOARD_WALLPAPER_KEY) {
            applyDashboardWallpaper();
        }

    });

    // Compatible ID generator for mobile browsers.
    function createId() {
        return "fuban-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 12);
    }

    let missions = readStorage(STORAGE.missions, []);
    let habits = readStorage(STORAGE.habits, []);
    let goals = readStorage(STORAGE.goals, []);
    let dailyReviews = readStorage(STORAGE.reviews, {});

    // Prevent malformed saved data from breaking the page.
    if (!Array.isArray(missions)) missions = [];
    if (!Array.isArray(habits)) habits = [];
    if (!Array.isArray(goals)) goals = [];

    if (
        !dailyReviews ||
        typeof dailyReviews !== "object" ||
        Array.isArray(dailyReviews)
    ) {
        dailyReviews = {};
    }


    /* =========================================
       2. DATE UTILITIES
    ========================================= */

    function getDateKey(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function parseDateKey(key) {
        const [year, month, day] = key.split("-").map(Number);

        return new Date(year, month - 1, day);
    }

    function formatDate(date, options = {}) {
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            ...options
        });
    }

    function addDays(date, amount) {
        const result = new Date(date);
        result.setDate(result.getDate() + amount);
        return result;
    }

    function getWeekStart(date) {
        const result = new Date(date);
        result.setHours(0, 0, 0, 0);
        result.setDate(result.getDate() - result.getDay());

        return result;
    }

    function getGoalPeriodKey(type, dateKey) {
        const date = parseDateKey(dateKey);

        if (type === "yearly") {
            return String(date.getFullYear());
        }

        if (type === "monthly") {
            return `${date.getFullYear()}-${String(
                date.getMonth() + 1
            ).padStart(2, "0")}`;
        }

        return getDateKey(getWeekStart(date));
    }

    const todayKey = getDateKey(new Date());

    let selectedDate = todayKey;

    let calendarDate = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
    );


    /* =========================================
       3. CATEGORY COLORS
    ========================================= */

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


    /* =========================================
       4. ELEMENTS
    ========================================= */

    const monthTitle = document.getElementById(
        "calendar-month-title"
    );

    const monthDays = document.getElementById(
        "calendar-month-days"
    );

    const selectedDateTitle = document.getElementById(
        "selected-date-title"
    );

    const selectedDateSubtitle = document.getElementById(
        "selected-date-subtitle"
    );

    const todayButton = document.getElementById(
        "calendar-today-button"
    );

    const previousMonthButton = document.getElementById(
        "calendar-month-prev"
    );

    const nextMonthButton = document.getElementById(
        "calendar-month-next"
    );


    /* =========================================
       5. MODAL SYSTEM
    ========================================= */

    function openModal(id) {
        const modal = document.getElementById(id);

        if (!modal) return;

        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
    }

    function closeModal(id) {
        const modal = document.getElementById(id);

        if (!modal) return;

        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }

    document.querySelectorAll("[data-close]").forEach(button => {

        button.addEventListener("click", () => {
            closeModal(button.dataset.close);
        });

    });

    document.querySelectorAll(".calendar-modal").forEach(modal => {

        modal.addEventListener("click", event => {

            if (event.target === modal) {
                closeModal(modal.id);
            }

        });

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            document.querySelectorAll(".calendar-modal.show")
                .forEach(modal => {
                    closeModal(modal.id);
                });

        }

    });


    /* =========================================
       6. MONTHLY CALENDAR
    ========================================= */

    function renderCalendar() {
        if (!monthDays || !monthTitle) return;

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        monthTitle.textContent = calendarDate.toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );

        monthDays.innerHTML = "";

        const firstDay = new Date(year, month, 1).getDay();

        const daysInMonth = new Date(
            year,
            month + 1,
            0
        ).getDate();

        const totalCells = Math.ceil(
            (firstDay + daysInMonth) / 7
        ) * 7;

        const fragment = document.createDocumentFragment();

        for (let i = 0; i < totalCells; i++) {

            const dayNumber = i - firstDay + 1;

            if (
                dayNumber < 1 ||
                dayNumber > daysInMonth
            ) {
                const empty = document.createElement("div");

                empty.className = "calendar-day empty";

                fragment.appendChild(empty);

                continue;
            }

            const date = new Date(year, month, dayNumber);

            const dateKey = getDateKey(date);

            const dayMissions = missions.filter(
                mission => mission.date === dateKey
            );

            const dayHabits = habits.filter(
                habit => isHabitScheduled(habit, date)
            );

            const button = document.createElement("button");

            button.type = "button";
            button.className = "calendar-day";
            button.setAttribute("aria-pressed", String(
                dateKey === selectedDate
            ));

            button.setAttribute(
                "aria-label",
                formatDate(date)
            );

            if (dateKey === todayKey) {
                button.classList.add("today");
            }

            if (dateKey === selectedDate) {
                button.classList.add("selected");
            }

            if (dayMissions.length) {
                button.classList.add("has-mission");
            }

            if (dayHabits.length) {
                button.classList.add("has-habit");
            }

            const number = document.createElement("span");

            number.className = "calendar-day-number";
            number.textContent = dayNumber;

            const dots = document.createElement("div");

            dots.className = "calendar-day-dots";

            const indicators = [
                ...dayMissions.map(mission => ({
                    category: mission.category,
                    type: "mission"
                })),
                ...dayHabits.map(habit => ({
                    category: habit.category,
                    type: "habit"
                }))
            ];

            indicators.slice(0, 5).forEach(indicator => {

                const dot = document.createElement("span");

                dot.className = "calendar-mission-dot";

                if (indicator.type === "habit") {
                    dot.classList.add("habit-calendar-dot");
                }

                dot.style.backgroundColor =
                    getMissionColor(indicator.category);

                dots.appendChild(dot);

            });

            if (indicators.length > 5) {
                const more = document.createElement("span");

                more.className = "calendar-more-dots";
                more.textContent = `+${indicators.length - 5}`;

                dots.appendChild(more);
            }

            button.append(number, dots);

            button.addEventListener("click", () => {

                selectedDate = dateKey;

                calendarDate = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    1
                );

                renderAll();

            });

            fragment.appendChild(button);

        }

        monthDays.appendChild(fragment);
    }


    function changeMonth(amount) {

        const currentSelectedDate = parseDateKey(selectedDate);

        const targetMonth = new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth() + amount,
            1
        );

        const lastDay = new Date(
            targetMonth.getFullYear(),
            targetMonth.getMonth() + 1,
            0
        ).getDate();

        const day = Math.min(
            currentSelectedDate.getDate(),
            lastDay
        );

        const newSelectedDate = new Date(
            targetMonth.getFullYear(),
            targetMonth.getMonth(),
            day
        );

        selectedDate = getDateKey(newSelectedDate);

        calendarDate = targetMonth;

        renderAll();
    }

    previousMonthButton?.addEventListener("click", () => {
        changeMonth(-1);
    });

    nextMonthButton?.addEventListener("click", () => {
        changeMonth(1);
    });

    todayButton?.addEventListener("click", () => {

        const today = new Date();

        selectedDate = getDateKey(today);

        calendarDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        );

        renderAll();

    });


    /* =========================================
       7. DAILY HEADER
    ========================================= */

    function renderDailyHeader() {

        const date = parseDateKey(selectedDate);

        if (selectedDateTitle) {
            selectedDateTitle.textContent = formatDate(date);
        }

        if (selectedDateSubtitle) {

            selectedDateSubtitle.textContent =
                selectedDate === todayKey
                    ? "Your activities for today"
                    : `Activities planned for ${selectedDate}`;

        }

    }


    /* =========================================
       8. MISSION SYSTEM
       Uses the same data as Dashboard.
    ========================================= */

    function getMissionsForDate(dateKey) {

        return missions.filter(
            mission => mission.date === dateKey
        );

    }


    const missionList = document.getElementById(
        "daily-mission-list"
    );

    const missionModal = document.getElementById(
        "calendar-mission-modal"
    );

    const missionForm = document.getElementById(
        "calendar-mission-form"
    );
    const getCalendarMissionAchievementSync =
        window.FubanAchievementSync?.setupForm({
            formId: "calendar-mission-form",
            toggleId: "calendar-mission-sync-achievement-enabled",
            panelId: "calendar-mission-sync-achievement-fields",
            selectId: "calendar-mission-sync-achievement",
            amountId: "calendar-mission-sync-achievement-progress"
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

    const missionDateInput = document.getElementById(
        "calendar-mission-date"
    );


    function openMissionModal() {

        if (missionDateInput) {
            missionDateInput.value = selectedDate;
        }

        openModal("calendar-mission-modal");
    }

    document.getElementById("add-daily-mission-button")
        ?.addEventListener("click", openMissionModal);


    missionForm?.addEventListener("submit", event => {

        event.preventDefault();

        const name = document.getElementById(
            "calendar-mission-name"
        ).value.trim();

        const date = missionDateInput.value;

        const category = document.getElementById(
            "calendar-mission-category"
        ).value;

        const subcategory = document.getElementById(
            "calendar-mission-subcategory"
        ).value.trim();

        const type = document.getElementById(
            "calendar-mission-type"
        ).value;

        const xpReward = document.getElementById(
            "calendar-mission-xp-reward"
        ).valueAsNumber;
        const achievementSync = getCalendarMissionAchievementSync();

        if (
            !name ||
            !date ||
            !category ||
            !Number.isInteger(xpReward) ||
            xpReward < 0 ||
            xpReward > 1000 ||
            !achievementSync.valid
        ) {
            alert(achievementSync.valid
                ? "Please complete the required fields and enter an XP reward from 0 to 1000."
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
            date,
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

        selectedDate = date;

        const selected = parseDateKey(date);

        calendarDate = new Date(
            selected.getFullYear(),
            selected.getMonth(),
            1
        );

        missionForm.reset();

        closeModal("calendar-mission-modal");

        renderAll();

    });


    function renderMissions() {

        if (!missionList) return;

        const todayMissions = getMissionsForDate(selectedDate);

        missionList.innerHTML = "";

        if (!todayMissions.length) {

            missionList.innerHTML =
                '<p class="calendar-empty">No missions planned for this day.</p>';

            return;
        }

        todayMissions.forEach(mission => {

            const color = getMissionColor(mission.category);

            const progress = Math.max(
                0,
                Math.min(100, Number(mission.progress) || 0)
            );

            const item = document.createElement("article");

            item.className = "calendar-task-item";
            item.style.setProperty("--task-color", color);


            // Task heading

            const heading = document.createElement("div");

            heading.className = "calendar-task-heading";

            const info = document.createElement("div");

            info.className = "calendar-task-info";

            const name = document.createElement("strong");

            name.className = "calendar-task-name";
            name.textContent = mission.name;

            const category = document.createElement("span");

            category.className = "calendar-task-category";

            category.textContent = mission.subcategory
                ? `${mission.category} / ${mission.subcategory}`
                : mission.category;

            const xpReward = document.createElement("span");

            xpReward.className = "calendar-task-xp";
            xpReward.textContent = formatMissionXpReward(mission);

            info.append(name, category, xpReward);


            // Delete button

            const remove = document.createElement("button");

            remove.type = "button";
            remove.className = "calendar-task-delete";
            remove.textContent = "×";
            remove.setAttribute("aria-label", "Delete mission");

            remove.addEventListener("click", () => {

                if (!confirm(`Delete "${mission.name}"?`)) return;

                const previousMissions = missions;

                missions = missions.filter(
                    current => current.id !== mission.id
                );

                if (!saveStorage(STORAGE.missions, missions)) {
                    missions = previousMissions;
                    return;
                }

                window.FubanAchievementSync?.updateAchievements();
                window.FubanSystemAchievements?.refresh();
                renderAll();

            });

            heading.append(info, remove);


            // Progress track

            const track = document.createElement("div");

            track.className = "calendar-task-track";

            const fill = document.createElement("div");

            fill.className = "calendar-task-fill";

            fill.style.width = `${progress}%`;
            fill.style.backgroundColor = color;

            track.appendChild(fill);


            // Progress controls

            const controls = document.createElement("div");

            controls.className = "calendar-task-controls";

            if (mission.type === "percentage") {

                const range = document.createElement("input");

                range.type = "range";
                range.min = "0";
                range.max = "100";
                range.value = String(progress);
                range.className = "calendar-task-range";

                range.style.accentColor = color;

                range.setAttribute(
                    "aria-label",
                    `${mission.name} progress`
                );

                const value = document.createElement("span");

                value.className = "calendar-task-progress-value";
                value.textContent = `${progress}%`;

                range.addEventListener("input", () => {

                    mission.progress = Number(range.value);

                    fill.style.width = `${mission.progress}%`;

                    value.textContent = `${mission.progress}%`;

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

                    renderDailyMetrics();
                    renderDailySummary();
                    renderCalendar();
                    renderUpcomingAndOverdue();

                });

                controls.append(range, value);

            } else {

                const label = document.createElement("label");

                label.className = "calendar-task-checkbox-label";

                const checkbox = document.createElement("input");

                checkbox.type = "checkbox";
                checkbox.checked = progress === 100;

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

                    renderDailyMetrics();
                    renderDailySummary();
                    renderCalendar();
                    renderUpcomingAndOverdue();

                    value.textContent =
                        `${mission.progress}%`;

                });

                const text = document.createElement("span");

                text.textContent = "Completed";

                label.append(checkbox, text);

                const value = document.createElement("span");

                value.className = "calendar-task-progress-value";
                value.textContent = `${progress}%`;

                controls.append(label, value);

                // Keep the displayed value in sync.
                checkbox.addEventListener("change", () => {
                    value.textContent = `${mission.progress}%`;
                });

            }

            item.append(heading, track, controls);

            missionList.appendChild(item);

        });

    }


    /* =========================================
       9. DAILY EFFICIENCY
    ========================================= */

    function renderDailyMetrics() {

        const efficiencyValue = document.getElementById(
            "daily-efficiency-value"
        );

        const completedCount = document.getElementById(
            "daily-completed-count"
        );

        const efficiencyFill = document.getElementById(
            "daily-efficiency-fill"
        );

        const dayMissions = getMissionsForDate(selectedDate);

        if (!dayMissions.length) {

            if (efficiencyValue) {
                efficiencyValue.textContent = "0%";
            }

            if (completedCount) {
                completedCount.textContent = "0 / 0";
            }

            if (efficiencyFill) {
                efficiencyFill.style.width = "0%";
            }

            return;
        }

        const totalProgress = dayMissions.reduce(
            (sum, mission) => {
                return sum + Math.max(
                    0,
                    Math.min(100, Number(mission.progress) || 0)
                );
            },
            0
        );

        // Same base calculation as Dashboard:
        // Average progress of the day's missions.

        const efficiency =
            totalProgress / dayMissions.length;

        const completed = dayMissions.filter(
            mission => Number(mission.progress) === 100
        ).length;

        if (efficiencyValue) {
            efficiencyValue.textContent =
                `${efficiency.toFixed(1)}%`;
        }

        if (completedCount) {
            completedCount.textContent =
                `${completed} / ${dayMissions.length}`;
        }

        if (efficiencyFill) {
            efficiencyFill.style.width =
                `${Math.min(100, efficiency)}%`;
        }

    }


    function renderFocusMinutes() {
        const display = document.getElementById("daily-focus-minutes");
        if (!display) return;

        const minutes = window.FubanSystemAchievements?.getFocusMinutes(
            selectedDate
        );
        display.textContent = minutes === null || minutes === undefined
            ? "Unavailable"
            : `${minutes} minute${minutes === 1 ? "" : "s"}`;
    }

    window.addEventListener("fuban:system-achievements-updated", renderFocusMinutes);
    window.addEventListener("storage", event => {
        if (event.key === "fuban_focus_sessions") renderFocusMinutes();
    });

    /* =========================================
   10. RECURRING HABITS
========================================= */

const habitList = document.getElementById(
    "daily-habit-list"
);

const habitForm = document.getElementById(
    "calendar-habit-form"
);

const habitFrequency = document.getElementById(
    "calendar-habit-frequency"
);

const habitCustomDays = document.getElementById(
    "calendar-habit-custom-days"
);

let editingHabitId = null;


/* Check whether a habit should appear on a date */

function isHabitScheduled(habit, date) {

    const dateKey = getDateKey(date);

    if (habit.startDate && dateKey < habit.startDate) {
        return false;
    }

    if (habit.endDate && dateKey > habit.endDate) {
        return false;
    }

    const weekday = date.getDay();

    switch (habit.frequency) {

        case "daily":
            return true;

        case "weekdays":
            return weekday >= 1 && weekday <= 5;

        case "weekends":
            return weekday === 0 || weekday === 6;

        case "custom":
            return Array.isArray(habit.days) &&
                habit.days.includes(weekday);

        default:
            return false;
    }

}


/* Show or hide custom weekday choices */

function updateCustomHabitDays() {

    if (!habitCustomDays || !habitFrequency) return;

    habitCustomDays.hidden =
        habitFrequency.value !== "custom";

}

habitFrequency?.addEventListener(
    "change",
    updateCustomHabitDays
);


/* Open habit modal */

function openHabitModal(habit = null) {

    if (!habitForm) return;

    habitForm.reset();

    editingHabitId = habit ? habit.id : null;

    // Clear weekday selections.
    habitForm.querySelectorAll(
        'input[name="habit-day"]'
    ).forEach(input => {
        input.checked = false;
    });

    const title = document.getElementById(
        "calendar-habit-title"
    );

    const submitButton = habitForm.querySelector(
        'button[type="submit"]'
    );

    const startInput = document.getElementById(
        "calendar-habit-start"
    );

    const nameInput = document.getElementById(
        "calendar-habit-name"
    );

    const categoryInput = document.getElementById(
        "calendar-habit-category"
    );

    const endInput = document.getElementById(
        "calendar-habit-end"
    );

    if (habit) {

        // Edit existing habit.
        nameInput.value = habit.name;
        categoryInput.value = habit.category;
        habitFrequency.value = habit.frequency;
        startInput.value = habit.startDate || "";
        endInput.value = habit.endDate || "";

        const selectedDays = Array.isArray(habit.days)
            ? habit.days
            : [];

        habitForm.querySelectorAll(
            'input[name="habit-day"]'
        ).forEach(input => {

            input.checked = selectedDays.includes(
                Number(input.value)
            );

        });

        if (title) {
            title.textContent = "Edit Habit";
        }

        if (submitButton) {
            submitButton.textContent = "Save Changes";
        }

    } else {

        // Create new habit.
        startInput.value = selectedDate;

        if (title) {
            title.textContent = "New Habit";
        }

        if (submitButton) {
            submitButton.textContent = "Create Habit";
        }

    }

    updateCustomHabitDays();

    openModal("calendar-habit-modal");

}


/* Add new habit */

document.getElementById("add-habit-button")
    ?.addEventListener("click", () => {

        openHabitModal();

    });


/* Save new or edited habit */

habitForm?.addEventListener("submit", event => {

    event.preventDefault();

    const name = document.getElementById(
        "calendar-habit-name"
    ).value.trim();

    const category = document.getElementById(
        "calendar-habit-category"
    ).value;

    const frequency = habitFrequency.value;

    const startDate = document.getElementById(
        "calendar-habit-start"
    ).value;

    const endDate = document.getElementById(
        "calendar-habit-end"
    ).value;

    const selectedDays = [
        ...habitForm.querySelectorAll(
            'input[name="habit-day"]:checked'
        )
    ].map(input => Number(input.value));


    // Validation

    if (!name || !category || !startDate) {
        alert("Please complete the required fields.");
        return;
    }

    if (endDate && endDate < startDate) {
        alert("End date must be after the start date.");
        return;
    }

    if (
        frequency === "custom" &&
        selectedDays.length === 0
    ) {
        alert("Please select at least one day.");
        return;
    }


    // Create habit data.

    const habitData = {
        id: editingHabitId || createId(),
        name,
        category,
        frequency,

        days: frequency === "custom"
            ? selectedDays
            : [],

        startDate,
        endDate: endDate || null
    };


    // Preserve completion history when editing.

    const previousHabits = habits;

    if (editingHabitId) {

        habits = habits.map(habit => {

            if (habit.id !== editingHabitId) {
                return habit;
            }

            return {
                ...habit,
                ...habitData,

                completedDates:
                    habit.completedDates || {}
            };

        });

    } else {

        habits.push({
            ...habitData,
            completedDates: {}
        });

    }


    if (!saveStorage(STORAGE.habits, habits)) {

        habits = previousHabits;

        return;

    }


    editingHabitId = null;

    habitForm.reset();

    closeModal("calendar-habit-modal");

    renderAll();

});


/* Render habits for selected date */

function renderHabits() {

    if (!habitList) return;

    const date = parseDateKey(selectedDate);

    const dayHabits = habits.filter(
        habit => isHabitScheduled(habit, date)
    );

    habitList.innerHTML = "";

    if (!dayHabits.length) {

        habitList.innerHTML =
            '<p class="calendar-empty">No habits scheduled for this day.</p>';

        return;

    }


    dayHabits.forEach(habit => {

        if (
            !habit.completedDates ||
            typeof habit.completedDates !== "object"
        ) {
            habit.completedDates = {};
        }

        const completed =
            habit.completedDates[selectedDate] === true;


        const item = document.createElement("article");

        item.className =
            "calendar-task-item calendar-habit-item";

        item.style.setProperty(
            "--task-color",
            getMissionColor(habit.category)
        );


        // Habit heading.

        const heading = document.createElement("div");

        heading.className = "calendar-task-heading";


        const info = document.createElement("div");

        info.className = "calendar-task-info";


        const name = document.createElement("strong");

        name.className = "calendar-task-name";
        name.textContent = habit.name;


        const category = document.createElement("span");

        category.className = "calendar-task-category";
        category.textContent = habit.category;

        info.append(name, category);


        // Edit and Delete actions.

        const actions = document.createElement("div");

        actions.className = "calendar-habit-actions";


        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.className = "calendar-habit-action";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {

            openHabitModal(habit);

        });


        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className =
            "calendar-habit-action delete";

        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {

            const confirmed = confirm(
                `Delete habit "${habit.name}"?`
            );

            if (!confirmed) return;

            const previousHabits = habits;

            habits = habits.filter(
                current => current.id !== habit.id
            );

            if (!saveStorage(STORAGE.habits, habits)) {

                habits = previousHabits;

                return;

            }

            renderAll();

        });


        actions.append(editButton, deleteButton);

        heading.append(info, actions);


        // Completion checkbox.

        const label = document.createElement("label");

        label.className =
            "calendar-task-checkbox-label";


        const checkbox = document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.checked = completed;


        const text = document.createElement("span");

        text.textContent = completed
            ? "Done"
            : "Mark done";


        checkbox.addEventListener("change", () => {

            const previousValue =
                habit.completedDates[selectedDate];

            habit.completedDates[selectedDate] =
                checkbox.checked;

            if (!saveStorage(STORAGE.habits, habits)) {

                habit.completedDates[selectedDate] =
                    previousValue;

                checkbox.checked =
                    previousValue === true;

                return;

            }

            text.textContent = checkbox.checked
                ? "Done"
                : "Mark done";

            renderDailySummary();

            renderCalendar();

        });


        label.append(checkbox, text);


        item.append(heading, label);

        habitList.appendChild(item);

    });

}
    /* =========================================
       11. DAILY SUMMARY
    ========================================= */

    function renderDailySummary() {

        const summary = document.getElementById(
            "daily-summary-text"
        );

        if (!summary) return;

        const dayMissions = getMissionsForDate(selectedDate);

        const date = parseDateKey(selectedDate);

        const dayHabits = habits.filter(
            habit => isHabitScheduled(habit, date)
        );

        const completedMissions = dayMissions.filter(
            mission => Number(mission.progress) === 100
        ).length;

        const completedHabits = dayHabits.filter(
            habit =>
                habit.completedDates &&
                habit.completedDates[selectedDate] === true
        ).length;

        const dailyXp = window.FubanXP.getTotalForDate(selectedDate);

        if (
            !dayMissions.length &&
            !dayHabits.length &&
            dailyXp === 0
        ) {

            summary.textContent =
                "No activity recorded yet. Start with one small step. Total XP for this day: 0 XP.";

            return;
        }

        const parts = [];

        if (dayMissions.length) {

            parts.push(
                `You completed ${completedMissions} of ${dayMissions.length} missions.`
            );

        }

        if (dayHabits.length) {

            parts.push(
                `You completed ${completedHabits} of ${dayHabits.length} scheduled habits.`
            );

        }

        if (dailyXp !== null) {
            parts.push(`Total XP for this day: ${dailyXp} XP.`);
        } else {
            parts.push("XP total is unavailable.");
        }

        summary.textContent = parts.join(" ");

    }

    window.addEventListener("fuban:xp-change", renderDailySummary);
    window.addEventListener("storage", event => {
        if (event.key === "fuban_xp_ledger") {
            renderDailySummary();
        }
    });


    /* =========================================
       12. GOALS
    ========================================= */

    const goalForm = document.getElementById(
        "calendar-goal-form"
    );
    const getCalendarGoalAchievementSync =
        window.FubanAchievementSync?.setupForm({
            formId: "calendar-goal-form",
            toggleId: "calendar-goal-sync-achievement-enabled",
            panelId: "calendar-goal-sync-achievement-fields",
            selectId: "calendar-goal-sync-achievement",
            amountId: "calendar-goal-sync-achievement-progress"
        }) || (() => ({ valid: true, value: null }));

    const goalTypeInput = document.getElementById(
        "calendar-goal-type"
    );


    function openGoalModal(type = "monthly") {

        goalForm?.reset();

        if (goalTypeInput) {
            goalTypeInput.value = type;
        }

        openModal("calendar-goal-modal");
    }


    document.getElementById("add-goal-button")
        ?.addEventListener("click", () => {
            openGoalModal("monthly");
        });


    document.querySelectorAll("[data-goal-type]").forEach(button => {

        button.addEventListener("click", () => {

            openGoalModal(button.dataset.goalType);

        });

    });


    goalForm?.addEventListener("submit", event => {

        event.preventDefault();

        const name = document.getElementById(
            "calendar-goal-name"
        ).value.trim();

        const type = goalTypeInput.value;

        const description = document.getElementById(
            "calendar-goal-description"
        ).value.trim();

        const target = document.getElementById(
            "calendar-goal-target"
        ).value.trim();

        const deadline = document.getElementById(
            "calendar-goal-deadline"
        ).value;
        const achievementSync = getCalendarGoalAchievementSync();

        if (!name || !type || !achievementSync.valid) {
            alert(achievementSync.valid
                ? "Please enter a goal name."
                : "Select an achievement and a progress amount from 1 to 100.");
            return;
        }

        const goal = {
            id: createId(),
            name,
            type,
            description,
            target,
            deadline: deadline || null,
            progress: 0,
            periodKey: getGoalPeriodKey(type, selectedDate),
            ...(achievementSync.value
                ? { achievementSync: achievementSync.value }
                : {})
        };

        goals.push(goal);

        if (!saveStorage(STORAGE.goals, goals)) {
            goals.pop();
            return;
        }

        window.FubanAchievementSync?.updateAchievements();
        window.FubanSystemAchievements?.refresh();

        goalForm.reset();

        closeModal("calendar-goal-modal");

        renderGoals();

    });


    function renderGoals() {

        const date = parseDateKey(selectedDate);

        const yearKey = String(date.getFullYear());

        const monthKey = getGoalPeriodKey(
            "monthly",
            selectedDate
        );

        const weekKey = getGoalPeriodKey(
            "weekly",
            selectedDate
        );

        const yearLabel = document.getElementById(
            "yearly-goal-period"
        );

        const monthLabel = document.getElementById(
            "monthly-goal-period"
        );

        const weekLabel = document.getElementById(
            "weekly-goal-period"
        );

        if (yearLabel) {
            yearLabel.textContent = yearKey;
        }

        if (monthLabel) {
            monthLabel.textContent = date.toLocaleDateString(
                "en-US",
                { month: "long", year: "numeric" }
            );
        }

        if (weekLabel) {

            const start = getWeekStart(date);

            const end = addDays(start, 6);

            weekLabel.textContent =
                `${start.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                })} – ${end.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                })}`;

        }

        renderGoalGroup(
            "yearly-goal-list",
            "yearly",
            yearKey
        );

        renderGoalGroup(
            "monthly-goal-list",
            "monthly",
            monthKey
        );

        renderGoalGroup(
            "weekly-goal-list",
            "weekly",
            weekKey
        );

    }


    function renderGoalGroup(elementId, type, periodKey) {

        const container = document.getElementById(elementId);

        if (!container) return;

        const filteredGoals = goals.filter(
            goal =>
                goal.type === type &&
                goal.periodKey === periodKey
        );

        container.innerHTML = "";

        if (!filteredGoals.length) {

            const empty = document.createElement("p");

            empty.className = "calendar-empty";
            empty.textContent = `No ${type} goals yet.`;

            container.appendChild(empty);

            return;
        }

        filteredGoals.forEach(goal => {

            const progress = Math.max(
                0,
                Math.min(100, Number(goal.progress) || 0)
            );

            const item = document.createElement("div");

            item.className = "calendar-goal-item";


            // Goal heading

            const heading = document.createElement("div");

            heading.className = "calendar-goal-item-heading";

            const name = document.createElement("strong");

            name.textContent = goal.name;

            const remove = document.createElement("button");

            remove.type = "button";
            remove.className = "calendar-goal-delete";
            remove.textContent = "×";
            remove.setAttribute("aria-label", "Delete goal");

            remove.addEventListener("click", () => {

                if (!confirm(`Delete "${goal.name}"?`)) return;

                const previousGoals = goals;

                goals = goals.filter(
                    current => current.id !== goal.id
                );

                if (!saveStorage(STORAGE.goals, goals)) {
                    goals = previousGoals;
                    return;
                }

                window.FubanAchievementSync?.updateAchievements();
                window.FubanSystemAchievements?.refresh();
                renderGoals();

            });

            heading.append(name, remove);

            item.appendChild(heading);


            // Goal description

            if (goal.description) {

                const description = document.createElement("p");

                description.className = "calendar-goal-description";
                description.textContent = goal.description;

                item.appendChild(description);

            }

            if (goal.target) {

                const target = document.createElement("p");

                target.className = "calendar-goal-target";
                target.textContent = `Target: ${goal.target}`;

                item.appendChild(target);

            }

            if (goal.deadline) {

                const deadline = document.createElement("p");

                deadline.className = "calendar-goal-deadline";

                deadline.textContent =
                    `Deadline: ${goal.deadline}`;

                item.appendChild(deadline);

            }


            // Goal progress

            const progressRow = document.createElement("div");

            progressRow.className = "calendar-goal-progress-row";

            const progressLabel = document.createElement("span");

            progressLabel.textContent = "Progress";

            const progressValue = document.createElement("strong");

            progressValue.textContent = `${progress}%`;

            progressRow.append(progressLabel, progressValue);

            const track = document.createElement("div");

            track.className = "calendar-goal-progress-track";

            const fill = document.createElement("div");

            fill.className = "calendar-goal-progress-fill";

            fill.style.width = `${progress}%`;

            track.appendChild(fill);

            const range = document.createElement("input");

            range.type = "range";
            range.min = "0";
            range.max = "100";
            range.value = String(progress);

            range.className = "calendar-goal-range";

            range.setAttribute(
                "aria-label",
                `${goal.name} progress`
            );

            range.addEventListener("input", () => {

                const previousProgress = goal.progress;

                goal.progress = Number(range.value);

                fill.style.width = `${goal.progress}%`;

                progressValue.textContent =
                    `${goal.progress}%`;

                if (saveStorage(STORAGE.goals, goals)) {
                    window.FubanAchievementSync?.updateAchievements();
                } else {
                    goal.progress = previousProgress;
                    range.value = String(previousProgress);
                    fill.style.width = `${previousProgress}%`;
                    progressValue.textContent = `${previousProgress}%`;
                }

            });

            item.append(
                progressRow,
                track,
                range
            );

            container.appendChild(item);

        });

    }


    /* =========================================
       13. UPCOMING & OVERDUE
    ========================================= */

    function renderUpcomingAndOverdue() {

        const upcomingList = document.getElementById(
            "calendar-upcoming-list"
        );

        const overdueList = document.getElementById(
            "calendar-overdue-list"
        );

        const currentDate = getDateKey(new Date());

        const futureLimit = getDateKey(
            addDays(new Date(), 14)
        );

        const incomplete = missions.filter(
            mission => Number(mission.progress) < 100
        );

        const upcoming = incomplete
            .filter(mission =>
                mission.date >= currentDate &&
                mission.date <= futureLimit
            )
            .sort((a, b) => a.date.localeCompare(b.date));

        const overdue = incomplete
            .filter(mission => mission.date < currentDate)
            .sort((a, b) => a.date.localeCompare(b.date));


        function renderList(container, items, emptyText) {

            if (!container) return;

            container.innerHTML = "";

            if (!items.length) {

                const empty = document.createElement("p");

                empty.className = "calendar-empty";
                empty.textContent = emptyText;

                container.appendChild(empty);

                return;
            }

            items.slice(0, 8).forEach(mission => {

                const item = document.createElement("button");

                item.type = "button";
                item.className = "calendar-secondary-item";

                item.style.setProperty(
                    "--task-color",
                    getMissionColor(mission.category)
                );

                const name = document.createElement("strong");

                name.textContent = mission.name;

                const date = document.createElement("span");

                date.textContent = formatDate(
                    parseDateKey(mission.date),
                    {
                        weekday: "short",
                        month: "short",
                        day: "numeric"
                    }
                );

                const progress = document.createElement("span");

                progress.textContent =
                    `${Number(mission.progress) || 0}%`;

                item.append(name, date, progress);

                item.addEventListener("click", () => {

                    selectedDate = mission.date;

                    const selected = parseDateKey(selectedDate);

                    calendarDate = new Date(
                        selected.getFullYear(),
                        selected.getMonth(),
                        1
                    );

                    renderAll();

                });

                container.appendChild(item);

            });

        }

        renderList(
            upcomingList,
            upcoming,
            "No upcoming missions."
        );

        renderList(
            overdueList,
            overdue,
            "No overdue missions."
        );

    }


    /* =========================================
       14. JOURNAL PREVIEW
    ========================================= */

    function renderJournalPreview() {

        const preview = document.getElementById(
            "calendar-journal-preview"
        );

        if (!preview) return;

        preview.innerHTML = "";

        // Dashboard currently stores its latest journal
        // as a single text value, without a date index.
        // Show it only when today's date is selected.

        const journalText = localStorage.getItem(
            "fuban_latest_journal"
        );

        if (selectedDate !== todayKey || !journalText) {

            const empty = document.createElement("p");

            empty.className = "calendar-empty";

            empty.textContent =
                "No journal entry available for this day.";

            preview.appendChild(empty);

            return;
        }

        const content = document.createElement("p");

        content.className = "calendar-journal-text";
        content.textContent = journalText;

        preview.appendChild(content);

    }


    /* =========================================
       15. RENDER ALL
    ========================================= */

    function renderAll() {

        renderCalendar();

        renderDailyHeader();

        renderMissions();

        renderDailyMetrics();
        renderFocusMinutes();

        renderHabits();

        renderDailySummary();

        renderGoals();

        renderUpcomingAndOverdue();

        renderJournalPreview();

    }


    /* =========================================
       16. INITIALIZE
    ========================================= */

    // Initial date values in the modals.

    if (missionDateInput) {
        missionDateInput.value = selectedDate;
    }

    const habitStartInput = document.getElementById(
        "calendar-habit-start"
    );

    if (habitStartInput) {
        habitStartInput.value = selectedDate;
    }

    // First render.

    renderAll();

});
