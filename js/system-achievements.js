(() => {
    const ACHIEVEMENTS_KEY = "fuban_milestone_achievements";
    const MISSIONS_KEY = "fuban_dashboard_missions";
    const JOURNAL_KEY = "fuban_journal_v5";
    const LEGACY_JOURNAL_KEYS = [
        "fuban_journal_v4",
        "fuban_journal_v3",
        "fuban_journal_v2",
        "fuban_journal_data"
    ];
    const FOCUS_SESSIONS_KEY = "fuban_focus_sessions";
    const TRIP_MARKER = "journey-bookmark";

    const SYSTEM_METRICS = {
        system_1: {
            target: 100,
            label: "Sleeping missions",
            count: missions => countMissions(missions, ["Sleeping"])
        },
        system_2: {
            target: 180,
            label: "Journal days",
            count: (_, journal) => countJournalDays(journal)
        },
        system_3: {
            target: 1000,
            label: "Mathematics or Science missions",
            count: missions => countMissions(missions, [
                "Mathematics",
                "Biology",
                "Chemistry",
                "Physics",
                "Earth & Astronomy"
            ])
        },
        system_4: {
            target: 600,
            label: "Science missions",
            count: missions => countMissions(missions, [
                "Biology",
                "Chemistry",
                "Physics",
                "Earth & Astronomy"
            ])
        },
        system_5: {
            target: 500,
            label: "Music or Art missions",
            count: missions => countMissions(missions, [
                "Music Skills",
                "Painting & Art"
            ])
        },
        system_6: {
            target: 100,
            label: "Travel days",
            count: (_, journal) => countTripDays(journal)
        },
        system_8: {
            target: 100,
            label: "Focus days (60+ minutes)",
            count: (_, __, focusSessions) => countFocusDays(focusSessions)
        }
    };

    const SYSTEM_DESCRIPTIONS = {
        system_1: "Complete 100 Sleeping missions.",
        system_2: "Write in your journal on 180 different days.",
        system_3: "Complete 1,000 Mathematics or Science missions.",
        system_4: "Complete 600 Science missions.",
        system_5: "Complete 500 Music Skills or Painting & Art missions.",
        system_6: "Mark 100 different travel days with the special Journey bookmark sticker.",
        system_8: "Focus for at least 60 minutes on 100 different days."
    };

    const MISSION_METRIC_IDS = new Set([
        "system_1",
        "system_3",
        "system_4",
        "system_5"
    ]);
    const JOURNAL_METRIC_IDS = new Set(["system_2", "system_6"]);

    function readStoredValue(key, fallback) {
        try {
            const stored = localStorage.getItem(key);
            if (stored === null) return fallback;
            return JSON.parse(stored);
        } catch (error) {
            console.error(`Cannot read ${key}:`, error);
            return null;
        }
    }

    function isDateKey(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) {
            return false;
        }

        const [year, month, day] = String(value).split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day;
    }

    function countMissions(missions, categories) {
        return missions.filter(mission =>
            mission &&
            categories.includes(mission.category) &&
            Number(mission.progress) >= 100
        ).length;
    }

    function getJournalPages(journal) {
        if (!journal || typeof journal !== "object") return null;

        if (Array.isArray(journal.spreads)) {
            return journal.spreads.flatMap(spread =>
                Array.isArray(spread?.pages) ? spread.pages : []
            );
        }

        return Array.isArray(journal.pages) ? journal.pages : null;
    }

    function hasWrittenContent(page) {
        const text = document.createElement("div");
        const objectText = Array.isArray(page.objects)
            ? page.objects
                .filter(object => object?.type === "text")
                .map(object => object.content || object.text || "")
                .join(" ")
            : "";
        text.innerHTML = `${page.content || ""} ${objectText}`;
        return Boolean(text.textContent.trim());
    }

    function countJournalDays(journal) {
        const pages = getJournalPages(journal);
        if (!pages) return 0;

        return new Set(pages
            .filter(page => isDateKey(page?.date) && hasWrittenContent(page))
            .map(page => page.date)
        ).size;
    }

    function countTripDays(journal) {
        const pages = getJournalPages(journal);
        if (!pages) return 0;

        return new Set(pages
            .filter(page =>
                isDateKey(page?.date) &&
                Array.isArray(page.stickers) &&
                page.stickers.some(sticker => sticker?.achievementType === TRIP_MARKER)
            )
            .map(page => page.date)
        ).size;
    }

    function getFocusMinutesByDate(sessions) {
        const millisecondsByDate = new Map();

        sessions.forEach(session => {
            const startedAt = Number(session?.startedAt);
            const endedAt = Number(session?.endedAt);
            if (
                !Number.isFinite(startedAt) ||
                !Number.isFinite(endedAt) ||
                endedAt <= startedAt
            ) {
                return;
            }

            let segmentStart = startedAt;
            while (segmentStart < endedAt) {
                const startDate = new Date(segmentStart);
                const nextDate = new Date(
                    startDate.getFullYear(),
                    startDate.getMonth(),
                    startDate.getDate() + 1
                ).getTime();
                const segmentEnd = Math.min(endedAt, nextDate);
                const dateKey = [
                    startDate.getFullYear(),
                    String(startDate.getMonth() + 1).padStart(2, "0"),
                    String(startDate.getDate()).padStart(2, "0")
                ].join("-");

                millisecondsByDate.set(
                    dateKey,
                    (millisecondsByDate.get(dateKey) || 0) +
                        segmentEnd - segmentStart
                );
                segmentStart = segmentEnd;
            }
        });

        return new Map(
            [...millisecondsByDate].map(([date, milliseconds]) => [
                date,
                Math.floor(milliseconds / 60000)
            ])
        );
    }

    function countFocusDays(sessions) {
        return [...getFocusMinutesByDate(sessions).values()]
            .filter(minutes => minutes >= 60)
            .length;
    }

    function refresh() {
        const achievements = readStoredValue(ACHIEVEMENTS_KEY, []);
        const missions = readStoredValue(MISSIONS_KEY, []);
        const journalKey = [JOURNAL_KEY, ...LEGACY_JOURNAL_KEYS]
            .find(key => localStorage.getItem(key) !== null);
        const journalRaw = journalKey ? localStorage.getItem(journalKey) : null;
        const journal = journalKey ? readStoredValue(journalKey, null) : null;
        const focusSessions = readStoredValue(FOCUS_SESSIONS_KEY, []);

        if (!Array.isArray(achievements)) {
            console.error("System achievement data is not a valid list.");
            return false;
        }

        const missionsReady = Array.isArray(missions);
        const journalReady = journalRaw === null ||
            Boolean(journal && getJournalPages(journal));
        const focusSessionsReady = Array.isArray(focusSessions);

        if (!missionsReady) {
            console.error("Mission data is not a valid list; mission achievements were not updated.");
        }
        if (!journalReady) {
            console.error("Journal data is invalid; diary and travel achievements were not updated.");
        }
        if (!focusSessionsReady) {
            console.error("Focus session data is not a valid list; focus achievements were not updated.");
        }

        let changed = false;

        achievements.forEach(achievement => {
            const metric = SYSTEM_METRICS[achievement?.id];
            if (!metric || !achievement.isSystem) return;
            if (
                (MISSION_METRIC_IDS.has(achievement.id) && !missionsReady) ||
                (JOURNAL_METRIC_IDS.has(achievement.id) && !journalReady) ||
                (achievement.id === "system_8" && !focusSessionsReady)
            ) {
                return;
            }

            const count = metric.count(
                missionsReady ? missions : [],
                journalReady ? journal : null,
                focusSessionsReady ? focusSessions : []
            );
            const progress = Math.round(
                Math.min(100, count / metric.target * 100) * 100
            ) / 100;
            const label = `${count} / ${metric.target} ${metric.label}`;

            if (achievement.description !== SYSTEM_DESCRIPTIONS[achievement.id]) {
                achievement.description = SYSTEM_DESCRIPTIONS[achievement.id];
                changed = true;
            }

            if (achievement.progress !== progress) {
                achievement.progress = progress;
                changed = true;
            }

            if (achievement.progressLabel !== label) {
                achievement.progressLabel = label;
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

        if (changed) {
            try {
                localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
            } catch (error) {
                console.error("System achievements could not be saved:", error);
                return false;
            }
        }

        window.dispatchEvent(new Event("fuban:system-achievements-updated"));
        return true;
    }

    function getFocusMinutes(dateKey) {
        const sessions = readStoredValue(FOCUS_SESSIONS_KEY, []);
        if (!Array.isArray(sessions)) {
            console.error("Focus session data is not a valid list.");
            return null;
        }
        return getFocusMinutesByDate(sessions).get(dateKey) || 0;
    }

    window.FubanSystemAchievements = {
        refresh,
        getFocusMinutes
    };

    window.addEventListener("storage", event => {
        if (
            event.key === ACHIEVEMENTS_KEY ||
            event.key === MISSIONS_KEY ||
            event.key === JOURNAL_KEY ||
            event.key === FOCUS_SESSIONS_KEY
        ) {
            refresh();
        }
    });

    refresh();
})();
