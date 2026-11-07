
"use strict";

(() => {
    const db = window.supabaseClient;
    const ADMIN_EMAIL = "fubanwork@gmail.com";

    let currentUser = null;
    let announcements = [];
    let unreadCount = 0;

    // =====================================
    // INITIALIZE
    // =====================================

    async function initialize() {
        createNotificationUI();

        if (!db?.auth) {
            console.error("Supabase client unavailable.");
            showError("Announcements are unavailable.");
            return;
        }

        const { data, error } = await db.auth.getUser();

        if (error) {
            if (error.name === "AuthSessionMissingError") {
                showError("Sign in to view announcements.");
                return;
            }

            console.error("Could not check the current user:", error);
            showError("Unable to check your sign-in.");
            return;
        }

        if (!data.user) {
            showError("Sign in to view announcements.");
            return;
        }

        currentUser = data.user;

        await loadAnnouncements();
    }

    // =====================================
    // UI
    // =====================================

    function createNotificationUI() {
        if (document.getElementById("fuban-notification")) return;

        const wrapper = document.createElement("div");
        wrapper.id = "fuban-notification";

        wrapper.innerHTML = `
            <button
                id="notification-bell"
                class="fuban-notification-bell"
                aria-label="Notifications"
                title="Announcements"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>
                    <path d="M10 21h4"></path>
                </svg>
                <span id="notification-count" hidden>0</span>
            </button>

            <section
                id="notification-panel"
                class="fuban-notification-panel"
                hidden
            >
                <header class="notification-header">
                    <h2>Announcements</h2>
                    <button id="notification-close">×</button>
                </header>

                <div id="notification-list">
                    <p>Loading announcements...</p>
                </div>

                <div id="notification-admin-area" hidden>
                    <button id="notification-create">
                        + Create Announcement
                    </button>
                </div>
            </section>

            <section
                id="announcement-editor"
                class="announcement-editor"
                hidden
            >
                <h2>Create Announcement</h2>

                <form id="announcement-form">
                    <label for="announcement-title">Title</label>
                    <input
                        id="announcement-title"
                        type="text"
                        maxlength="150"
                        required
                    >

                    <label for="announcement-type">Category</label>
                    <select id="announcement-type">
                        <option value="feature">Feature</option>
                        <option value="bug_fix">Bug Fix</option>
                        <option value="improvement">Improvement</option>
                        <option value="maintenance">Maintenance</option>
                    </select>

                    <label for="announcement-content">Details</label>
                    <textarea
                        id="announcement-content"
                        rows="6"
                        maxlength="10000"
                        required
                    ></textarea>

                    <div class="announcement-editor-actions">
                        <button type="button" id="announcement-cancel">
                            Cancel
                        </button>

                        <button type="submit" data-status="draft">
                            Save Draft
                        </button>

                        <button type="submit" data-status="published">
                            Publish
                        </button>
                    </div>
                </form>
            </section>
        `;

        const headerActions = document.querySelector(".header-actions");
        if (headerActions) {
            wrapper.classList.add("fuban-notification-header-item");
            headerActions.prepend(wrapper);
        } else {
            document.body.appendChild(wrapper);
        }

        document.getElementById("notification-bell")
            .addEventListener("click", togglePanel);

        document.getElementById("notification-close")
            .addEventListener("click", togglePanel);

        document.getElementById("notification-create")
            .addEventListener("click", openEditor);

        document.getElementById("announcement-cancel")
            .addEventListener("click", closeEditor);

        document.getElementById("announcement-form")
            .addEventListener("submit", saveAnnouncement);

        if (currentUser?.email?.toLowerCase() === ADMIN_EMAIL) {
            document.getElementById("notification-admin-area").hidden = false;
        }
    }

    // =====================================
    // LOAD ANNOUNCEMENTS
    // =====================================

    async function loadAnnouncements() {
        const { data, error } = await db
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Announcement loading failed:", error);
            showError("Unable to load announcements.");
            return;
        }

        announcements = data || [];

        const { data: reads, error: readError } = await db
            .from("announcement_reads")
            .select("announcement_id")
            .eq("user_id", currentUser.id);

        if (readError) {
            console.error("Read status loading failed:", readError);
            return;
        }

        const readIds = new Set(
            (reads || []).map(item => item.announcement_id)
        );

        const visibleAnnouncements = announcements.filter(item =>
            item.status === "published" ||
            currentUser.email?.toLowerCase() === ADMIN_EMAIL
        );

        unreadCount = visibleAnnouncements.filter(item =>
            item.status === "published" && !readIds.has(item.id)
        ).length;

        renderAnnouncements(visibleAnnouncements, readIds);
        updateBadge();
    }

    // =====================================
    // RENDER
    // =====================================

    function renderAnnouncements(items, readIds) {
        const list = document.getElementById("notification-list");

        if (!items.length) {
            list.innerHTML = "<p>No announcements yet.</p>";
            return;
        }

        list.replaceChildren();

        items.forEach(item => {
            const article = document.createElement("article");
            article.className = "announcement-item";

            const title = document.createElement("h3");
            title.textContent = item.title;

            const category = document.createElement("small");
            category.textContent = item.type.replace("_", " ").toUpperCase();

            const content = document.createElement("p");
            content.textContent = item.content;

            const date = document.createElement("small");
            date.textContent = new Date(item.created_at).toLocaleDateString();

            article.append(title, category, content, date);

            if (item.status === "draft") {
                const draft = document.createElement("small");
                draft.textContent = "DRAFT";
                article.appendChild(draft);
            } else if (readIds.has(item.id)) {
                const read = document.createElement("small");
                read.textContent = "READ";
                article.appendChild(read);
            } else {
                const markRead = document.createElement("button");
                markRead.textContent = "Mark as read";
                markRead.addEventListener("click", () => markAsRead(item.id));
                article.appendChild(markRead);
            }

            list.appendChild(article);
        });
    }

    // =====================================
    // READ STATUS
    // =====================================

    async function markAsRead(id) {
        const { error } = await db
            .from("announcement_reads")
            .upsert({
                announcement_id: id,
                user_id: currentUser.id
            }, {
                onConflict: "announcement_id,user_id"
            });

        if (error) {
            console.error(error);
            return;
        }

        await loadAnnouncements();
    }

    // =====================================
    // ADMIN: SAVE
    // =====================================

    async function saveAnnouncement(event) {
        event.preventDefault();

        if (currentUser.email?.toLowerCase() !== ADMIN_EMAIL) {
            alert("Admin permission required.");
            return;
        }

        const submitter = event.submitter;
        const status = submitter?.dataset.status;

        if (!["draft", "published"].includes(status)) return;

        const title = document.getElementById("announcement-title").value.trim();
        const content = document.getElementById("announcement-content").value.trim();
        const type = document.getElementById("announcement-type").value;

        if (!title || !content) return;

        const payload = {
            title,
            content,
            type,
            status,
            created_by: currentUser.id,
            updated_at: new Date().toISOString(),
            published_at: status === "published"
                ? new Date().toISOString()
                : null
        };

        submitter.disabled = true;

        const { error } = await db
            .from("announcements")
            .insert(payload);

        submitter.disabled = false;

        if (error) {
            console.error("Announcement save failed:", error);
            alert("Could not save announcement: " + error.message);
            return;
        }

        closeEditor();
        document.getElementById("announcement-form").reset();

        await loadAnnouncements();

        alert(status === "published"
            ? "Announcement published!"
            : "Draft saved!");
    }

    // =====================================
    // PANEL CONTROLS
    // =====================================

    function togglePanel() {
        const panel = document.getElementById("notification-panel");
        panel.hidden = !panel.hidden;
    }

    function openEditor() {
        document.getElementById("announcement-editor").hidden = false;
    }

    function closeEditor() {
        document.getElementById("announcement-editor").hidden = true;
    }

    function updateBadge() {
        const badge = document.getElementById("notification-count");

        badge.textContent = unreadCount;
        badge.hidden = unreadCount === 0;
    }

    function showError(message) {
        const list = document.getElementById("notification-list");
        if (list) list.textContent = message;
    }

    // =====================================
    // START
    // =====================================

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }

    window.FubanAnnouncements = {
        refresh: loadAnnouncements
    };
})();
