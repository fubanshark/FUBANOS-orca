
"use strict";

// ==========================================
// FUBAN OS - AUTHENTICATION
// ==========================================

const db = window.supabaseClient;

const $ = (id) => document.getElementById(id);

const loginView = $("login-view");
const signupView = $("signup-view");
const forgotView = $("forgot-view");

const loginForm = $("login-form");
const signupForm = $("signup-form");
const forgotForm = $("forgot-form");

const dashboardURL = new URL("index.html", location.href).href;
const loginURL = new URL("login.html", location.href).href;

// ==========================================
// MESSAGES
// ==========================================

function clearMessages() {
    ["login-error", "signup-message", "forgot-error"].forEach(id => {
        const element = $(id);
        if (element) {
            element.hidden = true;
            element.textContent = "";
        }
    });
}

function showMessage(id, message, type = "error") {
    const element = $(id);
    if (!element) return;

    element.textContent = message;
    element.hidden = false;

    element.classList.toggle("error-message", type === "error");
    element.classList.toggle("success-message", type === "success");
}

function saveSignupProfileName(user, name) {
    if (
        !user?.id ||
        user.user_metadata?.display_name !== name
    ) {
        return false;
    }

    try {
        const key = "fuban_profile_settings";
        const raw = localStorage.getItem(key);
        const current = raw ? JSON.parse(raw) : {};
        if (!current || typeof current !== "object" || Array.isArray(current)) {
            throw new Error("Saved profile settings have an invalid format.");
        }

        localStorage.setItem(key, JSON.stringify({
            ...current,
            authUserId: user.id,
            displayName: name
        }));
        return true;
    } catch (error) {
        console.error("Could not save the signup profile name:", error);
        return false;
    }
}

// ==========================================
// VIEW MANAGEMENT
// ==========================================

function showView(view) {
    [loginView, signupView, forgotView].forEach(item => {
        if (item) item.hidden = item !== view;
    });

    clearMessages();
}

$("show-signup")?.addEventListener("click", () => {
    showView(signupView);
});

$("back-to-login-from-signup")?.addEventListener("click", () => {
    showView(loginView);
});

$("forgot-link")?.addEventListener("click", () => {
    $("recovery-email").value = $("login-email").value;
    showView(forgotView);
});

$("back-to-login")?.addEventListener("click", () => {
    showView(loginView);
});

// ==========================================
// PASSWORD VISIBILITY
// ==========================================

$("password-toggle")?.addEventListener("click", () => {
    const input = $("login-password");
    const isHidden = input.type === "password";

    input.type = isHidden ? "text" : "password";
    $("password-toggle").textContent = isHidden ? "Hide" : "Show";
});

// ==========================================
// VALIDATION
// ==========================================

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ==========================================
// EMAIL + PASSWORD LOGIN
// ==========================================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const email = $("login-email").value.trim();
    const password = $("login-password").value;
    const button = $("login-submit");

    if (!validEmail(email) || !password) {
        showMessage("login-error", "Please enter a valid email and password.");
        return;
    }

    button.disabled = true;

    try {
        const { data, error } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        if (!data.session) {
            throw new Error("Login session was not created.");
        }

        location.replace(dashboardURL);

    } catch (error) {
        console.error("Login:", error);
        showMessage(
            "login-error",
            "Unable to sign in. Please check your email and password."
        );
    } finally {
        button.disabled = false;
    }
});

// ==========================================
// SIGN UP
// ==========================================

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const name = $("signup-name").value.trim();
    const email = $("signup-email").value.trim();
    const password = $("signup-password").value;
    const confirmPassword = $("signup-confirm-password").value;
    const button = $("signup-submit");

    if (!name || !validEmail(email)) {
        showMessage("signup-message", "Please enter your name and a valid email.");
        return;
    }

    if (password.length < 8) {
        showMessage("signup-message", "Password must contain at least 8 characters.");
        return;
    }

    if (password !== confirmPassword) {
        showMessage("signup-message", "Passwords do not match.");
        return;
    }

    button.disabled = true;

    try {
        const { data, error } = await db.auth.signUp({
            email,
            password,
            options: {
                data: {
                    display_name: name
                },
                emailRedirectTo: loginURL
            }
        });

        if (error) throw error;

        const profileNameSaved = saveSignupProfileName(data.user, name);

        if (data.session) {
            showMessage(
                "signup-message",
                "Account created successfully! Redirecting...",
                "success"
            );

            location.replace(dashboardURL);
        } else {
            showMessage(
                "signup-message",
                profileNameSaved
                    ? "Account created! Please check your email to confirm your account before signing in."
                    : "Account created! Please check your email to confirm your account. Your profile name will sync after sign-in.",
                "success"
            );
        }

    } catch (error) {
        console.error("Sign up:", error);

        showMessage(
            "signup-message",
            "Unable to create account. Please check your details or try another email."
        );
    } finally {
        button.disabled = false;
    }
});

// ==========================================
// FORGOT PASSWORD
// ==========================================

forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMessages();

    const email = $("recovery-email").value.trim();
    const button = forgotForm.querySelector('button[type="submit"]');

    if (!validEmail(email)) {
        showMessage("forgot-error", "Please enter a valid email.");
        return;
    }

    button.disabled = true;

    try {
        const { error } = await db.auth.resetPasswordForEmail(email, {
            redirectTo: loginURL
        });

        if (error) throw error;

        showMessage(
            "forgot-error",
            "If an account exists, a recovery email will be sent.",
            "success"
        );

    } catch (error) {
        console.error("Password recovery:", error);
        showMessage("forgot-error", "Unable to send recovery email. Try again.");
    } finally {
        button.disabled = false;
    }
});

// ==========================================
// GOOGLE LOGIN
// ==========================================

$("google-login").addEventListener("click", async () => {
    clearMessages();

    try {
        const { error } = await db.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: dashboardURL
            }
        });

        if (error) throw error;

    } catch (error) {
        console.error("Google login:", error);
        showMessage("login-error", "Unable to connect with Google.");
    }
});

// ==========================================
// EXISTING SESSION
// ==========================================

async function checkSession() {
    if (!db) return;

    const { data, error } = await db.auth.getSession();

    if (error) {
        console.error("Session:", error);
        return;
    }

    if (data.session) {
        location.replace(dashboardURL);
    }
}

if (!db) {
    console.error("Supabase Client is missing.");
} else {
    checkSession();
}

console.log("FUBAN OS: Authentication initialized.");
