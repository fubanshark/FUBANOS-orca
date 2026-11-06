/* =========================================
   FUBAN OS - SETTINGS v1.0

   Local preferences only.
   Cloud sync will be added with Supabase.
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";


    /* =====================================
       STORAGE
    ===================================== */

    const STORAGE_KEY = "fuban_settings_v1";


    const defaults = {

        reducedMotion: false,

        publicProfile: false,

        theme: "light",

        weekStart: "monday",

        timeFormat: "24"

    };


    /* =====================================
       ELEMENTS
    ===================================== */

    const elements = {

        reducedMotion:
            document.getElementById("reduced-motion-toggle"),

        publicProfile:
            document.getElementById("public-profile-toggle"),

        weekStart:
            document.getElementById("week-start-select"),

        timeFormat:
            document.getElementById("time-format-select"),

        theme:
            document.getElementById("theme-select"),

        themeStatus:
            document.getElementById("theme-status"),

        motionStatus:
            document.getElementById("motion-status"),

        privacyStatus:
            document.getElementById("privacy-status"),

        clearCache:
            document.getElementById("clear-cache-button"),

        cacheFeedback:
            document.getElementById("cache-feedback")

    };


    /* =====================================
       READ SETTINGS
    ===================================== */

    function readSettings() {

        try {

            const raw =
                localStorage.getItem(STORAGE_KEY);

            if (!raw) {

                return { ...defaults };

            }


            const parsed = JSON.parse(raw);


            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {

                throw new Error(
                    "Settings data has an invalid format."
                );

            }


            return {

                reducedMotion:
                    typeof parsed.reducedMotion === "boolean"
                        ? parsed.reducedMotion
                        : defaults.reducedMotion,

                publicProfile:
                    typeof parsed.publicProfile === "boolean"
                        ? parsed.publicProfile
                        : defaults.publicProfile,

                theme:
                    ["light", "dark"].includes(parsed.theme)
                        ? parsed.theme
                        : defaults.theme,

                weekStart:
                    ["monday", "sunday"].includes(parsed.weekStart)
                        ? parsed.weekStart
                        : defaults.weekStart,

                timeFormat:
                    ["12", "24"].includes(
                        String(parsed.timeFormat)
                    )
                        ? String(parsed.timeFormat)
                        : defaults.timeFormat

            };

        }

        catch (error) {

            console.error(
                "Could not read FUBAN OS settings:",
                error
            );

            return { ...defaults };

        }

    }


    let settings = readSettings();


    /* =====================================
       SAVE SETTINGS
    ===================================== */

    function saveSettings() {

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );

            return true;

        }

        catch (error) {

            console.error(
                "Could not save FUBAN OS settings:",
                error
            );

            window.alert(
                "Settings could not be saved. " +
                "Please check the available browser storage."
            );

            return false;

        }

    }


    /* =====================================
       REDUCED MOTION
    ===================================== */

    function applyReducedMotion() {

        document.body.classList.toggle(
            "reduce-motion",
            settings.reducedMotion
        );


        if (elements.reducedMotion) {

            elements.reducedMotion.checked =
                settings.reducedMotion;

        }


        if (elements.motionStatus) {

            elements.motionStatus.textContent =
                settings.reducedMotion

                    ? "Reduced motion is enabled on this device."

                    : "Animation preference is saved on this device.";

        }

    }


    /* =====================================
       COLOR THEME
    ===================================== */

    function applyTheme() {
        document.documentElement.dataset.theme = settings.theme;
        const themeColor = settings.theme === "light"
            ? "#e9e9df"
            : "#08090D";
        document.querySelector('meta[name="theme-color"]')
            ?.setAttribute("content", themeColor);

        if (elements.theme) elements.theme.value = settings.theme;
        if (elements.themeStatus) {
            elements.themeStatus.textContent = settings.theme === "light"
                ? "Light theme · mixed serif/sans type with soft green accents."
                : "Dark theme · UID Space type and cool glass panels.";
        }
    }


    /* =====================================
       PUBLIC PROFILE
    ===================================== */

    function applyPublicProfile() {

        if (elements.publicProfile) {

            elements.publicProfile.checked =
                settings.publicProfile;

        }


        if (elements.privacyStatus) {

            elements.privacyStatus.textContent =
                settings.publicProfile

                    ? "Public visibility preference is ON. Publishing is not active until profile hosting is implemented."

                    : "Your profile is private by default. This preference is saved locally.";

        }

    }


    /* =====================================
       INITIALIZE CONTROLS
    ===================================== */

    function initializeControls() {

        if (elements.weekStart) {

            elements.weekStart.value =
                settings.weekStart;

        }


        if (elements.timeFormat) {

            elements.timeFormat.value =
                settings.timeFormat;

        }


        applyReducedMotion();

        applyPublicProfile();

        applyTheme();

    }


    /* =====================================
       EVENT: REDUCED MOTION
    ===================================== */

    elements.reducedMotion?.addEventListener(
        "change",
        event => {

            settings.reducedMotion =
                event.currentTarget.checked;


            if (saveSettings()) {

                applyReducedMotion();

            }

        }
    );


    /* =====================================
       EVENT: PUBLIC PROFILE
    ===================================== */

    elements.publicProfile?.addEventListener(
        "change",
        event => {

            settings.publicProfile =
                event.currentTarget.checked;


            if (saveSettings()) {

                applyPublicProfile();

            }

        }
    );


    /* =====================================
       EVENT: WEEK START
    ===================================== */

    elements.weekStart?.addEventListener(
        "change",
        event => {

            settings.weekStart =
                event.currentTarget.value;

            saveSettings();

        }
    );


    /* =====================================
       EVENT: TIME FORMAT
    ===================================== */

    elements.timeFormat?.addEventListener(
        "change",
        event => {

            settings.timeFormat =
                event.currentTarget.value;

            saveSettings();

        }
    );


    /* =====================================
       EVENT: COLOR THEME
    ===================================== */

    elements.theme?.addEventListener(
        "change",
        event => {
            const previousTheme = settings.theme;
            settings.theme = event.currentTarget.value === "dark"
                ? "dark"
                : "light";

            if (saveSettings()) {
                applyTheme();
                window.dispatchEvent(new CustomEvent("fuban:theme-change", {
                    detail: { theme: settings.theme }
                }));
            } else {
                settings.theme = previousTheme;
                applyTheme();
            }
        }
    );


    /* =====================================
       CLEAR LOCAL CACHE
    ===================================== */

    elements.clearCache?.addEventListener(
        "click",
        async () => {

            const confirmed = window.confirm(

                "Clear temporary browser cache?\n\n" +

                "Your missions, XP, journal, profile " +
                "and saved settings will not be deleted."

            );


            if (!confirmed) return;


            let removed = 0;


            try {

                if ("caches" in window) {

                    const cacheNames =
                        await window.caches.keys();


                    const results =
                        await Promise.all(

                            cacheNames.map(name =>
                                window.caches.delete(name)
                            )

                        );


                    removed =
                        results.filter(Boolean).length;

                }


                /*
                    IMPORTANT:

                    We intentionally preserve:

                    - localStorage
                    - sessionStorage
                    - XP
                    - Missions
                    - Journal
                    - Profile

                    These currently contain app data.
                */


                if (elements.cacheFeedback) {

                    elements.cacheFeedback.textContent =

                        removed > 0

                            ? `Temporary cache cleared (${removed} cache ${removed === 1 ? "entry" : "entries"}). Your app data is safe.`

                            : "No temporary browser cache was found. Your app data is unchanged.";

                }

            }

            catch (error) {

                console.error(
                    "Could not clear temporary cache:",
                    error
                );


                if (elements.cacheFeedback) {

                    elements.cacheFeedback.textContent =
                        "Cache could not be cleared by this browser. Your app data is unchanged.";

                }

            }

        }

    );


    /* =====================================
       INITIALIZE
    ===================================== */

    initializeControls();


});