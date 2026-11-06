document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const STORAGE_KEY = "fuban_profile_settings";
    const IMAGE_PATTERN = /^data:image\/(?:png|jpeg|webp);base64,/i;
    const PROFILE_LINK_SELECTOR = 'a[href="profile.html"]';

    function readProfileSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;

            const settings = JSON.parse(raw);
            if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
                throw new Error("Profile settings are not a valid object.");
            }

            return settings;
        } catch (error) {
            console.error("Profile picture could not be loaded in navigation:", error);
            return null;
        }
    }

    function updateProfileLinks() {
        const settings = readProfileSettings();
        const source = settings?.pictureImage;
        if (typeof source !== "string" || !IMAGE_PATTERN.test(source)) return;

        document.querySelectorAll(PROFILE_LINK_SELECTOR).forEach(link => {
            let icon = link.querySelector(".profile-avatar-icon");
            if (!icon) {
                icon = document.createElement("span");
                icon.className = "profile-avatar-icon";
                icon.setAttribute("aria-hidden", "true");

                const dot = link.querySelector(".profile-dot");
                const buttonIcon = [...link.querySelectorAll(".button-icon")]
                    .find(element => element.textContent.trim() === "●");

                if (dot) {
                    dot.replaceWith(icon);
                } else if (buttonIcon) {
                    buttonIcon.replaceWith(icon);
                } else {
                    link.insertBefore(icon, link.firstChild);
                }
            }

            let image = icon.querySelector("img");
            if (!image) {
                image = document.createElement("img");
                image.alt = "";
                icon.replaceChildren(image);
            }

            image.src = source;
            const crop = settings.pictureCrop || {};
            const zoom = Number(crop.zoom);
            const x = Number(crop.x);
            const y = Number(crop.y);
            image.style.objectPosition = `${
                Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50
            }% ${
                Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50
            }%`;
            image.style.transform = `scale(${
                Number.isFinite(zoom) ? Math.max(100, Math.min(250, zoom)) / 100 : 1
            })`;
        });
    }

    updateProfileLinks();
    window.addEventListener("storage", event => {
        if (event.key === STORAGE_KEY) updateProfileLinks();
    });
});
