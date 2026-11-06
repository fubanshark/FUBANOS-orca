(function () {
    "use strict";

    const PROFILE_STORAGE_KEY = "fuban_profile_settings";
    const LOGIN_URL = new URL("login.html", window.location.href).href;
    const WELCOME_URL = new URL("index.html", window.location.href).href;
    const client = window.supabaseClient;

    function getDisplayName(user) {
        const metadata = user?.user_metadata || {};
        const name = metadata.display_name || metadata.full_name;
        return typeof name === "string" && name.trim()
            ? name.trim()
            : "";
    }

    function syncAccountProfile(user) {
        const accountName = getDisplayName(user);
        if (!user?.id) return accountName;

        try {
            const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
            const current = raw ? JSON.parse(raw) : {};
            if (!current || typeof current !== "object" || Array.isArray(current)) {
                throw new Error("Saved profile settings have an invalid format.");
            }

            if (current.authUserId === user.id) {
                return typeof current.displayName === "string" &&
                    current.displayName.trim()
                    ? current.displayName.trim()
                    : accountName;
            }

            if (!accountName) return "";

            localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify({
                ...current,
                authUserId: user.id,
                displayName: accountName
            }));
            return accountName;
        } catch (error) {
            console.error("Could not save the account display name:", error);
            return accountName;
        }
    }

    function applyAuthState(session) {
        const user = session?.user || null;
        const signedIn = Boolean(user);
        const displayName = user ? syncAccountProfile(user) : "";

        document.querySelectorAll("[data-auth-action]").forEach(link => {
            const label = link.querySelector("[data-auth-label]");
            const badge = link.querySelector("[data-auth-status-badge]");

            link.dataset.authAction = signedIn ? "logout" : "login";
            link.href = signedIn ? "#logout" : LOGIN_URL;
            link.setAttribute(
                "aria-label",
                signedIn ? "Log out" : "Log in"
            );

            if (label) label.textContent = signedIn ? "Log out" : "Log in";
            if (badge) badge.hidden = !signedIn;
        });

        if (displayName) {
            document.querySelectorAll("[data-auth-display-name]").forEach(element => {
                element.textContent = displayName;
            });
        }

        document.querySelectorAll("[data-auth-status-badge]").forEach(badge => {
            badge.hidden = !signedIn;
        });

        document.querySelectorAll("[data-auth-account-status]").forEach(element => {
            element.textContent = signedIn ? "Connected" : "Not connected";
        });

        document.querySelectorAll("[data-auth-account-email]").forEach(element => {
            element.textContent = signedIn && user.email
                ? user.email
                : "Available after login";
        });

        document.querySelectorAll("[data-auth-connection-label]").forEach(element => {
            element.textContent = signedIn ? "SUPABASE" : "LOCAL";
        });

        if (user) {
            window.dispatchEvent(new CustomEvent("fuban:auth-user", {
                detail: { user }
            }));
        }
    }

    document.addEventListener("click", async event => {
        const link = event.target.closest('[data-auth-action="logout"]');
        if (!link || !client) return;

        event.preventDefault();
        link.setAttribute("aria-busy", "true");

        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;
            window.location.assign(WELCOME_URL);
        } catch (error) {
            console.error("Could not sign out:", error);
            window.alert("Could not log out. Please try again.");
        } finally {
            link.removeAttribute("aria-busy");
        }
    });

    async function initializeAuthUI() {
        if (!client?.auth) {
            console.error("Supabase authentication is unavailable.");
            return;
        }

        let authEventReceived = false;
        client.auth.onAuthStateChange((_event, session) => {
            authEventReceived = true;
            applyAuthState(session);
        });

        try {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;
            if (!authEventReceived) applyAuthState(data.session);
        } catch (error) {
            console.error("Could not read the authentication session:", error);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeAuthUI, { once: true });
    } else {
        initializeAuthUI();
    }
})();
