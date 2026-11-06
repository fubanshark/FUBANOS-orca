(() => {
    const ACHIEVEMENTS_KEY = "fuban_milestone_achievements";
    const MISSIONS_KEY = "fuban_dashboard_missions";
    const GOALS_KEY = "fuban_calendar_goals";
    const BASE_PROGRESS_KEY = "_achievementSyncBaseProgress";

    function readArray(key) {
        const stored = localStorage.getItem(key);
        if (stored === null) return [];

        try {
            const value = JSON.parse(stored);
            if (Array.isArray(value)) return value;
        } catch (error) {
            console.error(`Cannot read ${key}:`, error);
            return null;
        }

        console.error(`Invalid list stored at ${key}.`);
        return null;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function contributionFor(source, kind) {
        const sync = source.achievementSync;
        if (!sync || !sync.achievementId) return 0;

        const amount = Number(sync.amount);
        if (!Number.isFinite(amount) || amount <= 0) return 0;

        const progress = clamp(Number(source.progress) || 0, 0, 100);

        if (kind === "mission") {
            return progress >= 100 ? amount : 0;
        }

        return amount * progress / 100;
    }

    function getSources() {
        const missions = readArray(MISSIONS_KEY);
        const goals = readArray(GOALS_KEY);
        if (!missions || !goals) return null;

        return [
            ...missions.map(source => ({ source, kind: "mission" })),
            ...goals.map(source => ({ source, kind: "goal" }))
        ];
    }

    function getAvailableAchievements() {
        return readArray(ACHIEVEMENTS_KEY)
            ?.filter(item => item && item.id && item.name && !item.isSystem) || [];
    }

    function populateSelect(select, selectedId = select.value) {
        const achievements = getAvailableAchievements();
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = achievements.length
            ? "Select an achievement"
            : "No custom achievements available";

        select.replaceChildren(placeholder);

        achievements.forEach(achievement => {
            const option = document.createElement("option");
            option.value = achievement.id;
            option.textContent = achievement.name;
            option.selected = achievement.id === selectedId;
            select.appendChild(option);
        });

        return achievements.length;
    }

    function setupForm({ formId, toggleId, panelId, selectId, amountId }) {
        const form = document.getElementById(formId);
        const toggle = document.getElementById(toggleId);
        const panel = document.getElementById(panelId);
        const select = document.getElementById(selectId);
        const amount = document.getElementById(amountId);

        if (!form || !toggle || !panel || !select || !amount) {
            return () => ({ valid: true, value: null });
        }

        function updateFields() {
            const hasOptions = populateSelect(select);
            panel.hidden = !toggle.checked;
            select.disabled = !toggle.checked || hasOptions === 0;
            amount.disabled = !toggle.checked;
        }

        toggle.addEventListener("change", updateFields);
        form.addEventListener("reset", () => {
            window.setTimeout(updateFields, 0);
        });
        window.addEventListener("storage", event => {
            if (event.key === ACHIEVEMENTS_KEY) updateFields();
        });
        updateFields();

        return () => {
            if (!toggle.checked) return { valid: true, value: null };

            const progress = amount.valueAsNumber;
            if (
                !select.value ||
                !Number.isInteger(progress) ||
                progress < 1 ||
                progress > 100
            ) {
                return { valid: false, value: null };
            }

            return {
                valid: true,
                value: {
                    achievementId: select.value,
                    amount: progress
                }
            };
        };
    }

    function updateAchievements() {
        const achievements = readArray(ACHIEVEMENTS_KEY);
        const sources = getSources();
        if (!achievements || !sources) return false;

        const linkedIds = new Set(
            sources
                .filter(({ source }) => source.achievementSync?.achievementId)
                .map(({ source }) => source.achievementSync.achievementId)
        );
        const totals = new Map();

        sources.forEach(({ source, kind }) => {
            const achievementId = source.achievementSync?.achievementId;
            if (!achievementId) return;

            totals.set(
                achievementId,
                (totals.get(achievementId) || 0) + contributionFor(source, kind)
            );
        });

        let changed = false;

        achievements.forEach(achievement => {
            if (!achievement || achievement.isSystem) {
                return;
            }

            const hasLinkedSources = linkedIds.has(achievement.id);
            const hasStoredBase = Number.isFinite(
                Number(achievement[BASE_PROGRESS_KEY])
            );
            if (!hasLinkedSources && !hasStoredBase) return;

            const base = hasStoredBase
                ? Number(achievement[BASE_PROGRESS_KEY])
                : clamp(Number(achievement.progress) || 0, 0, 100);
            const progress = Math.round(
                clamp(base + (totals.get(achievement.id) || 0), 0, 100) * 100
            ) / 100;

            if (hasLinkedSources && achievement[BASE_PROGRESS_KEY] !== base) {
                achievement[BASE_PROGRESS_KEY] = base;
                changed = true;
            } else if (!hasLinkedSources && hasStoredBase) {
                delete achievement[BASE_PROGRESS_KEY];
                changed = true;
            }

            if (achievement.progress !== progress) {
                achievement.progress = progress;
                changed = true;
            }

            if (achievement.status !== "archive") {
                if (progress >= 100 && achievement.status !== "achieved") {
                    achievement.status = "achieved";
                    achievement.achievedDate = new Date().toISOString().slice(0, 10);
                    changed = true;
                } else if (progress < 100 && achievement.status === "achieved") {
                    achievement.status = "incomplete";
                    achievement.achievedDate = null;
                    changed = true;
                }
            }
        });

        if (!changed) return true;

        try {
            localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
            return true;
        } catch (error) {
            console.error("Cannot sync achievement progress:", error);
            alert("Could not update the linked achievement. Please check device storage.");
            return false;
        }
    }

    function setBaseProgress(achievement, targetProgress) {
        const sources = getSources();
        if (!sources) return false;

        const currentContributions = sources.reduce((total, { source, kind }) => {
            return source.achievementSync?.achievementId === achievement.id
                ? total + contributionFor(source, kind)
                : total;
        }, 0);

        if (currentContributions > 0 || achievement[BASE_PROGRESS_KEY] !== undefined) {
            achievement[BASE_PROGRESS_KEY] = clamp(
                Number(targetProgress) - currentContributions,
                0,
                100
            );
        }

        return true;
    }

    window.FubanAchievementSync = {
        setupForm,
        setBaseProgress,
        updateAchievements
    };
})();
