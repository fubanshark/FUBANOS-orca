(function () {
    "use strict";

    const SETTINGS_KEY = "fuban_settings_v1";

    function readTheme() {
        try {
            const raw = localStorage.getItem(SETTINGS_KEY);
            if (!raw) return "dark";

            const settings = JSON.parse(raw);
            if (
                settings &&
                settings.theme === "light" &&
                settings.themePreferenceSet !== true
            ) {
                settings.theme = "dark";
                settings.themePreferenceSet = true;
                try {
                    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
                } catch (error) {
                    console.error("Could not migrate the saved color theme:", error);
                }
                return "dark";
            }

            return settings && settings.theme === "light" ? "light" : "dark";
        } catch (error) {
            console.error("Could not read the saved color theme:", error);
            return "dark";
        }
    }

    function applyTheme() {
        const theme = readTheme();
        document.documentElement.dataset.theme = theme;
        const color = theme === "light" ? "#e9e9df" : "#08090D";
        document.querySelector('meta[name="theme-color"]')
            ?.setAttribute("content", color);
    }

    applyTheme();
    window.addEventListener("storage", event => {
        if (event.key === SETTINGS_KEY) applyTheme();
    });
})();
