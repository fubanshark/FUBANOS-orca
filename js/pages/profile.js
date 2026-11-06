document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const STORAGE_KEYS = {
        profile: "fuban_profile_settings",
        xp: "fuban_xp_ledger",
        missions: "fuban_dashboard_missions",
        focus: "fuban_focus_sessions",
        achievements: "fuban_milestone_achievements",
        journal: "fuban_journal_v5"
    };

    const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
    const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024;
    const MAX_SAVED_IMAGE_SIZE = 400 * 1024;
    const MAX_HEATMAP_DAYS = 364;

    const RANKS = [
        { name: "NOVICE", xp: 0, subtitle: "The First Spark" },
        { name: "EXPLORER", xp: 500, subtitle: "The Discovery" },
        { name: "NAVIGATOR", xp: 1500, subtitle: "Finding Direction" },
        { name: "PIONEER", xp: 3000, subtitle: "Beyond the Known" },
        { name: "VOYAGER", xp: 5500, subtitle: "The Long Journey" },
        { name: "ASTRAL", xp: 9000, subtitle: "Among the Stars" },
        { name: "CELESTIAL", xp: 15000, subtitle: "Beyond the Horizon" },
        { name: "STELLAR", xp: 25000, subtitle: "A Greater Universe" },
        { name: "TRANSCENDENT", xp: 40000, subtitle: "Beyond Limits" },
        { name: "INFINITE", xp: 100000, subtitle: "The Endless Frontier" }
    ];

    const $ = id => document.getElementById(id);
    const profileWallpaper = $("profile-wallpaper");
    const coverImage = $("profile-cover-image");
    const pictureImage = $("profile-picture-preview");
    const wallpaperSelect = $("profile-wallpaper-select");

    let profileSettings = readProfileSettings();

    function readProfileSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.profile);
            if (raw === null) return {};

            const value = JSON.parse(raw);
            if (!value || typeof value !== "object" || Array.isArray(value)) {
                throw new Error("Profile settings are not a valid object.");
            }

            return value;
        } catch (error) {
            console.error("Profile settings could not be read:", error);
            window.alert("Profile settings could not be read. Changes will not replace the saved data until you make a new selection.");
            return {};
        }
    }

    function saveProfileSettings(nextSettings) {
        try {
            localStorage.setItem(
                STORAGE_KEYS.profile,
                JSON.stringify(nextSettings)
            );
        } catch (error) {
            console.error("Profile settings could not be saved:", error);
            window.alert("Profile settings could not be saved. Check the available storage on this device.");
            return false;
        }

        profileSettings = nextSettings;
        return true;
    }

    function readJson(key, fallback, isValid) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return { ok: true, value: fallback };

            const value = JSON.parse(raw);
            if (!isValid(value)) {
                throw new Error(`Saved data at ${key} has an unexpected format.`);
            }

            return { ok: true, value };
        } catch (error) {
            console.error(`Profile could not read ${key}:`, error);
            return { ok: false, value: null };
        }
    }

    function readArray(key) {
        return readJson(key, [], Array.isArray);
    }

    function readJournal() {
        return readJson(
            STORAGE_KEYS.journal,
            { spreads: [] },
            value => value &&
                typeof value === "object" &&
                Array.isArray(value.spreads)
        );
    }

    function setUnavailable(element, unavailable) {
        if (element) element.textContent = unavailable ? "Unavailable" : "—";
    }

    function formatNumber(value) {
        return Math.max(0, Math.floor(value)).toLocaleString();
    }

    function getDateKey(value) {
        const date = value instanceof Date ? value : new Date(value);
        if (!Number.isFinite(date.getTime())) return null;

        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");
    }

    function parseDateKey(value) {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return null;
        }

        const date = new Date(`${value}T12:00:00`);
        return Number.isFinite(date.getTime()) &&
            getDateKey(date) === value
            ? date
            : null;
    }

    function formatDate(value) {
        const date = value instanceof Date
            ? value
            : parseDateKey(value) || new Date(value);

        if (!Number.isFinite(date.getTime())) return "Date unavailable";

        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function getSafeImageSource(source) {
        if (typeof source !== "string") return null;
        if (/^data:image\/(?:png|jpeg|webp);base64,/i.test(source)) {
            return source;
        }

        if (wallpaperSelect && [...wallpaperSelect.options].some(option =>
            option.value === source
        )) {
            return source;
        }

        return null;
    }

    function setImageSource(image, source) {
        if (!image) return;
        const safeSource = getSafeImageSource(source);
        if (!safeSource) return;

        image.hidden = false;
        image.src = safeSource;
    }

    function getImageCrop(type) {
        const crop = profileSettings[`${type}Crop`] || {};
        const zoom = Number(crop.zoom);
        const x = Number(crop.x);
        const y = Number(crop.y);

        return {
            zoom: Number.isFinite(zoom) ? Math.max(100, Math.min(250, zoom)) : 100,
            x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
            y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50
        };
    }

    function applyImageCrop(type) {
        const image = type === "picture" ? pictureImage : coverImage;
        if (!image) return;

        const crop = getImageCrop(type);
        image.style.objectPosition = `${crop.x}% ${crop.y}%`;
        image.style.transform = `scale(${crop.zoom / 100})`;

        document.querySelectorAll(`[data-image-control="${type}"]`)
            .forEach(control => {
                const value = crop[control.dataset.property];
                control.value = String(value);
                const output = $(
                    `${type}-${control.dataset.property}`
                );
                if (output) output.value = `${value}%`;
            });
    }

    function setImageCrop(type, crop) {
        const nextSettings = {
            ...profileSettings,
            [`${type}Crop`]: {
                zoom: Math.max(100, Math.min(250, Number(crop.zoom) || 100)),
                x: Math.max(0, Math.min(100, Number(crop.x) || 0)),
                y: Math.max(0, Math.min(100, Number(crop.y) || 0))
            }
        };

        if (saveProfileSettings(nextSettings)) applyImageCrop(type);
    }

    function setWallpaper(source) {
        if (!profileWallpaper) return;
        const safeSource = getSafeImageSource(source);
        if (!safeSource) return;

        profileWallpaper.style.backgroundImage = `url("${safeSource}")`;
    }

    function addCustomWallpaperOption() {
        if (
            !wallpaperSelect ||
            !getSafeImageSource(profileSettings.wallpaperImage)
        ) {
            return;
        }

        let option = [...wallpaperSelect.options].find(item =>
            item.value === "__custom_upload__"
        );
        if (!option) {
            option = document.createElement("option");
            option.value = "__custom_upload__";
            option.textContent = "Custom upload";
            wallpaperSelect.appendChild(option);
        }
    }

    function initializePersonalization() {
        const savedWallpaper = profileSettings.wallpaper;
        const hasCustomWallpaper = Boolean(
            getSafeImageSource(profileSettings.wallpaperImage)
        );
        const selectedWallpaper = savedWallpaper === "__custom_upload__" &&
                hasCustomWallpaper
            ? "__custom_upload__"
            : savedWallpaper;
        const hasSavedWallpaper = wallpaperSelect && [...wallpaperSelect.options]
            .some(option => option.value === selectedWallpaper);

        if (hasCustomWallpaper) addCustomWallpaperOption();

        if (wallpaperSelect && hasSavedWallpaper) {
            wallpaperSelect.value = selectedWallpaper;
        }

        const wallpaper = selectedWallpaper === "__custom_upload__"
            ? profileSettings.wallpaperImage
            : wallpaperSelect?.value ||
                wallpaperSelect?.options[0]?.value;
        setWallpaper(wallpaper);

        if (selectedWallpaper === "__custom_upload__") {
            addCustomWallpaperOption();
            wallpaperSelect.value = "__custom_upload__";
        }

        setImageSource(coverImage, profileSettings.coverImage);
        setImageSource(pictureImage, profileSettings.pictureImage);
        applyImageCrop("cover");
        applyImageCrop("picture");
        renderProfileIdentity();
    }

    function getProfileValue(name) {
        return typeof profileSettings[name] === "string"
            ? profileSettings[name].trim()
            : "";
    }

    function renderProfileIdentity() {
        const displayName = getProfileValue("displayName") || "FuBan";
        const username = getProfileValue("username").replace(/^@+/, "");
        const bio = getProfileValue("bio");
        const displayNameElement = $("profile-display-name");
        const usernameElement = $("profile-username");
        const bioElement = $("profile-bio");

        if (displayNameElement) displayNameElement.textContent = displayName;
        if (usernameElement) {
            usernameElement.textContent = username ? `@${username}` : "";
            usernameElement.hidden = !username;
        }
        if (bioElement) {
            bioElement.textContent = bio || "A little introduction about yourself.";
            bioElement.hidden = !bio;
        }

        const detailValues = {
            birthday: profileSettings.birthday &&
                parseDateKey(profileSettings.birthday)
                ? formatDate(profileSettings.birthday)
                : "",
            location: getProfileValue("location"),
            pronouns: getProfileValue("pronouns"),
            interests: getProfileValue("interests")
        };
        const website = getProfileValue("website");
        if (website) {
            try {
                const parsed = new URL(website);
                if (parsed.protocol === "https:" || parsed.protocol === "http:") {
                    detailValues.website = parsed.href;
                }
            } catch {
                detailValues.website = "";
            }
        } else {
            detailValues.website = "";
        }

        Object.entries(detailValues).forEach(([key, value]) => {
            const row = document.querySelector(`[data-profile-detail="${key}"]`);
            const content = $(`profile-${key}`);
            if (!row || !content) return;
            row.hidden = !value;
            content.replaceChildren();

            if (key === "website" && value) {
                const link = document.createElement("a");
                link.href = value;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = new URL(value).hostname;
                content.appendChild(link);
            } else {
                content.textContent = value;
            }
        });

        const joinDate = $("profile-join-date");
        if (joinDate) {
            joinDate.textContent = profileSettings.joinedAt
                ? `Member since ${formatDate(profileSettings.joinedAt)}`
                : "Member since —";
        }

        const toggle = $("profile-details-toggle");
        const extras = $("profile-extra-info");
        const hasDetails = Object.values(detailValues).some(Boolean);
        if (toggle && extras) {
            toggle.hidden = !hasDetails;
            if (!hasDetails) {
                extras.hidden = true;
                toggle.setAttribute("aria-expanded", "false");
                toggle.textContent = "Show more";
            }
        }
    }

    function populateProfileForm() {
        const form = $("profile-edit-form");
        if (!form) return;

        const values = {
            displayName: getProfileValue("displayName") || "FuBan",
            username: getProfileValue("username").replace(/^@+/, ""),
            bio: getProfileValue("bio"),
            birthday: parseDateKey(profileSettings.birthday)
                ? profileSettings.birthday
                : "",
            location: getProfileValue("location"),
            pronouns: getProfileValue("pronouns"),
            interests: getProfileValue("interests"),
            website: getProfileValue("website")
        };

        Object.entries(values).forEach(([name, value]) => {
            const input = form.elements.namedItem(name);
            if (input) input.value = value;
        });
    }

    function setupProfileEditor() {
        const form = $("profile-edit-form");
        const toggle = $("profile-edit-toggle");
        const cancel = $("profile-edit-cancel");
        const detailsToggle = $("profile-details-toggle");
        const extras = $("profile-extra-info");
        const extraFields = document.querySelector(".profile-edit-more");
        if (!form || !toggle) return;

        const birthdayInput = form.elements.namedItem("birthday");
        if (birthdayInput) birthdayInput.max = getDateKey(new Date());

        function closeForm() {
            form.hidden = true;
            toggle.setAttribute("aria-expanded", "false");
            toggle.textContent = "Edit Profile";
            populateProfileForm();
        }

        toggle.addEventListener("click", () => {
            const isOpening = form.hidden;
            form.hidden = !isOpening;
            toggle.setAttribute("aria-expanded", String(isOpening));
            toggle.textContent = isOpening ? "Close Editor" : "Edit Profile";
            if (isOpening) {
                populateProfileForm();
                form.querySelector('[name="displayName"]')?.focus();
            }
        });

        cancel?.addEventListener("click", closeForm);

        form.addEventListener("submit", event => {
            event.preventDefault();
            if (!form.reportValidity()) return;

            const formData = new FormData(form);
            const websiteValue = String(formData.get("website") || "").trim();
            if (websiteValue) {
                try {
                    const websiteUrl = new URL(websiteValue);
                    if (
                        websiteUrl.protocol !== "https:" &&
                        websiteUrl.protocol !== "http:"
                    ) {
                        throw new Error("Use an http or https website address.");
                    }
                } catch (error) {
                    window.alert(error instanceof TypeError
                        ? "Enter a valid website address."
                        : error.message);
                    form.elements.namedItem("website")?.focus();
                    return;
                }
            }

            const nextSettings = { ...profileSettings };
            [
                "displayName",
                "username",
                "bio",
                "birthday",
                "location",
                "pronouns",
                "interests",
                "website"
            ].forEach(name => {
                nextSettings[name] = String(formData.get(name) || "").trim();
            });
            nextSettings.username = nextSettings.username.replace(/^@+/, "");
            if (!nextSettings.joinedAt) {
                nextSettings.joinedAt = getDateKey(new Date());
            }

            if (!saveProfileSettings(nextSettings)) return;
            renderProfileIdentity();
            closeForm();
        });

        detailsToggle?.addEventListener("click", () => {
            if (!extras || detailsToggle.hidden) return;
            const expanded = extras.hidden;
            extras.hidden = !expanded;
            detailsToggle.setAttribute("aria-expanded", String(expanded));
            detailsToggle.textContent = expanded ? "Show less" : "Show more";
        });

        extraFields?.addEventListener("toggle", () => {
            const summary = extraFields.querySelector("summary");
            if (summary) {
                summary.textContent = extraFields.open
                    ? "Show less fields"
                    : "Show more fields";
            }
        });
    }

    function setupImageControls() {
        document.querySelectorAll("[data-image-control]").forEach(control => {
            const type = control.dataset.imageControl;
            const property = control.dataset.property;
            control.addEventListener("input", () => {
                const crop = getImageCrop(type);
                crop[property] = Number(control.value);
                const image = type === "picture" ? pictureImage : coverImage;
                if (image) {
                    image.style.objectPosition = `${crop.x}% ${crop.y}%`;
                    image.style.transform = `scale(${crop.zoom / 100})`;
                }
                const output = $(`${type}-${property}`);
                if (output) output.value = `${control.value}%`;
            });
            control.addEventListener("change", () => {
                const crop = getImageCrop(type);
                crop[property] = Number(control.value);
                setImageCrop(type, crop);
            });
        });

        document.querySelectorAll("[data-reset-image]").forEach(button => {
            button.addEventListener("click", () => {
                setImageCrop(button.dataset.resetImage, {
                    zoom: 100,
                    x: 50,
                    y: 50
                });
            });
        });
    }

    function getRankIndex(xp) {
        let index = 0;
        RANKS.forEach((rank, rankIndex) => {
            if (xp >= rank.xp) index = rankIndex;
        });
        return index;
    }

    function renderRank(xp) {
        const rankIndex = getRankIndex(xp);
        const rank = RANKS[rankIndex];
        const nextRank = RANKS[rankIndex + 1];
        const currentTotal = $("profile-total-xp");
        const progress = $("profile-xp-progress");
        const currentLabel = $("profile-xp-current-label");
        const nextLabel = $("profile-xp-next-label");

        if (currentTotal) currentTotal.textContent = formatNumber(xp);
        if ($("profile-rank-name")) $("profile-rank-name").textContent = rank.name;
        if ($("profile-identity-rank")) {
            $("profile-identity-rank").textContent = rank.name;
        }

        const rankNumber = document.querySelector(".rank-number");
        const rankSubtitle = document.querySelector(".rank-subtitle");
        const rankStatus = document.querySelector(".rank-status");
        const emblem = document.querySelector(".rank-emblem span");

        if (rankNumber) {
            rankNumber.textContent =
                `RANK ${String(rankIndex + 1).padStart(2, "0")} / ${RANKS.length}`;
        }
        if (rankSubtitle) rankSubtitle.textContent = rank.subtitle;
        if (rankStatus) {
            rankStatus.textContent = nextRank
                ? `${formatNumber(nextRank.xp - xp)} XP TO NEXT RANK`
                : "MAX RANK REACHED";
        }
        if (emblem) emblem.textContent = String.fromCharCode(8544 + rankIndex);

        if (nextRank) {
            const range = nextRank.xp - rank.xp;
            const progressPercent = range > 0
                ? ((xp - rank.xp) / range) * 100
                : 100;
            if (progress) progress.style.width = `${Math.max(0, Math.min(100, progressPercent))}%`;
            if (currentLabel) currentLabel.textContent = `${formatNumber(xp)} XP`;
            if (nextLabel) {
                nextLabel.textContent =
                    `${formatNumber(nextRank.xp - xp)} XP to next rank`;
            }
            if ($("profile-next-rank")) {
                $("profile-next-rank").textContent = nextRank.name;
            }
        } else {
            if (progress) progress.style.width = "100%";
            if (currentLabel) currentLabel.textContent = `${formatNumber(xp)} XP`;
            if (nextLabel) nextLabel.textContent = "Maximum rank reached";
            if ($("profile-next-rank")) {
                $("profile-next-rank").textContent = "MAX RANK";
            }
        }

        document.querySelectorAll(".rank-ladder-item").forEach((item, index) => {
            const isCurrent = index === rankIndex;
            item.classList.toggle("current", isCurrent);
            item.classList.toggle("completed", index < rankIndex);
            let state = item.querySelector(".ladder-state");

            if (index <= rankIndex && !state) {
                state = document.createElement("span");
                state.className = "ladder-state";
                item.appendChild(state);
            }

            if (state) {
                state.textContent = isCurrent
                    ? "CURRENT"
                    : index < rankIndex
                        ? "COMPLETE"
                        : "";
                state.hidden = index > rankIndex;
            }
        });
    }

    function getJournalEntries(journal) {
        const entries = [];

        journal.spreads.forEach(spread => {
            if (!spread || !Array.isArray(spread.pages)) return;

            spread.pages.forEach(page => {
                if (!page || typeof page !== "object") return;
                const hasContent = Boolean(
                    (typeof page.content === "string" && page.content.trim()) ||
                    (typeof page.title === "string" && page.title.trim()) ||
                    (Array.isArray(page.images) && page.images.length) ||
                    (Array.isArray(page.stickers) && page.stickers.length)
                );

                if (hasContent) entries.push(page);
            });
        });

        return entries;
    }

    function renderStatistics(data) {
        const missionStat = $("profile-stat-missions");
        const focusStat = $("profile-stat-focus");
        const achievementStat = $("profile-stat-achievements");
        const journalStat = $("profile-stat-journal");

        const completedMissions = data.missions.ok
            ? data.missions.value.filter(mission =>
                mission && Number(mission.progress) >= 100
            ).length
            : null;
        if (missionStat) {
            missionStat.textContent = completedMissions === null
                ? "Unavailable"
                : formatNumber(completedMissions);
        }

        if (!data.focus.ok) {
            setUnavailable(focusStat, true);
        } else {
            const totalMinutes = data.focus.value.reduce((total, session) => {
                if (
                    !session ||
                    !Number.isFinite(session.startedAt) ||
                    !Number.isFinite(session.endedAt) ||
                    session.endedAt <= session.startedAt
                ) {
                    return total;
                }

                return total + Math.floor(
                    (session.endedAt - session.startedAt) / 60000
                );
            }, 0);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            if (focusStat) {
                focusStat.textContent = hours
                    ? `${hours}h ${minutes}m`
                    : `${minutes}m`;
            }
        }

        if (achievementStat) {
            achievementStat.textContent = data.achievements.ok
                ? formatNumber(data.achievements.value.filter(item =>
                    item && item.status === "achieved"
                ).length)
                : "Unavailable";
        }

        if (journalStat) {
            journalStat.textContent = data.journal.ok
                ? formatNumber(getJournalEntries(data.journal.value).length)
                : "Unavailable";
        }
    }

    function addActivityEvent(events, label, dateValue, type) {
        const date = parseDateKey(dateValue) ||
            (dateValue ? new Date(dateValue) : null);
        if (!date || !Number.isFinite(date.getTime())) return;

        events.push({
            label,
            date,
            type
        });
    }

    function collectActivity(data) {
        const events = [];
        const countsByDate = new Map();
        const addCount = value => {
            const key = getDateKey(value);
            if (key) countsByDate.set(key, (countsByDate.get(key) || 0) + 1);
        };

        if (data.missions.ok) {
            data.missions.value.forEach(mission => {
                if (!mission || Number(mission.progress) < 100) return;
                addActivityEvent(
                    events,
                    mission.name || "Mission completed",
                    mission.date,
                    "Mission"
                );
                addCount(mission.date);
            });
        }

        if (data.focus.ok) {
            data.focus.value.forEach(session => {
                if (
                    !session ||
                    !Number.isFinite(session.startedAt) ||
                    !Number.isFinite(session.endedAt) ||
                    session.endedAt <= session.startedAt
                ) {
                    return;
                }

                const duration = Math.floor(
                    (session.endedAt - session.startedAt) / 60000
                );
                addActivityEvent(
                    events,
                    `Focus session · ${duration} min`,
                    session.endedAt,
                    "Focus"
                );
                addCount(session.endedAt);
            });
        }

        if (data.journal.ok) {
            getJournalEntries(data.journal.value).forEach(page => {
                if (!parseDateKey(page.date)) return;
                addActivityEvent(
                    events,
                    page.title || "Journal entry",
                    page.date,
                    "Journal"
                );
                addCount(page.date);
            });
        }

        if (data.achievements.ok) {
            data.achievements.value.forEach(item => {
                if (!item || item.status !== "achieved") return;
                addActivityEvent(
                    events,
                    item.name || "Achievement unlocked",
                    item.achievedDate,
                    "Achievement"
                );
                addCount(item.achievedDate);
            });
        }

        if (data.xp.ok) {
            data.xp.value.forEach(entry => {
                if (!entry || !entry.awardedAt || Number(entry.xp) <= 0) return;
                addCount(entry.awardedAt);
            });
        }

        events.sort((left, right) => right.date - left.date);
        return { events, countsByDate };
    }

    function renderHeatmap(countsByDate) {
        const container = $("profile-activity-heatmap");
        if (!container) return;
        container.replaceChildren();

        const today = new Date();
        today.setHours(12, 0, 0, 0);
        const activeDays = [...countsByDate.entries()]
            .filter(([dateKey, count]) => {
                const date = parseDateKey(dateKey);
                const daysAgo = date ? (today - date) / 86400000 : -1;
                return count > 0 &&
                    daysAgo >= 0 &&
                    daysAgo < MAX_HEATMAP_DAYS;
            }).length;

        const summary = document.createElement("p");
        summary.className = "heatmap-summary";
        summary.textContent =
            `${activeDays} active days in the last 12 months`;
        container.appendChild(summary);

        const scroll = document.createElement("div");
        scroll.className = "heatmap-scroll";
        scroll.setAttribute("role", "group");
        scroll.setAttribute("aria-label", "Daily activity for the past 52 weeks");

        const grid = document.createElement("div");
        grid.className = "heatmap-grid";
        const firstDate = new Date(today);
        firstDate.setDate(firstDate.getDate() - MAX_HEATMAP_DAYS + 1);

        for (let offset = 0; offset < MAX_HEATMAP_DAYS; offset += 1) {
            const date = new Date(firstDate);
            date.setDate(firstDate.getDate() + offset);
            const dateKey = getDateKey(date);
            const count = countsByDate.get(dateKey) || 0;
            const level = count === 0 ? 0 : Math.min(4, count);
            const cell = document.createElement("span");

            cell.className = `heatmap-cell level-${level}`;
            cell.title = `${formatDate(date)} · ${count} activities`;
            cell.setAttribute(
                "aria-label",
                `${formatDate(date)}: ${count} activities`
            );
            grid.appendChild(cell);
        }

        scroll.appendChild(grid);
        container.appendChild(scroll);

        const legend = document.createElement("div");
        legend.className = "heatmap-legend";
        legend.innerHTML =
            '<span>Less</span><i class="level-0"></i><i class="level-1"></i>' +
            '<i class="level-2"></i><i class="level-3"></i><i class="level-4"></i>' +
            '<span>More</span>';
        container.appendChild(legend);
    }

    function createAchievementCard(achievement) {
        const card = document.createElement("article");
        card.className = "profile-achievement-card";

        const mark = document.createElement("span");
        mark.className = "profile-achievement-mark";
        if (achievement.logoType === "image" && getSafeImageSource(achievement.image)) {
            const image = document.createElement("img");
            image.src = achievement.image;
            image.alt = "";
            mark.appendChild(image);
        } else {
            mark.textContent = achievement.emoji || "✧";
        }

        const details = document.createElement("span");
        details.className = "profile-achievement-details";
        const name = document.createElement("strong");
        name.textContent = achievement.name || "Achievement";
        const date = document.createElement("small");
        date.textContent = achievement.achievedDate
            ? `Unlocked ${formatDate(achievement.achievedDate)}`
            : "Unlocked";
        details.append(name, date);
        card.append(mark, details);

        if (achievement.description) {
            card.title = achievement.description;
        }

        return card;
    }

    function renderAchievements(achievements) {
        const container = $("profile-achievement-showcase");
        if (!container) return;
        container.replaceChildren();

        const unlocked = achievements
            .filter(item => item && item.status === "achieved")
            .sort((left, right) => {
                const leftDate = new Date(left.achievedDate || 0).getTime();
                const rightDate = new Date(right.achievedDate || 0).getTime();
                return rightDate - leftDate;
            })
            .slice(0, 3);

        if (!unlocked.length) {
            const message = document.createElement("p");
            message.textContent = "Your completed achievements will appear here.";
            container.appendChild(message);
            return;
        }

        unlocked.forEach(item => container.appendChild(createAchievementCard(item)));
    }

    function renderActivityHistory(events) {
        const container = $("profile-activity-history");
        if (!container) return;
        container.replaceChildren();

        if (!events.length) {
            const message = document.createElement("p");
            message.textContent = "Your recent activity will appear here.";
            container.appendChild(message);
            return;
        }

        const list = document.createElement("div");
        list.className = "profile-activity-list";

        events.slice(0, 8).forEach(event => {
            const row = document.createElement("article");
            row.className = "profile-activity-item";

            const type = document.createElement("span");
            type.className = "profile-activity-type";
            type.textContent = event.type;

            const details = document.createElement("span");
            details.className = "profile-activity-details";
            const label = document.createElement("strong");
            label.textContent = event.label;
            const date = document.createElement("small");
            date.textContent = formatDate(event.date);
            details.append(label, date);

            row.append(type, details);
            list.appendChild(row);
        });

        container.appendChild(list);
    }

    function renderData() {
        const data = {
            missions: readArray(STORAGE_KEYS.missions),
            focus: readArray(STORAGE_KEYS.focus),
            achievements: readArray(STORAGE_KEYS.achievements),
            journal: readJournal(),
            xp: readArray(STORAGE_KEYS.xp)
        };

        renderStatistics(data);

        const xpTotal = window.FubanXP?.getTotal();
        if (Number.isFinite(xpTotal)) {
            renderRank(Math.max(0, xpTotal));
        } else {
            setUnavailable($("profile-total-xp"), true);
            setUnavailable($("profile-rank-name"), true);
            setUnavailable($("profile-identity-rank"), true);
            setUnavailable($("profile-next-rank"), true);
            setUnavailable($("profile-xp-current-label"), true);
            setUnavailable($("profile-xp-next-label"), true);
        }

        if (data.achievements.ok) {
            renderAchievements(data.achievements.value);
        } else if ($("profile-achievement-showcase")) {
            $("profile-achievement-showcase").textContent =
                "Achievements could not be loaded.";
        }

        const activity = collectActivity(data);
        renderHeatmap(activity.countsByDate);
        renderActivityHistory(activity.events);
    }

    function showImageError(error) {
        console.error("Profile image could not be saved:", error);
        window.alert(error instanceof Error
            ? error.message
            : "The selected image could not be saved.");
    }

    function prepareImage(file, maxDimension) {
        return new Promise((resolve, reject) => {
            if (!file || !IMAGE_TYPES.has(file.type)) {
                reject(new Error("Choose a PNG, JPEG, or WebP image."));
                return;
            }
            if (file.size > MAX_IMAGE_FILE_SIZE) {
                reject(new Error("Choose an image smaller than 15 MB."));
                return;
            }

            const objectUrl = URL.createObjectURL(file);
            const image = new Image();

            image.onload = () => {
                URL.revokeObjectURL(objectUrl);
                if (
                    !image.naturalWidth ||
                    !image.naturalHeight ||
                    image.naturalWidth * image.naturalHeight > 40000000
                ) {
                    reject(new Error("This image has unsupported dimensions."));
                    return;
                }

                const scale = Math.min(
                    1,
                    maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
                );
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const context = canvas.getContext("2d");
                if (!context) {
                    reject(new Error("This browser could not process the image."));
                    return;
                }

                let result = "";
                const qualities = [0.82, 0.74, 0.66, 0.58];

                for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);

                    for (const quality of qualities) {
                        try {
                            result = canvas.toDataURL("image/webp", quality);
                            if (!result.startsWith("data:image/webp")) {
                                result = canvas.toDataURL("image/jpeg", quality);
                            }
                        } catch (error) {
                            reject(error);
                            return;
                        }

                        if (result.length * 0.75 <= MAX_SAVED_IMAGE_SIZE) {
                            resolve(result);
                            return;
                        }
                    }

                    canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
                    canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
                }

                if (!result || result.length * 0.75 > MAX_SAVED_IMAGE_SIZE) {
                    reject(new Error("The selected image is too large to store on this device."));
                }
            };

            image.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error("The selected image could not be opened."));
            };
            image.src = objectUrl;
        });
    }

    function setupImageUpload(inputId, settingName, image, maxDimension) {
        const input = $(inputId);
        if (!input) return;

        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file) return;

            try {
                const imageData = await prepareImage(file, maxDimension);
                const nextSettings = {
                    ...profileSettings,
                    [settingName]: imageData
                };
                if (settingName === "wallpaperImage") {
                    nextSettings.wallpaper = "__custom_upload__";
                }
                if (!saveProfileSettings(nextSettings)) return;
                setImageSource(image, imageData);

                if (settingName === "wallpaperImage") {
                    addCustomWallpaperOption();
                    wallpaperSelect.value = "__custom_upload__";
                    setWallpaper(imageData);
                }
            } catch (error) {
                showImageError(error);
            } finally {
                input.value = "";
            }
        });
    }

    function setupWallpaperSelect() {
        if (!wallpaperSelect) return;

        wallpaperSelect.addEventListener("change", () => {
            const selectedValue = wallpaperSelect.value;
            const wallpaper = selectedValue === "__custom_upload__"
                ? profileSettings.wallpaperImage
                : selectedValue;
            if (!getSafeImageSource(wallpaper)) return;

            const nextSettings = {
                ...profileSettings,
                wallpaper: selectedValue
            };
            if (selectedValue !== "__custom_upload__") {
                delete nextSettings.wallpaperImage;
            }

            if (!saveProfileSettings(nextSettings)) return;
            setWallpaper(wallpaper);
        });
    }

    function setupImageFallbacks() {
        [pictureImage, coverImage].forEach(image => {
            if (!image) return;
            image.addEventListener("error", () => {
                image.hidden = true;
            });
        });
    }

    function setupDataRefresh() {
        window.addEventListener("fuban:xp-change", renderData);
        window.addEventListener("storage", event => {
            if (Object.values(STORAGE_KEYS).includes(event.key)) {
                renderData();
                if (event.key === STORAGE_KEYS.profile) {
                    profileSettings = readProfileSettings();
                    initializePersonalization();
                }
            }
        });
    }

    setupImageFallbacks();
    initializePersonalization();
    setupProfileEditor();
    setupImageControls();
    setupImageUpload("profile-picture-upload", "pictureImage", pictureImage, 512);
    setupImageUpload("cover-upload", "coverImage", coverImage, 1920);
    setupImageUpload("profile-wallpaper-upload", "wallpaperImage", null, 1920);
    setupWallpaperSelect();
    renderData();
    setupDataRefresh();
});
