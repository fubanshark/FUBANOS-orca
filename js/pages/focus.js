document.addEventListener("DOMContentLoaded", () => {

    /* =====================================
       STORAGE KEYS
    ===================================== */

    const STORAGE = {
        wallpaper: "fuban_focus_wallpaper",
        opacity: "fuban_focus_wallpaper_opacity"
    };

    const FOCUS_XP_PER_MINUTE = 1;
    const MAX_FOCUS_XP_PER_SESSION = 50;
    const XP_VISIBILITY_KEY = "fuban_focus_xp_visible";

    const DEFAULT_WALLPAPER = "assets/wallpapers/1403447.jpg";

    const DEFAULT_OPACITY = "18";


    /* =====================================
       CLOCK
    ===================================== */

/* =====================================
   FOCUS CLOCK & SESSION
===================================== */

const clockElement = document.getElementById("focus-clock");

const startTimeElement = document.getElementById(
    "focus-start-time"
);

const durationElement = document.getElementById(
    "focus-duration"
);

const xpTotalElement = document.getElementById(
    "focus-xp-total"
);

const xpDetailsElement = document.getElementById(
    "focus-xp-details"
);

const xpToggleButton = document.getElementById(
    "focus-xp-toggle"
);

const xpSessionResultElement = document.getElementById(
    "focus-xp-session-result"
);

const startButton = document.getElementById(
    "focus-start-button"
);

const stopButton = document.getElementById(
    "focus-stop-button"
);


// Session storage
const SESSION_KEY = "fuban_focus_active_session";
const FOCUS_SESSIONS_KEY = "fuban_focus_sessions";

function saveCompletedFocusSession(session, endedAt) {
    try {
        const saved = localStorage.getItem(FOCUS_SESSIONS_KEY);
        const sessions = saved === null ? [] : JSON.parse(saved);

        if (!Array.isArray(sessions)) {
            console.error("Focus session history is not a valid list.");
            alert("Focus time could not be recorded. Please check the saved session data.");
            return false;
        }

        const id = `focus:${session.startedAt}:${endedAt}`;
        if (!sessions.some(item => item?.id === id)) {
            sessions.push({
                id,
                startedAt: session.startedAt,
                endedAt
            });
        }

        localStorage.setItem(FOCUS_SESSIONS_KEY, JSON.stringify(sessions));
        window.FubanSystemAchievements?.refresh();
        return true;
    } catch (error) {
        console.error("Focus session history could not be saved:", error);
        alert("Focus time could not be recorded. Please check device storage.");
        return false;
    }
}


// Format current time: HH.MM.SS
function formatClock(date) {

    const hours = String(date.getHours()).padStart(2, "0");

    const minutes = String(date.getMinutes()).padStart(2, "0");

    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${hours}.${minutes}.${seconds}`;
}


// Format elapsed time: HH:MM:SS
function formatElapsed(milliseconds) {

    const totalSeconds = Math.floor(milliseconds / 1000);

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const seconds = totalSeconds % 60;

    return [
        String(hours).padStart(2, "0"),
        String(minutes).padStart(2, "0"),
        String(seconds).padStart(2, "0")
    ].join(":");
}


// Restore active session after refresh
function loadSession() {

    try {

        const saved = sessionStorage.getItem(SESSION_KEY);

        if (!saved) return null;

        const session = JSON.parse(saved);

        if (
            !Number.isFinite(session.startedAt) ||
            session.startedAt > Date.now()
        ) {
            sessionStorage.removeItem(SESSION_KEY);
            return null;
        }

        return session;

    } catch {

        sessionStorage.removeItem(SESSION_KEY);
        return null;

    }
}


let activeSession = loadSession();


// Update clock and session display
function updateFocusDisplay() {

    const now = new Date();

    // Real-time clock
    if (clockElement) {
        clockElement.textContent = formatClock(now);
    }

    if (activeSession) {

        const startDate = new Date(activeSession.startedAt);

        const elapsed = Date.now() - activeSession.startedAt;

        if (startTimeElement) {
            startTimeElement.textContent =
                `Start at ${formatClock(startDate)}`;
        }

        if (durationElement) {
            durationElement.hidden = false;

            durationElement.textContent =
                `Focus duration ${formatElapsed(elapsed)}`;
        }

        if (startButton) {
            startButton.disabled = true;
        }

        if (stopButton) {
            stopButton.disabled = false;
        }

    } else {

        if (startTimeElement) {
            startTimeElement.textContent = "Ready to focus";
        }

        if (durationElement) {
            durationElement.hidden = true;
        }

        if (startButton) {
            startButton.disabled = false;
        }

        if (stopButton) {
            stopButton.disabled = true;
        }

    }
}


// Start Focus
startButton?.addEventListener("click", () => {

    if (activeSession) return;

    activeSession = {
        startedAt: Date.now()
    };

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(activeSession)
    );

    updateFocusDisplay();

});


// Stop Focus
stopButton?.addEventListener("click", () => {

    if (!activeSession) return;

    const session = activeSession;
    const endedAt = Date.now();
    const elapsed = endedAt - session.startedAt;
    const sessionRecorded = saveCompletedFocusSession(session, endedAt);
    const fullMinutes = Math.floor(elapsed / 60000);
    const xpEarned = fullMinutes < 10
        ? 0
        : Math.min(
            MAX_FOCUS_XP_PER_SESSION,
            fullMinutes * FOCUS_XP_PER_MINUTE
        );
    const rewardStatus = xpEarned > 0
        ? window.FubanXP.award(
            `focus:${session.startedAt}`,
            xpEarned,
            "focus"
        )
        : "invalid";

    activeSession = null;

    sessionStorage.removeItem(SESSION_KEY);

    if (startTimeElement) {
        startTimeElement.textContent = "Focus stopped";
    }

    if (durationElement) {
        durationElement.hidden = false;

        durationElement.textContent =
            `Last session ${formatElapsed(elapsed)}`;
    }

    if (xpSessionResultElement) {
        xpSessionResultElement.hidden = false;
        xpSessionResultElement.textContent =
            !sessionRecorded
                ? "Focus session stopped, but its time could not be saved for achievements."
                : rewardStatus === "awarded"
                ? `You earned +${xpEarned} XP.`
                : xpEarned === 0
                    ? "You earned 0 XP. Focus for at least 10 minutes to earn XP."
                    : rewardStatus === "duplicate"
                        ? "XP for this focus session was already credited."
                        : "XP could not be saved.";
    }

    if (startButton) {
        startButton.disabled = false;
    }

    if (stopButton) {
        stopButton.disabled = true;
    }

});


function renderFocusXpTotal() {
    if (!xpTotalElement) return;

    const total = window.FubanXP.getTotal();
    xpTotalElement.textContent =
        total === null ? "Total XP unavailable" : `Total XP: ${total}`;
}

function setXpVisibility(isVisible) {
    if (!xpDetailsElement || !xpToggleButton) return;

    xpDetailsElement.hidden = !isVisible;
    xpToggleButton.textContent = isVisible ? "Hide XP" : "Show XP";
    xpToggleButton.setAttribute("aria-pressed", String(isVisible));
}

let isXpVisible = true;

try {
    const savedVisibility = localStorage.getItem(XP_VISIBILITY_KEY);

    if (savedVisibility === "true" || savedVisibility === "false") {
        isXpVisible = savedVisibility === "true";
    }
} catch (error) {
    console.error("XP visibility preference read error:", error);
    alert("The XP display preference could not be loaded.");
}

setXpVisibility(isXpVisible);

xpToggleButton?.addEventListener("click", () => {
    isXpVisible = !isXpVisible;
    setXpVisibility(isXpVisible);

    try {
        localStorage.setItem(XP_VISIBILITY_KEY, String(isXpVisible));
    } catch (error) {
        console.error("XP visibility preference save error:", error);
        alert("The XP display preference could not be saved.");
    }
});

window.addEventListener("fuban:xp-change", renderFocusXpTotal);
window.addEventListener("storage", event => {
    if (event.key === "fuban_xp_ledger") renderFocusXpTotal();
});


// Initial display
updateFocusDisplay();
renderFocusXpTotal();


// Refresh clock and elapsed duration every second
setInterval(updateFocusDisplay, 1000);;


    /* =====================================
       WALLPAPER ELEMENTS
    ===================================== */

    const wallpaperLayer = document.querySelector(
        ".focus-wallpaper"
    );

    const overlay = document.querySelector(
        ".focus-wallpaper-overlay"
    );

    const openButton = document.getElementById(
        "focus-wallpaper-open"
    );

    const modal = document.getElementById(
        "focus-wallpaper-modal"
    );

    const uploadInput = document.getElementById(
        "focus-wallpaper-upload"
    );

    const opacityInput = document.getElementById(
        "focus-wallpaper-opacity"
    );

    const opacityValue = document.getElementById(
        "focus-wallpaper-opacity-value"
    );

    const saveButton = document.getElementById(
        "focus-wallpaper-save"
    );


    let selectedWallpaper = null;


    /* =====================================
       WALLPAPER FUNCTIONS
    ===================================== */

    // Apply wallpaper

    function applyWallpaper(path) {

        if (!wallpaperLayer || !path) return;

        wallpaperLayer.style.backgroundImage =
            `url("${path}")`;

    }


    // Apply wallpaper darkness

    function applyOpacity(value) {

        if (!overlay) return;

        const opacity = Number(value) / 100;

        overlay.style.backgroundColor =
            document.documentElement.dataset.theme === "light"
                ? `rgba(245, 245, 237, ${Math.max(0.16, 0.4 - opacity * 0.25)})`
                : `rgba(0, 0, 0, ${Math.min(0.78, opacity + 0.08)})`;


        if (opacityValue) {

            opacityValue.textContent = `${value}%`;

        }

    }

    window.addEventListener("fuban:theme-change", () => {
        applyOpacity(
            localStorage.getItem(STORAGE.opacity) ?? DEFAULT_OPACITY
        );
    });

    window.addEventListener("storage", event => {
        if (event.key === "fuban_settings_v1") {
            applyOpacity(
                localStorage.getItem(STORAGE.opacity) ?? DEFAULT_OPACITY
            );
        }
    });


    // Open wallpaper modal

    function openWallpaperModal() {

        if (!modal) return;

        modal.classList.add("show");

        modal.setAttribute("aria-hidden", "false");

    }


    // Close wallpaper modal

    function closeWallpaperModal() {

        if (!modal) return;

        modal.classList.remove("show");

        modal.setAttribute("aria-hidden", "true");

    }


    /* =====================================
       LOAD SAVED SETTINGS
    ===================================== */

    const savedWallpaper = localStorage.getItem(
        STORAGE.wallpaper
    );

    const savedOpacity = localStorage.getItem(
        STORAGE.opacity
    ) ?? DEFAULT_OPACITY;


    selectedWallpaper = savedWallpaper || DEFAULT_WALLPAPER;


    // Apply saved wallpaper

    applyWallpaper(selectedWallpaper);


    // Apply saved opacity

    if (opacityInput) {

        opacityInput.value = savedOpacity;

    }

    applyOpacity(savedOpacity);


    // Mark selected built-in wallpaper

    document.querySelectorAll(".focus-wallpaper-option")
        .forEach(option => {

            if (option.dataset.wallpaper === selectedWallpaper) {

                option.classList.add("selected");

            } else {

                option.classList.remove("selected");

            }

        });


    /* =====================================
       WALLPAPER MODAL EVENTS
    ===================================== */

    // Open modal

    openButton?.addEventListener("click", () => {

        openWallpaperModal();

    });


    // Close modal buttons

    document.querySelectorAll(
        '[data-close="focus-wallpaper-modal"]'
    ).forEach(button => {

        button.addEventListener("click", () => {

            closeWallpaperModal();

        });

    });


    // Close when clicking outside

    modal?.addEventListener("click", event => {

        if (event.target === modal) {

            closeWallpaperModal();

        }

    });


    // Close with Escape

    document.addEventListener("keydown", event => {

        if (
            event.key === "Escape" &&
            modal?.classList.contains("show")
        ) {

            closeWallpaperModal();

        }

    });


    /* =====================================
       SELECT BUILT-IN WALLPAPER
    ===================================== */

    document.querySelectorAll(".focus-wallpaper-option")
        .forEach(option => {

            option.addEventListener("click", () => {

                document.querySelectorAll(".focus-wallpaper-option")
                    .forEach(item => {

                        item.classList.remove("selected");

                    });


                option.classList.add("selected");


                selectedWallpaper = option.dataset.wallpaper;


                applyWallpaper(selectedWallpaper);

            });

        });


    /* =====================================
       UPLOAD WALLPAPER
    ===================================== */

    uploadInput?.addEventListener("change", event => {

        const file = event.target.files[0];

        if (!file) return;


        // Validate image type

        if (!file.type.startsWith("image/")) {

            alert("Please choose an image file.");

            uploadInput.value = "";

            return;

        }


        // Validate image size

        if (file.size > 5 * 1024 * 1024) {

            alert("Image must be smaller than 5 MB.");

            uploadInput.value = "";

            return;

        }


        const reader = new FileReader();


        reader.onload = () => {

            selectedWallpaper = reader.result;


            document.querySelectorAll(
                ".focus-wallpaper-option"
            ).forEach(option => {

                option.classList.remove("selected");

            });


            applyWallpaper(selectedWallpaper);

        };


        reader.onerror = () => {

            alert("Unable to read this image.");

        };


        reader.readAsDataURL(file);

    });


    /* =====================================
       WALLPAPER DARKNESS
    ===================================== */

    opacityInput?.addEventListener("input", () => {

        applyOpacity(opacityInput.value);

    });


    /* =====================================
       SAVE WALLPAPER
    ===================================== */

    saveButton?.addEventListener("click", () => {

        try {

            localStorage.setItem(
                STORAGE.wallpaper,
                selectedWallpaper || DEFAULT_WALLPAPER
            );


            localStorage.setItem(
                STORAGE.opacity,
                opacityInput?.value ?? DEFAULT_OPACITY
            );


            closeWallpaperModal();


        } catch (error) {

            console.error("Wallpaper save error:", error);

            alert(
                "Unable to save wallpaper. Please choose a smaller image."
            );

        }

    });

});