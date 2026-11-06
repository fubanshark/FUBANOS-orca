
"use strict";

// =========================================
// FUBAN OS - LOGIN UI
// Frontend only (Supabase integration later)
// =========================================


// ELEMENTS
const loginView = document.getElementById("login-view");
const forgotView = document.getElementById("forgot-view");

const loginForm = document.getElementById("login-form");
const forgotForm = document.getElementById("forgot-form");

const loginError = document.getElementById("login-error");
const forgotError = document.getElementById("forgot-error");

const passwordInput = document.getElementById("login-password");
const passwordToggle = document.getElementById("password-toggle");


// =========================================
// VIEW MANAGEMENT
// =========================================

function showLogin() {
    forgotView.hidden = true;
    loginView.hidden = false;

    clearMessages();
}


function showForgotPassword() {
    loginView.hidden = true;
    forgotView.hidden = false;

    clearMessages();

    document.getElementById("recovery-email").value =
        document.getElementById("login-email").value;

    document.getElementById("recovery-email").focus();
}


// =========================================
// MESSAGE MANAGEMENT
// =========================================

function clearMessages() {
    loginError.hidden = true;
    forgotError.hidden = true;

    loginError.textContent = "";
    forgotError.textContent = "";
}


function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
}


// =========================================
// VALIDATION
// =========================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// =========================================
// PASSWORD VISIBILITY
// =========================================

passwordToggle.addEventListener("click", function () {

    const isPassword = passwordInput.type === "password";

    passwordInput.type = isPassword ? "text" : "password";

    passwordToggle.textContent = isPassword ? "Hide" : "Show";

    passwordToggle.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
    );

});


// =========================================
// NAVIGATION
// =========================================

document.getElementById("forgot-link")
    .addEventListener("click", showForgotPassword);


document.getElementById("back-to-login")
    .addEventListener("click", showLogin);


// =========================================
// LOGIN FORM
// =========================================

loginForm.addEventListener("submit", function (event) {

    event.preventDefault();

    clearMessages();

    const email = document.getElementById("login-email").value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showError(
            loginError,
            "Please enter both your email address and password."
        );
        return;
    }

    if (!isValidEmail(email)) {
        showError(
            loginError,
            "Please enter a valid email address."
        );
        return;
    }

    // Supabase Authentication will be added in Phase 3.
    showError(
        loginError,
        "Authentication is not connected yet. Please try again after Supabase setup."
    );

});


// =========================================
// FORGOT PASSWORD FORM
// =========================================

forgotForm.addEventListener("submit", function (event) {

    event.preventDefault();

    clearMessages();

    const email = document.getElementById("recovery-email").value.trim();

    if (!email) {
        showError(
            forgotError,
            "Please enter your email address."
        );
        return;
    }

    if (!isValidEmail(email)) {
        showError(
            forgotError,
            "Please enter a valid email address."
        );
        return;
    }

    // Supabase Password Recovery will be added in Phase 3.
    showError(
        forgotError,
        "Password recovery is not connected yet. Please try again after Supabase setup."
    );

});


// =========================================
// GOOGLE LOGIN
// =========================================

document.getElementById("google-login")
    .addEventListener("click", function () {

        clearMessages();

        showError(
            loginError,
            "Google Authentication is not connected yet. Please try again after Supabase setup."
        );

    });
