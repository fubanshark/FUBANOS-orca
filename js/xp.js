(function () {
    "use strict";

    const STORAGE_KEY = "fuban_xp_ledger";

    function readLedger() {
        let saved;

        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            console.error("XP data read error:", error);
            alert("XP data could not be read from this device.");
            return null;
        }

        if (saved === null) return [];

        try {
            const ledger = JSON.parse(saved);

            if (
                !Array.isArray(ledger) ||
                ledger.some(entry =>
                    !entry ||
                    typeof entry.id !== "string" ||
                    !Number.isSafeInteger(Number(entry.xp)) ||
                    Number(entry.xp) === 0 ||
                    (entry.awardedAt && !Number.isFinite(
                        new Date(entry.awardedAt).getTime()
                    ))
                )
            ) {
                throw new Error("XP ledger contains invalid data.");
            }

            return ledger;
        } catch (error) {
            console.error("XP data read error:", error);
            alert("XP data could not be read. Your saved XP was not changed.");
            return null;
        }
    }

    function getTotal() {
        const ledger = readLedger();

        if (!ledger) return null;

        return ledger.reduce((total, entry) => {
            const amount = Number(entry.xp);

            return total + amount;
        }, 0);
    }

    function saveLedger(ledger) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
        } catch (error) {
            console.error("XP data save error:", error);
            alert("XP could not be saved. Please check your device storage.");
            return false;
        }

        window.dispatchEvent(new CustomEvent("fuban:xp-change"));
        return true;
    }

    function createEntryId(prefix) {
        const suffix = window.crypto &&
            typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

        return `${prefix}:${suffix}`;
    }

    function award(id, amount, source) {
        const xp = Number(amount);

        if (
            !id ||
            !Number.isSafeInteger(xp) ||
            xp <= 0
        ) {
            return "invalid";
        }

        const ledger = readLedger();

        if (!ledger) return "unavailable";
        if (ledger.some(entry => entry.id === id)) return "duplicate";

        ledger.push({
            id,
            xp,
            source,
            awardedAt: new Date().toISOString()
        });

        return saveLedger(ledger) ? "awarded" : "unavailable";
    }

    function setMissionProgress(missionId, amount) {
        const xp = Number(amount);

        if (
            !missionId ||
            !Number.isSafeInteger(xp) ||
            xp < 0
        ) {
            return "invalid";
        }

        const ledger = readLedger();

        if (!ledger) return "unavailable";

        const missionEntries = ledger.filter(entry =>
            entry.missionId === missionId ||
            entry.id === `mission:${missionId}`
        );
        const currentXp = missionEntries.reduce(
            (total, entry) => total + Number(entry.xp),
            0
        );
        const change = xp - currentXp;

        if (change === 0) return "unchanged";

        ledger.push({
            id: createEntryId(`mission-progress:${missionId}`),
            missionId,
            xp: change,
            source: "mission-progress",
            awardedAt: new Date().toISOString()
        });

        return saveLedger(ledger) ? "updated" : "unavailable";
    }

    function getTotalForDate(dateKey) {
        const ledger = readLedger();

        if (!ledger) return null;

        return ledger.reduce((total, entry) => {
            if (!entry.awardedAt) return total;

            const date = new Date(entry.awardedAt);
            const localDateKey = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");

            return localDateKey === dateKey
                ? total + Number(entry.xp)
                : total;
        }, 0);
    }

    window.FubanXP = Object.freeze({
        award,
        getTotal,
        getTotalForDate,
        setMissionProgress
    });
})();
