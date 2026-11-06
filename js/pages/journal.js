/* =====================================================
   FUBAN OS — JOURNAL
   Version 5.0

   FEATURES
   - Binder Clip Page Selection
   - Two-page / Free Page Groups
   - Direct Writing (No Text Boxes)
   - 20 Visible Writing Lines
   - Page-level Font / Size / Color
   - Highlight + Right-click Text Formatting
   - Stable Image Drag / Resize / Delete
   - Shared Mood / Weather by Date
   - Dashboard Wallpaper Sync
   - Autosave + Legacy Data Migration
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* =================================================
       1. DOM ELEMENTS
    ================================================= */

    const $ = (id) => document.getElementById(id);

    const background = $("journal-background");

    const saveIndicator = $("save-indicator");
    const saveStatus = $("save-status");

    const sidebar = $("journal-sidebar");

    const binderButton = $("binder-clip-button");
    const selectionLabel = $("selection-mode-label");
    const touchTextFormatButton = $("touch-text-format-button");

    const notebookBook = $("notebook-book");
    const freeBook = $("free-book");
    const notebookSpine = $("notebook-spine");

    const leftPageElement = $("left-page");
    const rightPageElement = $("right-page");
    const freePageElement = $("free-page");

    const leftWriting = $("left-writing");
    const rightWriting = $("right-writing");
    const freeWriting = $("free-writing");

    const leftImages = $("left-images");
    const rightImages = $("right-images");
    const freeImages = $("free-images");

    const propertiesPanel = $("page-properties-panel");

    const pageTitleInput = $("page-title");
    const pageDateInput = $("page-date");

    const moodInput = $("journal-mood");
    const weatherInput = $("journal-weather");

    const pageFontInput = $("page-font");
    const pageFontSizeInput = $("page-font-size");
    const pageTextColorInput = $("page-text-color");

    const selectedPageLabel = $("selected-page-label");
    const currentPageLabel = $("current-page-label");
    const pageCountLabel = $("page-count");

    const previousButton = $("previous-spread");
    const nextButton = $("next-spread");

    const addPageButton = $("add-page-button");
    const addPageMenu = $("add-page-menu");
    const addTwoPageButton = $("add-two-page");
    const addFreePageButton = $("add-free-page");

    const imageButton = $("image-tool");
    const imageUpload = $("image-upload");

    const imageToolbar = $("image-toolbar");
    const deleteImageButton = $("delete-image");

    const paperColorInput = $("paper-color");
    const paperColorValue = $("paper-color-value");

    const imageToolbarDelete = deleteImageButton;


    /* =================================================
       2. CONFIGURATION
    ================================================= */

    const STORAGE_KEY = "fuban_journal_v5";

    const LEGACY_STORAGE_KEYS = [
        "fuban_journal_v4",
        "fuban_journal_v3",
        "fuban_journal_v2",
        "fuban_journal_data"
    ];

    const WALLPAPER_KEY = "fuban_dashboard_wallpaper";
    const DARKNESS_KEY = "fuban_dashboard_wallpaper_opacity";

    const PAPER_CLASSES = {
        lined: "lined-paper",
        "dot-grid": "dot-grid-paper",
        grid: "grid-paper",
        blank: "blank-paper"
    };

    const FONT_OPTIONS = [
        "Sarabun",
        "UID Space",
        "Alice"
    ];

    const FONT_SIZES = [
        12, 14, 16, 18, 20, 22, 24, 28, 32
    ];


    /* =================================================
       3. STATE
    ================================================= */

    let journalData = createDefaultJournal();

    let currentSpreadIndex = 0;

    let selectionMode = false;

    let activePageId = null;

    let selectedImageId = null;
    let selectedImagePageId = null;

    let saveTimer = null;

    let savedTextRange = null;
    let activeWritingArea = null;


    /* =================================================
       4. ID GENERATOR
    ================================================= */

    function createId() {

        if (window.crypto?.randomUUID) {
            return crypto.randomUUID();
        }

        return (
            "journal-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 10)
        );

    }


    /* =================================================
       5. DATA STRUCTURES
    ================================================= */

    function createDefaultPage() {

        return {
            id: createId(),

            title: "",
            date: "",

            paperStyle: "lined",
            paperColor: "#fffefa",

            content: "",

            font: "Sarabun",
            fontSize: 16,
            textColor: "#222222",

            images: [],
            stickers: []

        };

    }


    function createDefaultSpread() {

        return {
            id: createId(),

            layout: "two-page",

            pages: [
                createDefaultPage(),
                createDefaultPage()
            ]
        };

    }


    function createDefaultJournal() {

        return {
            version: 5,

            spreads: [
                createDefaultSpread()
            ],

            currentSpreadIndex: 0,

            dailyRecords: {}
        };

    }


    /* =================================================
       6. SANITIZE RICH TEXT
       Preserve formatting without keeping unsafe HTML.
    ================================================= */

    function sanitizeRichContent(html) {

        const container = document.createElement("div");

        container.innerHTML = String(html || "");

        const allowedTags = new Set([
            "SPAN",
            "BR",
            "DIV",
            "P",
            "B",
            "STRONG",
            "I",
            "EM",
            "U"
        ]);

        const allowedStyles = [
            "font-family",
            "font-size",
            "color",
            "font-weight",
            "font-style",
            "text-decoration"
        ];

        function cleanNode(node) {

            if (node.nodeType === Node.TEXT_NODE) {
                return document.createTextNode(node.nodeValue);
            }

            if (node.nodeType !== Node.ELEMENT_NODE) {
                return document.createDocumentFragment();
            }

            const tag = node.tagName;

            if (
                [
                    "SCRIPT",
                    "STYLE",
                    "IFRAME",
                    "OBJECT",
                    "EMBED",
                    "SVG",
                    "VIDEO",
                    "AUDIO"
                ].includes(tag)
            ) {
                return document.createDocumentFragment();
            }

            // Unwrap unsupported elements but preserve their text.
            if (!allowedTags.has(tag)) {

                const fragment = document.createDocumentFragment();

                Array.from(node.childNodes).forEach(child => {
                    fragment.appendChild(cleanNode(child));
                });

                return fragment;

            }

            const output = document.createElement(
                tag.toLowerCase()
            );

            if (tag === "SPAN") {

                allowedStyles.forEach(property => {

                    const value = node.style.getPropertyValue(property);

                    if (
                        value &&
                        !/url\s*\(|expression\s*\(|javascript:|<|>/i.test(value)
                    ) {

                        output.style.setProperty(
                            property,
                            value
                        );

                    }

                });

            }

            Array.from(node.childNodes).forEach(child => {
                output.appendChild(cleanNode(child));
            });

            return output;

        }

        const result = document.createElement("div");

        Array.from(container.childNodes).forEach(child => {
            result.appendChild(cleanNode(child));
        });

        return result.innerHTML;

    }


    /* =================================================
       7. LEGACY IMAGE MIGRATION
    ================================================= */

    function normalizeLegacyImage(image) {

        const oldX = Number(image.x ?? 40);
        const oldY = Number(image.y ?? 40);

        const oldWidth = Number(image.width ?? 200);
        const oldHeight = Number(image.height ?? 150);

        const x = oldX > 1 ? oldX / 500 : oldX;
        const y = oldY > 1 ? oldY / 600 : oldY;

        const width =
            oldWidth > 1 ? oldWidth / 500 : oldWidth;

        const height =
            oldHeight > 1 ? oldHeight / 600 : oldHeight;

        return {
            id: image.id || createId(),

            src: image.src || "",

            x: Math.max(0, Math.min(0.9, x)),
            y: Math.max(0, Math.min(0.9, y)),

            width: Math.max(0.08, Math.min(1, width)),
            height: Math.max(0.08, Math.min(1, height)),

            aspectRatio:
                Number(image.aspectRatio) > 0
                    ? Number(image.aspectRatio)
                    : oldWidth / Math.max(oldHeight, 1)
        };

    }


    /* =================================================
       8. LEGACY PAGE MIGRATION
    ================================================= */

    function normalizeLegacyPage(oldPage = {}) {

        if (!oldPage || typeof oldPage !== "object") {
            oldPage = {};
        }

        let content = "";
        const images = [];

        // Recover old content.
        if (typeof oldPage.content === "string") {

            if (oldPage.content.includes("<")) {

                const parser = new DOMParser();

                const doc = parser.parseFromString(
                    oldPage.content,
                    "text/html"
                );

                content = doc.body.innerText || "";

                doc.querySelectorAll("img").forEach(img => {

                    if (img.src) {

                        images.push({
                            id: createId(),
                            src: img.src,
                            x: 0.08,
                            y: 0.08,
                            width: 0.42,
                            height: 0.3,
                            aspectRatio: 1.4
                        });

                    }

                });

            } else {

                content = oldPage.content;

            }

        }

        // Recover old object arrays.
        const oldObjects = Array.isArray(oldPage.objects)
            ? oldPage.objects
            : [];

        oldObjects.forEach(object => {

            if (object.type === "text") {

                const text = object.content || object.text || "";

                if (text.trim()) {
                    content += (content ? "\n" : "") + text;
                }

            }

            if (
                object.type === "image" ||
                object.type === "sticker"
            ) {

                if (object.src) {
                    images.push(normalizeLegacyImage(object));
                }

            }

        });


        // Recover old image arrays.
        const oldImages = Array.isArray(oldPage.images)
            ? oldPage.images
            : [];

        oldImages.forEach(image => {

            if (image.src) {
                images.push(normalizeLegacyImage(image));
            }

        });


        return {

            id: oldPage.id || createId(),

            title: oldPage.title || "",

            date: oldPage.date || "",

            paperStyle:
                oldPage.paperStyle ||
                oldPage.paper ||
                "lined",

            paperColor:
                oldPage.paperColor ||
                oldPage.color ||
                "#fffefa",

            content: content,

            font: oldPage.font || "Sarabun",

            fontSize: Number(
                oldPage.fontSize || oldPage.size || 16
            ),

            textColor:
                oldPage.textColor ||
                oldPage.colorText ||
                "#222222",

            images: images,

            stickers: Array.isArray(oldPage.stickers)
                ? oldPage.stickers
                : []

        };

    }


    /* =================================================
       9. DATA MIGRATION
    ================================================= */

    function migrateJournalData(oldData) {

        const result = createDefaultJournal();

        if (!oldData || typeof oldData !== "object") {
            return result;
        }


        result.dailyRecords =
            oldData.dailyRecords &&
            typeof oldData.dailyRecords === "object"
                ? { ...oldData.dailyRecords }
                : {};


        function migrateDailyData(page) {

            if (!page.date) return;

            if (!result.dailyRecords[page.date]) {

                result.dailyRecords[page.date] = {
                    mood: page.mood || "",
                    weather: page.weather || ""
                };

            }

        }


        // Existing spread structure.
        if (Array.isArray(oldData.spreads)) {

            result.spreads = oldData.spreads.map(spread => {

                const layout = spread.layout === "free"
                    ? "free"
                    : "two-page";

                let pages = (spread.pages || []).map(page => {

                    const normalized = normalizeLegacyPage(page);

                    migrateDailyData(page);

                    return normalized;

                });

                if (layout === "free") {

                    pages = [pages[0] || createDefaultPage()];

                } else {

                    while (pages.length < 2) {
                        pages.push(createDefaultPage());
                    }

                    pages = pages.slice(0, 2);

                }

                return {
                    id: spread.id || createId(),
                    layout,
                    pages
                };

            }).filter(spread => spread.pages.length > 0);

        }

        // Older flat-page structure.
        else if (
            Array.isArray(oldData.pages) &&
            oldData.pages.length > 0
        ) {

            const pages = oldData.pages.map(page => {

                migrateDailyData(page);

                return normalizeLegacyPage(page);

            });


            if (oldData.layout === "free") {

                result.spreads = pages.map(page => ({

                    id: createId(),

                    layout: "free",

                    pages: [page]

                }));

            } else {

                result.spreads = [];

                for (let index = 0; index < pages.length; index += 2) {

                    const pair = pages.slice(index, index + 2);

                    while (pair.length < 2) {
                        pair.push(createDefaultPage());
                    }

                    result.spreads.push({

                        id: createId(),

                        layout: "two-page",

                        pages: pair

                    });

                }

            }

        }


        if (result.spreads.length === 0) {
            result.spreads = [createDefaultSpread()];
        }


        result.currentSpreadIndex = Math.max(
            0,
            Math.min(
                Number(oldData.currentSpreadIndex || 0),
                result.spreads.length - 1
            )
        );


        return result;

    }


    /* =================================================
       10. LOAD DATA
    ================================================= */

    function loadJournal() {

        const keys = [
            STORAGE_KEY,
            ...LEGACY_STORAGE_KEYS
        ];

        for (const key of keys) {

            try {

                const saved = localStorage.getItem(key);

                if (!saved) continue;

                const parsed = JSON.parse(saved);

                journalData = migrateJournalData(parsed);

                // Save using the new format without deleting old storage.
                if (key !== STORAGE_KEY) {
                    saveJournal();
                }

                return;

            } catch (error) {

                console.error(
                    `Could not load ${key}:`,
                    error
                );

            }

        }

        journalData = createDefaultJournal();

    }


    /* =================================================
       11. SAVE SYSTEM
    ================================================= */

    function setSaveStatus(message, state = "saved") {

        const colors = {
            saved: "#7ED957",
            saving: "#FFBD59",
            error: "#FF6B6B"
        };

        saveStatus.textContent = message;

        saveIndicator.style.background =
            colors[state] || colors.saved;

    }


    function saveJournal() {

        clearTimeout(saveTimer);

        setSaveStatus("Saving...", "saving");

        saveTimer = setTimeout(() => {

            try {

                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify(journalData)
                );
                window.FubanSystemAchievements?.refresh();

                setSaveStatus(
                    "All changes saved",
                    "saved"
                );

            } catch (error) {

                console.error("Journal storage error:", error);

                setSaveStatus(
                    "Storage full — unable to save",
                    "error"
                );

            }

        }, 400);

    }


    /* =================================================
       12. FLUSH SAVE
    ================================================= */

    function flushSave() {

        clearTimeout(saveTimer);

        try {

            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(journalData)
            );
            window.FubanSystemAchievements?.refresh();

        } catch (error) {

            console.error("Journal final save failed:", error);

        }

    }


    /* =================================================
       13. DASHBOARD WALLPAPER SYNC
    ================================================= */

    function resolveWallpaper(value) {

        if (!value) return "";

        let path = String(value).trim();

        if (
            path === "none" ||
            path === "default"
        ) {
            return "";
        }

        // Support values stored as CSS url(...).
        const urlMatch = path.match(/^url\(["']?(.*?)["']?\)$/i);

        if (urlMatch) {
            path = urlMatch[1];
        }

        if (
            path.startsWith("data:") ||
            path.startsWith("blob:") ||
            path.startsWith("http://") ||
            path.startsWith("https://") ||
            path.startsWith("/")
        ) {
            return path;
        }

        if (
            path.startsWith("assets/") ||
            path.startsWith("./assets/")
        ) {
            return path;
        }

        return `assets/wallpapers/${path}`;

    }


    function syncDashboardWallpaper() {

        const wallpaper = localStorage.getItem(WALLPAPER_KEY) ||
            (document.documentElement.dataset.theme === "dark"
                ? "assets/wallpapers/1403447.jpg"
                : null);

        const savedDarkness =
            localStorage.getItem(DARKNESS_KEY);


        const resolved = resolveWallpaper(wallpaper);

        background.style.backgroundImage = resolved
            ? `url("${resolved.replace(/"/g, '\\"')}")`
            : "none";


        let darkness = 0.35;

        if (savedDarkness !== null) {

            const value = Number(savedDarkness);

            if (Number.isFinite(value)) {

                darkness = value > 1
                    ? value / 100
                    : value;

            }

        }

        darkness = Math.max(0, Math.min(1, darkness));

        background.style.setProperty(
            "--journal-darkness",
            String(darkness)
        );

    }


    syncDashboardWallpaper();

    window.addEventListener("fuban:theme-change", syncDashboardWallpaper);
    window.addEventListener("focus", syncDashboardWallpaper);
    window.addEventListener("pageshow", syncDashboardWallpaper);

    window.addEventListener("storage", event => {

        if (
            event.key === WALLPAPER_KEY ||
            event.key === DARKNESS_KEY ||
            event.key === "fuban_settings_v1"
        ) {

            syncDashboardWallpaper();

        }

    });


    /* =================================================
       14. CURRENT SPREAD / PAGE HELPERS
    ================================================= */

    function getCurrentSpread() {

        return journalData.spreads[currentSpreadIndex] || null;

    }


    function getActivePage() {

        if (!selectionMode || !activePageId) return null;

        for (const spread of journalData.spreads) {

            const page = spread.pages.find(item => {
                return item.id === activePageId;
            });

            if (page) return page;

        }

        return null;

    }


    function findPageById(pageId) {

        for (const spread of journalData.spreads) {

            const page = spread.pages.find(item => {
                return item.id === pageId;
            });

            if (page) return page;

        }

        return null;

    }


    function getPageNumber(pageId) {

        let number = 0;

        for (const spread of journalData.spreads) {

            for (const page of spread.pages) {

                number++;

                if (page.id === pageId) {
                    return number;
                }

            }

        }

        return 0;

    }


    function getCurrentVisiblePages() {

        const spread = getCurrentSpread();

        return spread?.pages || [];

    }


    /* =================================================
       15. PAGE ELEMENT LOOKUP
    ================================================= */

    function getPageElement(pageId) {

        return Array.from(
            document.querySelectorAll(".notebook-page")
        ).find(element => {
            return element.dataset.pageId === pageId;
        }) || null;

    }


    function getWritingArea(pageId) {

        return Array.from(
            document.querySelectorAll(".page-writing-area")
        ).find(element => {
            return element.dataset.pageId === pageId;
        }) || null;

    }


    function getImageLayer(pageId) {

        return Array.from(
            document.querySelectorAll(".page-image-layer")
        ).find(element => {
            return element.dataset.pageId === pageId;
        }) || null;

    }


    /* =================================================
       16. SHARED DAILY RECORD
    ================================================= */

    function getDailyRecord(date) {

        if (!date) return null;

        return journalData.dailyRecords[date] || null;

    }


    function createDailyRecord(date) {

        if (!date) return null;

        if (!journalData.dailyRecords[date]) {

            journalData.dailyRecords[date] = {
                mood: "",
                weather: ""
            };

        }

        return journalData.dailyRecords[date];

    }


    /* =================================================
       17. PAGE COUNTER
    ================================================= */

    function updatePageCounter() {

        let totalPages = 0;

        journalData.spreads.forEach(spread => {
            totalPages += spread.pages.length;
        });

        pageCountLabel.textContent =
            `${totalPages} ${totalPages === 1 ? "page" : "pages"}`;


        const spread = getCurrentSpread();

        if (!spread) return;

        const firstNumber = getPageNumber(
            spread.pages[0]?.id
        );

        if (spread.layout === "free") {

            currentPageLabel.textContent =
                `Viewing Page ${String(firstNumber).padStart(2, "0")}`;

        } else {

            const secondNumber = spread.pages[1]
                ? getPageNumber(spread.pages[1].id)
                : firstNumber;

            currentPageLabel.textContent =
                `Viewing Pages ${String(firstNumber).padStart(2, "0")}–${String(secondNumber).padStart(2, "0")}`;

        }


        if (activePageId) {

            const page = getActivePage();

            if (page) {

                currentPageLabel.textContent =
                    `Current Page ${String(getPageNumber(page.id)).padStart(2, "0")} — ${page.title || "Untitled Page"}`;

            }

        }

        previousButton.disabled = currentSpreadIndex <= 0;

        nextButton.disabled =
            currentSpreadIndex >= journalData.spreads.length - 1;

    }


    /* =================================================
       18. PAGE WRITING STYLE
    ================================================= */

    function applyWritingStyle(page, writingArea) {

        writingArea.style.fontFamily =
            `"${page.font || "Sarabun"}", sans-serif`;

        writingArea.style.fontSize =
            `${page.fontSize || 16}px`;

        writingArea.style.color =
            page.textColor || "#222222";

    }


    /* =================================================
       19. PAGE PAPER STYLE
    ================================================= */

    function applyPaperStyle(page, pageElement) {

        pageElement.classList.remove(
            "lined-paper",
            "dot-grid-paper",
            "grid-paper",
            "blank-paper",
            "page-hover",
            "page-active",
            "page-selectable"
        );

        pageElement.classList.add(
            PAPER_CLASSES[page.paperStyle] || "lined-paper"
        );

        pageElement.style.backgroundColor =
            page.paperColor || "#fffefa";

    }


    /* =================================================
       20. RENDER IMAGE OBJECTS
    ================================================= */

    function renderImages(page, layer) {

        layer.innerHTML = "";

        layer.dataset.pageId = page.id;

        page.images.forEach(imageData => {

            const wrapper = document.createElement("div");

            wrapper.className = "journal-image-object";

            wrapper.dataset.imageId = imageData.id;
            wrapper.dataset.pageId = page.id;

            wrapper.style.left =
                `${imageData.x * 100}%`;

            wrapper.style.top =
                `${imageData.y * 100}%`;

            wrapper.style.width =
                `${imageData.width * 100}%`;

            wrapper.style.height =
                `${imageData.height * 100}%`;


            const image = document.createElement("img");

            image.src = imageData.src;
            image.alt = "Journal image";
            image.draggable = false;

            wrapper.appendChild(image);


            const resizeHandle = document.createElement("span");

            resizeHandle.className = "image-resize-handle";

            wrapper.appendChild(resizeHandle);


            const active =
                selectionMode &&
                activePageId === page.id;

            wrapper.style.pointerEvents =
                active ? "auto" : "none";


            if (
                selectedImageId === imageData.id &&
                selectedImagePageId === page.id
            ) {

                wrapper.classList.add("selected");

            }


            wrapper.addEventListener("pointerdown", event => {

                if (!active) return;

                event.preventDefault();
                event.stopPropagation();

                selectImage(page.id, imageData.id);

                if (event.target === resizeHandle) {

                    startImageResize(
                        event,
                        wrapper,
                        layer,
                        imageData
                    );

                } else {

                    startImageDrag(
                        event,
                        wrapper,
                        layer,
                        imageData
                    );

                }

            });


            layer.appendChild(wrapper);

        });

    }


    /* =================================================
       21. RENDER ONE PAGE
    ================================================= */

    function renderOnePage(
        page,
        pageElement,
        writingArea,
        imageLayer
    ) {

        if (!page) {

            pageElement.hidden = true;

            pageElement.removeAttribute("data-page-id");

            writingArea.innerHTML = "";
            imageLayer.innerHTML = "";

            writingArea.contentEditable = "false";

            return;

        }


        pageElement.hidden = false;

        pageElement.dataset.pageId = page.id;

        writingArea.dataset.pageId = page.id;

        imageLayer.dataset.pageId = page.id;


        applyPaperStyle(page, pageElement);

        applyWritingStyle(page, writingArea);


        writingArea.innerHTML = sanitizeRichContent(
            page.content || ""
        );


        writingArea.contentEditable =
            selectionMode && activePageId === page.id
                ? "true"
                : "false";


        pageElement.classList.toggle(
            "page-active",
            selectionMode && activePageId === page.id
        );

        pageElement.classList.toggle(
            "page-selectable",
            selectionMode
        );


        renderImages(page, imageLayer);

    }


    /* =================================================
       22. RENDER CURRENT SPREAD
    ================================================= */

    function renderPages() {

        const spread = getCurrentSpread();

        if (!spread) return;


        const isFree = spread.layout === "free";

        notebookBook.hidden = isFree;

        freeBook.hidden = !isFree;


        if (isFree) {

            notebookBook.hidden = true;

            freeBook.hidden = false;

            renderOnePage(
                spread.pages[0],
                freePageElement,
                freeWriting,
                freeImages
            );

        } else {

            freeBook.hidden = true;

            notebookBook.hidden = false;


            renderOnePage(
                spread.pages[0],
                leftPageElement,
                leftWriting,
                leftImages
            );


            renderOnePage(
                spread.pages[1] || null,
                rightPageElement,
                rightWriting,
                rightImages
            );

            notebookSpine.hidden = false;

        }


        updatePageCounter();

        renderAllVisibleStickers();

    }


    /* =================================================
       23. UPDATE RIGHT PROPERTIES PANEL
    ================================================= */

    function updatePropertiesPanel() {

        const page = getActivePage();

        const controls = [
            pageTitleInput,
            pageDateInput,
            pageFontInput,
            pageFontSizeInput,
            pageTextColorInput,
            paperColorInput
        ];


        if (!page) {

            propertiesPanel.hidden = true;

            document.body.classList.remove(
                "has-page-selection"
            );

            controls.forEach(control => {
                control.disabled = true;
            });

            moodInput.disabled = true;
            weatherInput.disabled = true;

            return;

        }


        propertiesPanel.hidden = false;

        document.body.classList.add(
            "has-page-selection"
        );


        // Enable page-level controls.
        controls.forEach(control => {
            control.disabled = false;
        });


        selectedPageLabel.textContent =
            `Page ${String(getPageNumber(page.id)).padStart(2, "0")}`;


        pageTitleInput.value = page.title || "";

        pageDateInput.value = page.date || "";


        // Mood and weather belong to the date, not to the page.
        const record = getDailyRecord(page.date);

        moodInput.value = record?.mood || "";
        weatherInput.value = record?.weather || "";

        moodInput.disabled = !page.date;
        weatherInput.disabled = !page.date;


        pageFontInput.value = page.font || "Sarabun";

        pageFontSizeInput.value =
            String(page.fontSize || 16);

        pageTextColorInput.value =
            page.textColor || "#222222";


        paperColorInput.value =
            page.paperColor || "#fffefa";

        paperColorValue.textContent =
            (page.paperColor || "#fffefa").toUpperCase();


        document.querySelectorAll(".paper-option").forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.paper === page.paperStyle
            );

        });

    }


    /* =================================================
       24. SIDEBAR ENABLE / DISABLE
    ================================================= */

    function updateSidebarState() {

        const enabled = Boolean(getActivePage());

        imageButton.disabled = !enabled;

        paperColorInput.disabled = !enabled;

        document.querySelectorAll(
            ".paper-option, .sticker-category"
        ).forEach(button => {

            button.disabled = !enabled;

        });

        updateStickerSidebarState();
        updateTextFormatButtonState();

    }


    /* =================================================
       25. IMAGE SELECTION CLEAR
    ================================================= */

    function clearImageSelection() {

        selectedImageId = null;
        selectedImagePageId = null;

        document.querySelectorAll(
            ".journal-image-object.selected"
        ).forEach(element => {

            element.classList.remove("selected");

        });

        imageToolbar.hidden = true;

    }


    /* =================================================
       26. PAGE SELECTION
    ================================================= */

    function selectPage(pageId) {

        if (!selectionMode) return;

        const page = findPageById(pageId);

        if (!page) return;


        if (activePageId === pageId) {

            updatePropertiesPanel();

            return;

        }


        clearImageSelection();

        activePageId = pageId;


        // Close any text selection menu when changing pages.
        closeTextSelectionMenu();


        renderPages();

        updatePropertiesPanel();

        updateSidebarState();

    }


    /* =================================================
       27. BINDER CLIP TOGGLE
    ================================================= */

    binderButton.addEventListener("click", () => {

        selectionMode = !selectionMode;


        if (!selectionMode) {

            activePageId = null;

            clearImageSelection();

            closeTextSelectionMenu();

        }


        binderButton.classList.toggle(
            "active",
            selectionMode
        );

        binderButton.setAttribute(
            "aria-pressed",
            String(selectionMode)
        );


        selectionLabel.textContent = selectionMode
            ? "Click a page to select it"
            : "Click the clip to select a page";


        renderPages();

        updatePropertiesPanel();

        updateSidebarState();

    });


    /* =================================================
       28. PAGE HOVER EFFECT
    ================================================= */

    function bindPageHover(container) {

        container.addEventListener("pointerover", event => {

            if (!selectionMode) return;

            const pageElement = event.target.closest(".notebook-page");

            if (!pageElement || pageElement.hidden) return;

            pageElement.classList.add("page-hover");

        });


        container.addEventListener("pointerout", event => {

            const pageElement = event.target.closest(".notebook-page");

            if (!pageElement) return;

            if (!pageElement.contains(event.relatedTarget)) {

                pageElement.classList.remove("page-hover");

            }

        });

    }


    bindPageHover(notebookBook);

    bindPageHover(freeBook);


    /* =================================================
       29. PAGE CLICK
    ================================================= */

    function handlePageClick(event) {

        const pageElement = event.target.closest(".notebook-page");

        if (!pageElement || !selectionMode) return;

        if (event.target.closest(".journal-image-object")) return;

        const pageId = pageElement.dataset.pageId;

        if (!pageId) return;

        selectPage(pageId);

    }


    notebookBook.addEventListener("click", handlePageClick);

    freeBook.addEventListener("click", handlePageClick);


    /* =================================================
       30. DIRECT WRITING
       No text box objects.
    ================================================= */

    function bindWritingArea(element) {

        element.addEventListener("input", () => {

            const pageId = element.dataset.pageId;

            if (!pageId) return;

            if (
                !selectionMode ||
                pageId !== activePageId
            ) {
                return;
            }


            const page = findPageById(pageId);

            if (!page) return;


            page.content = sanitizeRichContent(
                element.innerHTML
            );

            saveJournal();

        });


        // Desktop uses right-click; touch devices use the Format text button.
        element.addEventListener("contextmenu", event => {

            showTextSelectionMenu(event, element);

        });


        element.addEventListener("keydown", event => {

            // Tab inserts spaces instead of leaving the writing area.
            if (event.key === "Tab") {

                event.preventDefault();

                document.execCommand(
                    "insertText",
                    false,
                    "    "
                );

            }

        });

    }


    bindWritingArea(leftWriting);

    bindWritingArea(rightWriting);

    bindWritingArea(freeWriting);


    /* =================================================
       31. PAGE TITLE AND DATE
    ================================================= */

    pageTitleInput.addEventListener("input", () => {

        const page = getActivePage();

        if (!page) return;

        page.title = pageTitleInput.value;

        updatePageCounter();

        saveJournal();

    });


    pageDateInput.addEventListener("change", () => {

        const page = getActivePage();

        if (!page) return;

        // Date belongs to this page only.
        page.date = pageDateInput.value || "";

        // A different date uses that date's own daily record.
        updatePropertiesPanel();

        saveJournal();

    });


    /* =================================================
       32. SHARED MOOD / WEATHER BY DATE
    ================================================= */

    function updateDailyRecord(field, value) {

        const page = getActivePage();

        if (!page || !page.date) return;

        const record = journalData.dailyRecords[page.date] || {
            mood: "",
            weather: ""
        };

        record[field] = value;

        journalData.dailyRecords[page.date] = record;

        saveJournal();

    }


    moodInput.addEventListener("change", () => {

        updateDailyRecord(
            "mood",
            moodInput.value
        );

    });


    weatherInput.addEventListener("change", () => {

        updateDailyRecord(
            "weather",
            weatherInput.value
        );

    });


    /* =================================================
       33. PAGE-WIDE FONT / SIZE / COLOR
    ================================================= */

    function changePageWritingStyle(property, value) {

        const page = getActivePage();

        if (!page) return;

        page[property] = value;


        const writingArea = getWritingArea(page.id);

        if (writingArea) {

            applyWritingStyle(page, writingArea);

        }

        saveJournal();

    }


    pageFontInput.addEventListener("change", () => {

        changePageWritingStyle(
            "font",
            FONT_OPTIONS.includes(pageFontInput.value)
                ? pageFontInput.value
                : "Sarabun"
        );

    });


    pageFontSizeInput.addEventListener("change", () => {

        const size = Number(pageFontSizeInput.value);

        if (!FONT_SIZES.includes(size)) return;

        changePageWritingStyle("fontSize", size);

    });


    pageTextColorInput.addEventListener("input", () => {

        changePageWritingStyle(
            "textColor",
            pageTextColorInput.value
        );

    });


    /* =================================================
       34. PAPER STYLE
    ================================================= */

    document.querySelectorAll(".paper-option").forEach(button => {

        button.addEventListener("click", () => {

            const page = getActivePage();

            if (!page) return;

            const style = button.dataset.paper;

            if (!PAPER_CLASSES[style]) return;

            page.paperStyle = style;

            const pageElement = getPageElement(page.id);

            if (pageElement) {

                pageElement.classList.remove(
                    "lined-paper",
                    "dot-grid-paper",
                    "grid-paper",
                    "blank-paper"
                );

                pageElement.classList.add(
                    PAPER_CLASSES[style]
                );

            }

            document.querySelectorAll(".paper-option").forEach(item => {

                item.classList.toggle(
                    "active",
                    item.dataset.paper === style
                );

            });

            saveJournal();

        });

    });


    /* =================================================
       35. PAPER COLOR
    ================================================= */

    paperColorInput.addEventListener("input", () => {

        const page = getActivePage();

        if (!page) return;

        page.paperColor = paperColorInput.value;

        paperColorValue.textContent =
            page.paperColor.toUpperCase();

        const pageElement = getPageElement(page.id);

        if (pageElement) {

            pageElement.style.backgroundColor =
                page.paperColor;

        }

        saveJournal();

    });


    /* =================================================
       36. IMAGE SELECTION
    ================================================= */

    function selectImage(pageId, imageId) {

        selectedImagePageId = pageId;

        selectedImageId = imageId;


        document.querySelectorAll(
            ".journal-image-object"
        ).forEach(element => {

            element.classList.toggle(
                "selected",
                element.dataset.imageId === imageId &&
                element.dataset.pageId === pageId
            );

        });


        imageToolbar.hidden = false;

    }


    function deselectImage() {

        selectedImageId = null;

        selectedImagePageId = null;


        document.querySelectorAll(
            ".journal-image-object.selected"
        ).forEach(element => {

            element.classList.remove("selected");

        });


        imageToolbar.hidden = true;

    }


    /* =================================================
       37. IMAGE DRAG
    ================================================= */

    function startImageDrag(event, wrapper, layer, imageData) {

        if (event.button !== undefined && event.button !== 0) return;

        event.preventDefault();

        const rect = layer.getBoundingClientRect();

        const startX = event.clientX;
        const startY = event.clientY;

        const initialX = imageData.x;
        const initialY = imageData.y;

        let moved = false;


        function move(moveEvent) {

            const dx =
                (moveEvent.clientX - startX) / rect.width;

            const dy =
                (moveEvent.clientY - startY) / rect.height;

            if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
                moved = true;
            }


            imageData.x = Math.max(
                0,
                Math.min(
                    1 - imageData.width,
                    initialX + dx
                )
            );


            imageData.y = Math.max(
                0,
                Math.min(
                    1 - imageData.height,
                    initialY + dy
                )
            );


            wrapper.style.left =
                `${imageData.x * 100}%`;

            wrapper.style.top =
                `${imageData.y * 100}%`;

        }


        function stop() {

            document.removeEventListener("pointermove", move);

            document.removeEventListener("pointerup", stop);

            document.removeEventListener("pointercancel", stop);

            if (moved) saveJournal();

        }


        document.addEventListener("pointermove", move);

        document.addEventListener("pointerup", stop);

        document.addEventListener("pointercancel", stop);

    }


    /* =================================================
       38. IMAGE RESIZE
       Preserve aspect ratio.
    ================================================= */

    function startImageResize(event, wrapper, layer, imageData) {

        event.preventDefault();

        event.stopPropagation();


        const rect = layer.getBoundingClientRect();

        const startX = event.clientX;
        const startWidth = imageData.width;


        const ratio = Math.max(
            0.05,
            imageData.aspectRatio || 1.5
        );


        function resize(moveEvent) {

            const dx =
                (moveEvent.clientX - startX) / rect.width;

            const maximumWidth = 1 - imageData.x;

            const width = Math.max(
                0.06,
                Math.min(
                    maximumWidth,
                    startWidth + dx
                )
            );


            const height = (
                width *
                rect.width /
                (ratio * rect.height)
            );


            const maximumHeight = 1 - imageData.y;

            imageData.width = width;

            imageData.height = Math.min(
                maximumHeight,
                height
            );


            wrapper.style.width =
                `${imageData.width * 100}%`;

            wrapper.style.height =
                `${imageData.height * 100}%`;

        }


        function stop() {

            document.removeEventListener("pointermove", resize);

            document.removeEventListener("pointerup", stop);

            document.removeEventListener("pointercancel", stop);

            saveJournal();

        }


        document.addEventListener("pointermove", resize);

        document.addEventListener("pointerup", stop);

        document.addEventListener("pointercancel", stop);

    }


    /* =================================================
       39. ADD IMAGE
    ================================================= */

    imageButton.addEventListener("click", () => {

        if (!getActivePage()) return;

        imageUpload.click();

    });


    function readFileAsDataURL(file) {

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);

            reader.onerror = () => reject(reader.error);

            reader.readAsDataURL(file);

        });

    }


    async function compressImage(file) {

        const objectURL = URL.createObjectURL(file);

        try {

            const image = new Image();

            await new Promise((resolve, reject) => {

                image.onload = resolve;

                image.onerror = reject;

                image.src = objectURL;

            });


            const maximumDimension = 1600;

            const scale = Math.min(
                1,
                maximumDimension / Math.max(
                    image.naturalWidth,
                    image.naturalHeight
                )
            );


            const width = Math.max(
                1,
                Math.round(image.naturalWidth * scale)
            );

            const height = Math.max(
                1,
                Math.round(image.naturalHeight * scale)
            );


            const canvas = document.createElement("canvas");

            canvas.width = width;

            canvas.height = height;

            const context = canvas.getContext("2d");

            if (!context) {
                throw new Error("Canvas unavailable");
            }

            context.drawImage(
                image,
                0,
                0,
                width,
                height
            );


            const blob = await new Promise(resolve => {

                canvas.toBlob(
                    resolve,
                    "image/webp",
                    0.82
                );

            });


            const src = blob
                ? await readFileAsDataURL(blob)
                : await readFileAsDataURL(file);


            return {

                src,

                aspectRatio:
                    image.naturalWidth /
                    image.naturalHeight

            };

        } finally {

            URL.revokeObjectURL(objectURL);

        }

    }


    imageUpload.addEventListener("change", async () => {

        const file = imageUpload.files?.[0];

        if (!file) return;


        const page = getActivePage();

        if (!page) {

            alert("Please select a page first.");

            imageUpload.value = "";

            return;

        }


        if (!file.type.startsWith("image/")) {

            alert("Please select an image file.");

            imageUpload.value = "";

            return;

        }


        if (file.size > 15 * 1024 * 1024) {

            alert("Please select an image smaller than 15 MB.");

            imageUpload.value = "";

            return;

        }


        try {

            const result = await compressImage(file);

            const imageLayer = getImageLayer(page.id);

            if (!imageLayer) return;


            const layerWidth =
                imageLayer.clientWidth || 450;

            const layerHeight =
                imageLayer.clientHeight || 600;


            const width = 0.45;

            const height = Math.min(
                0.75,
                width * layerWidth /
                    (
                        result.aspectRatio *
                        layerHeight
                    )
            );


            const imageData = {

                id: createId(),

                src: result.src,

                x: 0.08,
                y: 0.08,

                width,
                height,

                aspectRatio: result.aspectRatio

            };


            page.images.push(imageData);

            saveJournal();

            renderPages();

            selectImage(page.id, imageData.id);

        } catch (error) {

            console.error("Image upload error:", error);

            alert("Could not load the image.");

        } finally {

            imageUpload.value = "";

        }

    });


    /* =================================================
       40. DELETE IMAGE
    ================================================= */

    deleteImageButton.addEventListener("click", () => {

        if (!selectedImageId || !selectedImagePageId) return;


        const page = findPageById(selectedImagePageId);

        if (!page) return;


        page.images = page.images.filter(image => {

            return image.id !== selectedImageId;

        });


        deselectImage();

        renderPages();

        saveJournal();

    });


    /* =================================================
       41. IMAGE OUTSIDE CLICK
    ================================================= */

    document.addEventListener("pointerdown", event => {

        if (!selectedImageId) return;

        if (event.target.closest(".journal-image-object")) return;

        if (event.target.closest(".image-toolbar")) return;

        deselectImage();

    });


    /* =================================================
       42. ADD PAGE MENU
    ================================================= */

    addPageButton.addEventListener("click", () => {

        const isOpening = addPageMenu.hidden;

        addPageMenu.hidden = !isOpening;

        addPageButton.setAttribute(
            "aria-expanded",
            String(isOpening)
        );

    });


    function clearPageSelection() {

        selectionMode = false;

        activePageId = null;

        deselectImage();

        closeTextSelectionMenu();

        binderButton.classList.remove("active");

        binderButton.setAttribute(
            "aria-pressed",
            "false"
        );

        selectionLabel.textContent =
            "Click the clip to select a page";

    }


    function addNewSpread(layout) {

        clearPageSelection();


        const spread = layout === "free"

            ? {
                id: createId(),
                layout: "free",
                pages: [createDefaultPage()]
            }

            : {
                id: createId(),
                layout: "two-page",
                pages: [
                    createDefaultPage(),
                    createDefaultPage()
                ]
            };


        journalData.spreads.push(spread);

        currentSpreadIndex =
            journalData.spreads.length - 1;


        addPageMenu.hidden = true;

        addPageButton.setAttribute(
            "aria-expanded",
            "false"
        );


        renderPages();

        updatePropertiesPanel();

        updateSidebarState();

        saveJournal();

    }


    addTwoPageButton.addEventListener("click", () => {

        addNewSpread("two-page");

    });


    addFreePageButton.addEventListener("click", () => {

        addNewSpread("free");

    });


    document.addEventListener("pointerdown", event => {

        if (!event.target.closest(".add-page-container")) {

            addPageMenu.hidden = true;

            addPageButton.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    });


    /* =================================================
       43. NAVIGATION BETWEEN SPREADS
    ================================================= */

    function changeSpread(direction) {

        const nextIndex =
            currentSpreadIndex + direction;

        if (
            nextIndex < 0 ||
            nextIndex >= journalData.spreads.length
        ) {
            return;
        }


        currentSpreadIndex = nextIndex;

        clearPageSelection();

        renderPages();

        updatePropertiesPanel();

        updateSidebarState();

        saveJournal();

    }


    previousButton.addEventListener("click", () => {
        changeSpread(-1);
    });


    nextButton.addEventListener("click", () => {
        changeSpread(1);
    });


    /* =================================================
       44. TEXT SELECTION MENU
       Highlight text → right-click (desktop) or Format button (touch)
    ================================================= */

    const textSelectionMenu = document.createElement("div");

    textSelectionMenu.className = "journal-selection-menu";
    textSelectionMenu.id = "journal-selection-menu";

    textSelectionMenu.hidden = true;

    textSelectionMenu.innerHTML = `
        <div class="selection-menu-heading">
            <span>FORMAT SELECTED TEXT</span>

            <button
                type="button"
                data-close-format
                aria-label="Close"
            >×</button>
        </div>

        <div class="selection-menu-row">
            <label>FONT</label>

            <select data-format="font">
                <option value="Sarabun">Sarabun</option>
                <option value="UID Space">UID Space</option>
                <option value="Alice">Alice</option>
            </select>
        </div>

        <div class="selection-menu-row">
            <label>SIZE</label>

            <select data-format="size">
                <option value="12">12 px</option>
                <option value="14">14 px</option>
                <option value="16">16 px</option>
                <option value="18">18 px</option>
                <option value="20">20 px</option>
                <option value="22">22 px</option>
                <option value="24">24 px</option>
                <option value="28">28 px</option>
                <option value="32">32 px</option>
            </select>
        </div>

        <div class="selection-menu-row">
            <label>COLOR</label>

            <input
                type="color"
                data-format="color"
                value="#222222"
            >
        </div>

        <div class="selection-menu-actions">
            <button type="button" data-format="bold">Bold</button>
            <button type="button" data-format="italic">Italic</button>
            <button type="button" data-format="underline">Underline</button>
        </div>

        <p class="selection-menu-hint">
            Changes apply only to highlighted text.
        </p>
    `;

    document.body.appendChild(textSelectionMenu);

    let pendingTextRange = null;
    let pendingWritingArea = null;

    function updateTextFormatButtonState() {
        const selection = window.getSelection();
        let writingArea = null;
        let range = null;

        if (
            selectionMode &&
            activePageId &&
            selection &&
            !selection.isCollapsed &&
            selection.toString().trim()
        ) {
            range = selection.getRangeAt(0);
            writingArea = [
                leftWriting,
                rightWriting,
                freeWriting
            ].find(area =>
                area.dataset.pageId === activePageId &&
                area.contains(range.startContainer) &&
                area.contains(range.endContainer)
            ) || null;
        }

        pendingWritingArea = writingArea;
        pendingTextRange = writingArea && range
            ? range.cloneRange()
            : null;
        touchTextFormatButton.disabled = !pendingTextRange;
    }

    document.addEventListener(
        "selectionchange",
        updateTextFormatButtonState
    );

    touchTextFormatButton.addEventListener("pointerdown", event => {
        event.preventDefault();
    });

    touchTextFormatButton.addEventListener("click", event => {
        if (!pendingTextRange || !pendingWritingArea) return;

        showTextSelectionMenu(
            event,
            pendingWritingArea,
            pendingTextRange
        );
    });


    /* Inject menu styling so it works without additional CSS. */

    const menuStyle = document.createElement("style");

    menuStyle.textContent = `
        .journal-selection-menu {
            position: fixed;
            z-index: 99999;
            width: 250px;
            max-width: calc(100vw - 16px);
            display: flex;
            flex-direction: column;
            gap: 11px;
            padding: 14px;
            border: 1px solid rgba(147,212,250,.4);
            border-radius: 13px;
            background: rgba(19,25,38,.97);
            color: #fff;
            box-shadow: 0 12px 35px rgba(0,0,0,.35);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
        }

        .journal-selection-menu[hidden] {
            display: none !important;
        }

        .selection-menu-heading {
            display: flex;
            align-items: center;
            justify-content: space-between;
            color: #93D4FA;
            font-size: 10px;
            letter-spacing: 1px;
        }

        .selection-menu-heading button {
            width: 25px;
            height: 25px;
            border: none;
            border-radius: 6px;
            background: rgba(255,255,255,.08);
            color: #fff;
            cursor: pointer;
        }

        .selection-menu-row {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .selection-menu-row label {
            color: rgba(255,255,255,.5);
            font-size: 9px;
            letter-spacing: 1px;
        }

        .selection-menu-row select {
            width: 100%;
            min-height: 34px;
            padding: 6px 9px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 7px;
            background: rgba(255,255,255,.07);
            color: #fff;
            font-size: 11px;
        }

        .selection-menu-row select option {
            background: #171D2A;
            color: #fff;
        }

        .selection-menu-row input[type="color"] {
            width: 100%;
            height: 34px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 7px;
            background: transparent;
        }

        .selection-menu-actions {
            display: flex;
            gap: 6px;
        }

        .selection-menu-actions button {
            flex: 1;
            min-height: 32px;
            padding: 5px;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 7px;
            background: rgba(255,255,255,.07);
            color: #fff;
            font-size: 10px;
            cursor: pointer;
        }

        .selection-menu-actions button:hover {
            border-color: #93D4FA;
            background: rgba(147,212,250,.12);
        }

        .selection-menu-hint {
            margin: 0;
            color: rgba(255,255,255,.4);
            font-size: 9px;
        }
    `;

    document.head.appendChild(menuStyle);


    /* =================================================
       45. TEXT SELECTION RANGE HELPERS
    ================================================= */

    function getValidTextRange() {

        if (!savedTextRange || !activeWritingArea) {
            return null;
        }

        if (
            !activeWritingArea.contains(
                savedTextRange.commonAncestorContainer
            )
        ) {
            return null;
        }

        if (savedTextRange.collapsed) {
            return null;
        }

        return savedTextRange;

    }


    function getRangeStyle(property) {

        const range = getValidTextRange();

        if (!range) return "";

        let node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }

        if (!node) return "";

        return window
            .getComputedStyle(node)
            .getPropertyValue(property);

    }


    function restoreSavedSelection() {

        const range = getValidTextRange();

        if (!range) return false;

        const selection = window.getSelection();

        if (!selection) return false;

        selection.removeAllRanges();

        selection.addRange(range);

        return true;

    }


    /* =================================================
       46. APPLY FORMATTING TO HIGHLIGHTED TEXT
    ================================================= */

    function applyFormattingToSelection(property, value) {

        const range = getValidTextRange();

        if (!range) return;


        const area = activeWritingArea;

        const walker = document.createTreeWalker(
            area,
            NodeFilter.SHOW_TEXT
        );


        const selectedNodes = [];

        let node;

        while ((node = walker.nextNode())) {

            if (!node.textContent.length) continue;

            if (!range.intersectsNode(node)) continue;


            let start = 0;
            let end = node.length;

            if (range.startContainer === node) {
                start = range.startOffset;
            }

            if (range.endContainer === node) {
                end = range.endOffset;
            }


            start = Math.max(0, Math.min(start, node.length));

            end = Math.max(0, Math.min(end, node.length));


            if (end > start) {

                selectedNodes.push({
                    node,
                    start,
                    end
                });

            }

        }


        if (selectedNodes.length === 0) return;


        const wrappers = new Array(selectedNodes.length);


        // Work backwards so earlier text offsets remain valid.
        for (
            let index = selectedNodes.length - 1;
            index >= 0;
            index--
        ) {

            const item = selectedNodes[index];

            let selectedTextNode = item.node;


            // Split the part after the selected text.
            if (item.end < selectedTextNode.length) {

                selectedTextNode.splitText(item.end);

            }


            // Split the part before the selected text.
            if (item.start > 0) {

                selectedTextNode =
                    selectedTextNode.splitText(item.start);

            }


            const span = document.createElement("span");

            span.style.setProperty(
                property,
                value
            );


            selectedTextNode.parentNode.insertBefore(
                span,
                selectedTextNode
            );

            span.appendChild(selectedTextNode);

            wrappers[index] = span;

        }


        // Restore a range across all formatted text parts.
        const first = wrappers[0];

        const last = wrappers[wrappers.length - 1];

        const newRange = document.createRange();

        newRange.setStartBefore(first);

        newRange.setEndAfter(last);


        savedTextRange = newRange.cloneRange();


        const selection = window.getSelection();

        selection.removeAllRanges();

        selection.addRange(savedTextRange);


        // Persist only the currently edited page.
        const page = findPageById(
            activeWritingArea.dataset.pageId
        );

        if (page) {

            page.content = sanitizeRichContent(
                activeWritingArea.innerHTML
            );

            saveJournal();

        }

    }


    /* =================================================
       47. TEXT SELECTION MENU OPEN
    ================================================= */

    function showTextSelectionMenu(
        event,
        writingArea,
        selectedRange = null
    ) {

        if (!selectionMode) return;

        if (
            writingArea.dataset.pageId !== activePageId
        ) {
            return;
        }


        const selection = window.getSelection();
        const range = selectedRange ||
            (
                selection &&
                !selection.isCollapsed &&
                selection.toString().trim()
                    ? selection.getRangeAt(0)
                    : null
            );

        if (!range) return;

        if (
            !writingArea.contains(range.startContainer) ||
            !writingArea.contains(range.endContainer)
        ) {
            return;
        }


        event.preventDefault();


        savedTextRange = range.cloneRange();

        activeWritingArea = writingArea;


        const currentFont = getRangeStyle("font-family");

        const currentSize = parseInt(
            getRangeStyle("font-size"),
            10
        );

        const currentColor = getRangeStyle("color");


        const fontControl =
            textSelectionMenu.querySelector('[data-format="font"]');

        const sizeControl =
            textSelectionMenu.querySelector('[data-format="size"]');

        const colorControl =
            textSelectionMenu.querySelector('[data-format="color"]');


        const matchedFont = FONT_OPTIONS.find(font => {

            return currentFont
                .toLowerCase()
                .includes(font.toLowerCase());

        });

        if (matchedFont) {
            fontControl.value = matchedFont;
        }


        if (currentSize && FONT_SIZES.includes(currentSize)) {
            sizeControl.value = String(currentSize);
        }


        if (currentColor) {

            const numbers = currentColor.match(/\d+/g);

            if (numbers && numbers.length >= 3) {

                colorControl.value = "#" +
                    numbers
                        .slice(0, 3)
                        .map(number =>
                            Number(number)
                                .toString(16)
                                .padStart(2, "0")
                        )
                        .join("");

            }

        }


        textSelectionMenu.hidden = false;


        requestAnimationFrame(() => {

            const rect =
                textSelectionMenu.getBoundingClientRect();

            const left = Math.max(
                8,
                Math.min(
                    event.clientX,
                    window.innerWidth - rect.width - 8
                )
            );

            const top = Math.max(
                8,
                Math.min(
                    event.clientY,
                    window.innerHeight - rect.height - 8
                )
            );


            textSelectionMenu.style.left =
                `${left}px`;

            textSelectionMenu.style.top =
                `${top}px`;

        });

    }


    /* =================================================
       48. TEXT MENU FORM CONTROLS
    ================================================= */

    textSelectionMenu.addEventListener("change", event => {

        const action = event.target.dataset.format;

        if (!action) return;


        if (action === "font") {

            applyFormattingToSelection(
                "font-family",
                `"${event.target.value}", sans-serif`
            );

        }


        if (action === "size") {

            const size = Number(event.target.value);

            if (!FONT_SIZES.includes(size)) return;

            applyFormattingToSelection(
                "font-size",
                `${size}px`
            );

        }

    });


    textSelectionMenu.addEventListener("input", event => {

        if (event.target.dataset.format !== "color") return;

        applyFormattingToSelection(
            "color",
            event.target.value
        );

    });


    textSelectionMenu.addEventListener("click", event => {

        if (event.target.closest("[data-close-format]")) {

            closeTextSelectionMenu();

            return;

        }


        const button = event.target.closest(
            ".selection-menu-actions button"
        );

        if (!button) return;


        const action = button.dataset.format;

        if (action === "bold") {

            const current = getRangeStyle("font-weight");

            const active =
                current === "bold" ||
                Number(current) >= 600;

            applyFormattingToSelection(
                "font-weight",
                active ? "400" : "700"
            );

        }


        if (action === "italic") {

            const current = getRangeStyle("font-style");

            applyFormattingToSelection(
                "font-style",
                current === "italic" ? "normal" : "italic"
            );

        }


        if (action === "underline") {

            const current = getRangeStyle("text-decoration");

            const active = current.includes("underline");

            applyFormattingToSelection(
                "text-decoration",
                active ? "none" : "underline"
            );

        }

    });


    /* =================================================
       49. CLOSE TEXT MENU
    ================================================= */

    function closeTextSelectionMenu() {

        textSelectionMenu.hidden = true;

        savedTextRange = null;

        activeWritingArea = null;

    }


    document.addEventListener("pointerdown", event => {

        if (textSelectionMenu.hidden) return;

        if (textSelectionMenu.contains(event.target)) return;

        closeTextSelectionMenu();

    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeTextSelectionMenu();

        }

    });


/* =====================================================
   50. STICKER LIBRARY — FUBAN OS
   Built-in Packs + Custom Packs
   Drag / Drop / Resize / Flip / Rotate
   Duplicate / Delete / Layer Management
===================================================== */

const stickerCategoryView = $("sticker-category-view");
const stickerBagView = $("sticker-bag-view");
const stickerGrid = $("sticker-grid");

const stickerBagName = $("sticker-bag-name");
const stickerBagCount = $("sticker-bag-count");

const backStickerCategories = $("back-to-sticker-categories");
const addStickerPackButton = $("add-sticker-pack");
const customPackList = $("custom-pack-list");

const stickerUpload = $("sticker-upload");

const importModal = $("sticker-import-modal");
const importImage = $("sticker-import-image");
const importName = $("sticker-import-name");
const importWidth = $("sticker-import-width");
const importHeight = $("sticker-import-height");
const importLockRatio = $("sticker-lock-ratio");
const importPack = $("sticker-import-pack");

const confirmImport = $("confirm-sticker-import");
const cancelImport = $("cancel-sticker-import");
const closeImport = $("close-sticker-import");

const layerPanel = $("journal-layer-panel");
const layerList = $("layer-list");

const closeLayerPanel = $("close-layer-panel");
const layerBringFront = $("layer-bring-front");
const layerSendBack = $("layer-send-back");
const layerLock = $("layer-lock");
const layerHide = $("layer-hide");
const layerDelete = $("layer-delete");

const BUILT_IN_PACKS = {
    astronomy: {
        name: "Astronomy",
        prefix: "astronomy",
        count: 15
    },
    nature: {
        name: "Nature",
        prefix: "nature",
        count: 3
    },
    stationery: {
        name: "Stationery",
        prefix: "stationery",
        count: 25
    },
    science: {
        name: "Science",
        prefix: "science",
        count: 10
    },
    doodles: {
        name: "Doodles",
        prefix: "doodle",
        count: 40
    },
    journey: {
        name: "Journey",
        stickers: ["bm", "bmm", "bmmm", "bmmmm"].map((id, index) => ({
            id,
            name: `Journey Bookmark ${index + 1}`,
            src: `assets/stickers/journey/${id}.png`,
            achievementType: "journey-bookmark"
        }))
    }
};

const STICKER_PACK_KEY = "fuban_journal_sticker_packs";

let currentStickerPackId = null;
let pendingStickerFiles = [];
let pendingStickerIndex = 0;
let selectedStickerId = null;
let selectedStickerPageId = null;

let stickerPointerState = null;
let stickerAspectRatio = 1;

let customStickerPacks = [];
let stickerObjectUrls = new Map();


/* -----------------------------------------------------
   50.1 DATA
----------------------------------------------------- */

function loadStickerPacks() {
    try {
        const saved = JSON.parse(
            localStorage.getItem(STICKER_PACK_KEY) || "[]"
        );

        customStickerPacks = Array.isArray(saved)
            ? saved
            : [];

    } catch (error) {
        console.error("Sticker packs could not load:", error);
        customStickerPacks = [];
    }
}


function saveStickerPacks() {
    try {
        localStorage.setItem(
            STICKER_PACK_KEY,
            JSON.stringify(customStickerPacks)
        );
    } catch (error) {
        console.error(error);
        alert("Unable to save sticker packs.");
    }
}


function getStickerPack(packId) {
    if (BUILT_IN_PACKS[packId]) {
        return {
            id: packId,
            ...BUILT_IN_PACKS[packId],
            builtIn: true
        };
    }

    return customStickerPacks.find(
        pack => pack.id === packId
    ) || null;
}


function getPageStickers(page) {
    if (!Array.isArray(page.stickers)) {
        page.stickers = [];
    }

    return page.stickers;
}


function createStickerId() {
    return createId();
}


/* -----------------------------------------------------
   50.2 CATEGORY VIEW
----------------------------------------------------- */

function renderStickerCategories() {
    stickerCategoryView.hidden = false;
    stickerBagView.hidden = true;

    document.querySelectorAll(".sticker-category").forEach(button => {
        button.disabled = !getActivePage();
    });

    addStickerPackButton.disabled = !getActivePage();

    renderCustomStickerPacks();
}


function renderCustomStickerPacks() {
    customPackList.innerHTML = "";

    customStickerPacks.forEach(pack => {
        const row = document.createElement("div");
        row.className = "custom-pack-row";

        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "custom-pack-button";

        const name = document.createElement("span");
        name.textContent = pack.name;

        const count = document.createElement("span");
        count.className = "custom-pack-count";
        count.textContent = pack.stickers.length;

        openButton.append(name, count);

        openButton.addEventListener("click", () => {
            openStickerPack(pack.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "custom-pack-delete";
        deleteButton.textContent = "×";
        deleteButton.title = "Delete pack";

        deleteButton.addEventListener("click", () => {
            deleteCustomStickerPack(pack.id);
        });

        row.append(openButton, deleteButton);
        customPackList.appendChild(row);
    });
}


/* -----------------------------------------------------
   50.3 OPEN STICKER BAG
----------------------------------------------------- */

function openStickerPack(packId) {
    if (!getActivePage()) {
        alert("Select a notebook page first.");
        return;
    }

    const pack = getStickerPack(packId);

    if (!pack) return;

    currentStickerPackId = packId;

    stickerCategoryView.hidden = true;
    stickerBagView.hidden = false;

    stickerBagName.textContent = pack.name;

    renderStickerItems(pack);
}


function renderStickerItems(pack) {
    stickerGrid.innerHTML = "";

    let stickers = [];

    if (pack.id === "journey") {
        stickers = pack.stickers;
    } else if (pack.builtIn) {
        for (let i = 1; i <= pack.count; i++) {
            stickers.push({
                id: `${pack.prefix}${i}`,
                name: `${pack.prefix}${i}`,
                src: `assets/stickers/${pack.id}/${pack.prefix}${i}.png`
            });
        }
    } else {
        stickers = pack.stickers;
    }

    stickerBagCount.textContent =
        `${stickers.length} stickers`;

    stickers.forEach(sticker => {
        const item = document.createElement("button");

        item.type = "button";
        item.className = "sticker-item";
        item.draggable = true;

        item.dataset.stickerId = sticker.id;

        const image = document.createElement("img");
        image.src = sticker.src;
        image.alt = sticker.name || "Sticker";
        image.draggable = false;

        image.addEventListener("error", () => {
            item.classList.add("sticker-missing");
            item.title = "Image not found: " + sticker.src;
        });

        item.appendChild(image);

        item.addEventListener("dragstart", event => {
            event.dataTransfer.setData(
                "application/fuban-sticker",
                JSON.stringify({
                    src: sticker.src,
                    name: sticker.name || "Sticker",
                    achievementType: sticker.achievementType || null,
                    aspectRatio:
                        image.naturalWidth && image.naturalHeight
                            ? image.naturalWidth / image.naturalHeight
                            : 0
                })
            );

            event.dataTransfer.effectAllowed = "copy";
        });

        item.addEventListener("click", () => {
            placeStickerAtCenter({
                ...sticker,
                aspectRatio:
                    image.naturalWidth && image.naturalHeight
                        ? image.naturalWidth / image.naturalHeight
                        : 0
            });
        });

        stickerGrid.appendChild(item);
    });
}


backStickerCategories.addEventListener("click", () => {
    currentStickerPackId = null;
    renderStickerCategories();
});


document.querySelectorAll(".sticker-category").forEach(button => {
    button.addEventListener("click", () => {
        openStickerPack(button.dataset.category);
    });
});


/* -----------------------------------------------------
   50.4 CREATE CUSTOM PACK
----------------------------------------------------- */

addStickerPackButton.addEventListener("click", () => {
    if (!getActivePage()) {
        alert("Select a notebook page first.");
        return;
    }

    const name = prompt("Enter your new sticker pack name:");

    if (!name || !name.trim()) return;

    const pack = {
        id: createStickerId(),
        name: name.trim(),
        stickers: []
    };

    customStickerPacks.push(pack);

    saveStickerPacks();
    renderCustomStickerPacks();

    openStickerPack(pack.id);
});


function deleteCustomStickerPack(packId) {
    const pack = getStickerPack(packId);

    if (!pack || pack.builtIn) return;

    const confirmed = confirm(
        `Delete "${pack.name}" and its stickers from the library? ` +
        "Stickers already placed on notebook pages will remain."
    );

    if (!confirmed) return;

    customStickerPacks = customStickerPacks.filter(
        item => item.id !== packId
    );

    saveStickerPacks();

    if (currentStickerPackId === packId) {
        currentStickerPackId = null;
        renderStickerCategories();
    } else {
        renderCustomStickerPacks();
    }
}


/* -----------------------------------------------------
   50.5 IMPORT STICKERS
----------------------------------------------------- */

addStickerPackButton.addEventListener("contextmenu", event => {
    event.preventDefault();
});


function openStickerImport(files) {
    pendingStickerFiles = Array.from(files).filter(file => {
        return file.type.startsWith("image/");
    });

    pendingStickerIndex = 0;

    if (!pendingStickerFiles.length) return;

    if (customStickerPacks.length === 0) {
        alert("Create a custom sticker pack first.");
        return;
    }

    renderImportPackOptions();
    showImportPreview();
}


function renderImportPackOptions() {
    importPack.innerHTML = "";

    customStickerPacks.forEach(pack => {
        const option = document.createElement("option");

        option.value = pack.id;
        option.textContent = pack.name;

        importPack.appendChild(option);
    });
}


function showImportPreview() {
    const file = pendingStickerFiles[pendingStickerIndex];

    if (!file) {
        closeStickerImport();
        return;
    }

    const url = URL.createObjectURL(file);

    importImage.src = url;

    importName.value = file.name.replace(/\.[^.]+$/, "");

    const image = new Image();

    image.onload = () => {
        stickerAspectRatio = image.width / image.height;

        const maxDimension = 512;

        if (image.width >= image.height) {
            importWidth.value = maxDimension;
            importHeight.value = Math.round(
                maxDimension / stickerAspectRatio
            );
        } else {
            importHeight.value = maxDimension;
            importWidth.value = Math.round(
                maxDimension * stickerAspectRatio
            );
        }

        URL.revokeObjectURL(url);
    };

    image.src = url;

    importModal.hidden = false;
}


function closeStickerImport() {
    importModal.hidden = true;

    importImage.src = "";

    pendingStickerFiles = [];
    pendingStickerIndex = 0;
}


function addImportedSticker() {
    const file = pendingStickerFiles[pendingStickerIndex];

    if (!file) return;

    const pack = getStickerPack(importPack.value);

    if (!pack || pack.builtIn) {
        alert("Choose a custom sticker pack.");
        return;
    }

    const width = Number(importWidth.value);
    const height = Number(importHeight.value);

    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 20 ||
        height < 20 ||
        width > 2000 ||
        height > 2000
    ) {
        alert("Please enter a valid sticker size.");
        return;
    }

    /*
       Original file is preserved.
       The selected dimensions are only default
       display dimensions when placed on a page.
    */

    const reader = new FileReader();

    reader.onload = () => {
        pack.stickers.push({
            id: createStickerId(),
            name: importName.value.trim() || file.name,
            src: reader.result,
            width,
            height,
            originalName: file.name
        });

        saveStickerPacks();

        pendingStickerIndex++;

        if (pendingStickerIndex < pendingStickerFiles.length) {
            showImportPreview();
        } else {
            closeStickerImport();
            renderCustomStickerPacks();
            openStickerPack(pack.id);
        }
    };

    reader.readAsDataURL(file);
}


confirmImport.addEventListener("click", addImportedSticker);

cancelImport.addEventListener("click", closeStickerImport);
closeImport.addEventListener("click", closeStickerImport);


importLockRatio.addEventListener("change", () => {
    importWidth.dataset.previous = importWidth.value;
    importHeight.dataset.previous = importHeight.value;
});


importWidth.addEventListener("input", () => {
    if (!importLockRatio.checked) return;

    const width = Number(importWidth.value);

    if (width > 0) {
        importHeight.value = Math.round(
            width / stickerAspectRatio
        );
    }
});


importHeight.addEventListener("input", () => {
    if (!importLockRatio.checked) return;

    const height = Number(importHeight.value);

    if (height > 0) {
        importWidth.value = Math.round(
            height * stickerAspectRatio
        );
    }
});


/* -----------------------------------------------------
   50.6 ADD IMPORT BUTTON
----------------------------------------------------- */

const importStickerButton = document.createElement("button");

importStickerButton.type = "button";
importStickerButton.className = "add-sticker-pack-button";
importStickerButton.textContent = "+ Import Stickers";
importStickerButton.disabled = true;

addStickerPackButton.insertAdjacentElement(
    "afterend",
    importStickerButton
);

importStickerButton.addEventListener("click", () => {
    if (!getActivePage()) {
        alert("Select a notebook page first.");
        return;
    }

    stickerUpload.click();
});

stickerUpload.addEventListener("change", event => {
    openStickerImport(event.target.files);
    event.target.value = "";
});


/* -----------------------------------------------------
   50.7 CREATE PAGE STICKER LAYER
----------------------------------------------------- */

function getStickerLayer(pageId) {
    const pageElement = getPageElement(pageId);

    if (!pageElement) return null;

    let layer = pageElement.querySelector(
        ".page-sticker-layer"
    );

    if (!layer) {
        layer = document.createElement("div");

        layer.className = "page-sticker-layer";

        pageElement.appendChild(layer);

        pageElement.addEventListener("dragover", event => {
            if (
                !selectionMode ||
                pageElement.dataset.pageId !== activePageId
            ) {
                return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
        });

        pageElement.addEventListener("drop", event => {
            const targetPageId = pageElement.dataset.pageId;

            if (
                !selectionMode ||
                targetPageId !== activePageId
            ) {
                return;
            }

            event.preventDefault();

            const raw = event.dataTransfer.getData(
                "application/fuban-sticker"
            );

            if (!raw) return;

            const data = JSON.parse(raw);
            const targetPage = findPageById(targetPageId);
            if (
                data.achievementType === "journey-bookmark" &&
                !targetPage?.date
            ) {
                alert("Add a date to this journal page before placing the Journey bookmark.");
                return;
            }

            const rect = layer.getBoundingClientRect();
            const aspectRatio = Number(data.aspectRatio) || 0;
            const width = 0.2;
            const height = aspectRatio && rect.width && rect.height
                ? Math.min(
                    0.5,
                    width * rect.width /
                        (aspectRatio * rect.height)
                )
                : 0.2;

            const sticker = {
                id: createStickerId(),
                name: data.name,
                src: data.src,
                ...(data.achievementType
                    ? { achievementType: data.achievementType }
                    : {}),
                x: Math.max(
                    0,
                    Math.min(1 - width, (event.clientX - rect.left) / rect.width)
                ),
                y: Math.max(
                    0,
                    Math.min(1 - height, (event.clientY - rect.top) / rect.height)
                ),
                width,
                height,
                aspectRatio,
                rotation: 0,
                flipX: false,
                flipY: false,
                locked: false,
                hidden: false
            };

            addStickerToPage(targetPageId, sticker);
        });
    }

    layer.dataset.pageId = pageId;

    return layer;
}


/* -----------------------------------------------------
   50.8 PLACE STICKER
----------------------------------------------------- */

function placeStickerAtCenter(source) {
    const page = getActivePage();

    if (!page) {
        alert("Select a notebook page first.");
        return;
    }

    if (source.achievementType === "journey-bookmark" && !page.date) {
        alert("Add a date to this journal page before placing the Journey bookmark.");
        return;
    }

    const width = source.width
        ? Math.min(0.5, source.width / 500)
        : 0.2;
    const layer = getStickerLayer(page.id);
    const rect = layer?.getBoundingClientRect();
    const aspectRatio = Number(source.aspectRatio) || 0;
    const height = aspectRatio && rect?.width && rect.height
        ? Math.min(
            0.5,
            width * rect.width /
                (aspectRatio * rect.height)
        )
        : source.height
            ? Math.min(0.5, source.height / 500)
            : 0.2;

    const sticker = {
        id: createStickerId(),
        name: source.name || "Sticker",
        src: source.src,
        ...(source.achievementType
            ? { achievementType: source.achievementType }
            : {}),

        x: 0.4,
        y: 0.35,

        width,
        height,
        aspectRatio,

        rotation: 0,
        flipX: false,
        flipY: false,
        locked: false,
        hidden: false
    };

    addStickerToPage(page.id, sticker);
}


function addStickerToPage(pageId, sticker) {
    const page = findPageById(pageId);

    if (!page) return;

    getPageStickers(page).push(sticker);

    saveJournal();
    renderPageStickers(pageId);

    selectSticker(pageId, sticker.id);
}


/* -----------------------------------------------------
   50.9 RENDER STICKERS
----------------------------------------------------- */

function renderPageStickers(pageId) {
    const page = findPageById(pageId);

    if (!page) return;

    const layer = getStickerLayer(pageId);

    if (!layer) return;

    layer.innerHTML = "";

    const active =
        selectionMode &&
        activePageId === pageId;

    getPageStickers(page).forEach((sticker, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "journal-sticker-object";
        wrapper.dataset.stickerId = sticker.id;
        wrapper.style.left = `${sticker.x * 100}%`;
        wrapper.style.top = `${sticker.y * 100}%`;
        wrapper.style.width = `${sticker.width * 100}%`;
        wrapper.style.height = `${sticker.height * 100}%`;
        wrapper.style.zIndex = String(index + 1);
        wrapper.style.pointerEvents = active ? "auto" : "none";
        wrapper.style.display = sticker.hidden ? "none" : "block";

        if (sticker.locked) {
            wrapper.classList.add("locked");
        }

        if (
            sticker.id === selectedStickerId &&
            pageId === selectedStickerPageId
        ) {
            wrapper.classList.add("selected");
        }

        const image = document.createElement("img");
        image.className = "journal-sticker";
        image.src = sticker.src;
        image.alt = sticker.name || "Sticker";
        image.draggable = false;
        image.style.transform = [
            `rotate(${sticker.rotation || 0}deg)`,
            `scaleX(${sticker.flipX ? -1 : 1})`,
            `scaleY(${sticker.flipY ? -1 : 1})`
        ].join(" ");
        image.addEventListener("load", () => {
            if (!sticker.aspectRatio && image.naturalHeight) {
                sticker.aspectRatio = image.naturalWidth / image.naturalHeight;
                saveJournal();
            }
        }, { once: true });

        const resizeHandle = document.createElement("span");
        resizeHandle.className = "sticker-resize-handle";
        resizeHandle.setAttribute("aria-label", "Resize sticker");

        wrapper.append(image, resizeHandle);
        wrapper.addEventListener("pointerdown", event => {
            if (event.target === resizeHandle) {
                beginStickerResize(
                    event,
                    wrapper,
                    layer,
                    pageId,
                    sticker
                );
            } else {
                beginStickerMove(
                    event,
                    wrapper,
                    layer,
                    pageId,
                    sticker
                );
            }
        });

        layer.appendChild(wrapper);
    });
}


/* -----------------------------------------------------
   50.10 SELECT STICKER
----------------------------------------------------- */

function selectSticker(pageId, stickerId) {
    selectedStickerPageId = pageId;
    selectedStickerId = stickerId;

    const layer = getStickerLayer(pageId);

    if (layer) {
        layer.querySelectorAll(".journal-sticker-object").forEach(element => {
            element.classList.toggle(
                "selected",
                element.dataset.stickerId === stickerId
            );
        });
    }

    renderLayerPanel();
}


function getSelectedSticker() {
    const page = findPageById(selectedStickerPageId);

    if (!page) return null;

    return getPageStickers(page).find(
        sticker => sticker.id === selectedStickerId
    ) || null;
}


/* -----------------------------------------------------
   50.11 MOVE STICKER
----------------------------------------------------- */

function beginStickerMove(event, wrapper, layer, pageId, sticker) {
    if (!selectionMode || activePageId !== pageId) return;

    if (sticker.locked) return;

    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    selectSticker(pageId, sticker.id);

    const rect = layer.getBoundingClientRect();

    stickerPointerState = {
        mode: "move",
        pointerId: event.pointerId,
        pageId,
        stickerId: sticker.id,

        startX: event.clientX,
        startY: event.clientY,

        originalX: sticker.x,
        originalY: sticker.y,

        layerWidth: rect.width,
        layerHeight: rect.height
    };

    beginStickerPointerTracking(event, wrapper);
}


function beginStickerResize(event, wrapper, layer, pageId, sticker) {
    if (!selectionMode || activePageId !== pageId) return;

    if (sticker.locked) return;

    event.preventDefault();
    event.stopPropagation();

    selectSticker(pageId, sticker.id);

    const rect = layer.getBoundingClientRect();
    const aspectRatio = (
        sticker.width * rect.width
    ) / (
        sticker.height * rect.height
    );

    stickerPointerState = {
        mode: "resize",
        pointerId: event.pointerId,
        pageId,
        stickerId: sticker.id,
        startX: event.clientX,
        startY: event.clientY,
        originalWidth: sticker.width,
        layerWidth: rect.width,
        layerHeight: rect.height,
        aspectRatio: aspectRatio || 1
    };

    beginStickerPointerTracking(event, wrapper);
}


function beginStickerPointerTracking(event, wrapper) {
    if (wrapper.setPointerCapture) {
        wrapper.setPointerCapture(event.pointerId);
    }

    wrapper.addEventListener("pointermove", moveStickerPointer);
    wrapper.addEventListener("pointerup", endStickerPointer, { once: true });
    wrapper.addEventListener("pointercancel", endStickerPointer, { once: true });
}


function moveStickerPointer(event) {
    const state = stickerPointerState;

    if (!state || event.pointerId !== state.pointerId) return;

    const page = findPageById(state.pageId);
    if (!page) return;

    const sticker = getPageStickers(page).find(
        item => item.id === state.stickerId
    );
    if (!sticker) return;

    const wrapper = event.currentTarget;

    if (state.mode === "move") {
        const dx = (event.clientX - state.startX) / state.layerWidth;
        const dy = (event.clientY - state.startY) / state.layerHeight;

        sticker.x = Math.max(
            0,
            Math.min(1 - sticker.width, state.originalX + dx)
        );
        sticker.y = Math.max(
            0,
            Math.min(1 - sticker.height, state.originalY + dy)
        );

        wrapper.style.left = `${sticker.x * 100}%`;
        wrapper.style.top = `${sticker.y * 100}%`;
        return;
    }

    const dx = (event.clientX - state.startX) / state.layerWidth;
    const pixelRatio = state.aspectRatio *
        state.layerHeight / state.layerWidth;
    const maxWidth = Math.min(
        1 - sticker.x,
        (1 - sticker.y) * pixelRatio
    );
    const minWidth = Math.min(0.06, maxWidth);

    sticker.width = Math.max(
        minWidth,
        Math.min(maxWidth, state.originalWidth + dx)
    );
    sticker.height = Math.min(
        1 - sticker.y,
        sticker.width / pixelRatio
    );

    wrapper.style.width = `${sticker.width * 100}%`;
    wrapper.style.height = `${sticker.height * 100}%`;
}


function endStickerPointer(event) {
    const state = stickerPointerState;

    if (!state || event.pointerId !== state.pointerId) return;

    const wrapper = event.currentTarget;

    wrapper.removeEventListener("pointermove", moveStickerPointer);
    wrapper.removeEventListener("pointerup", endStickerPointer);
    wrapper.removeEventListener("pointercancel", endStickerPointer);
    stickerPointerState = null;

    saveJournal();
}


/* -----------------------------------------------------
   50.12 STICKER ACTIONS
----------------------------------------------------- */

function updateSelectedSticker(callback) {
    const sticker = getSelectedSticker();

    if (!sticker) return;

    callback(sticker);

    saveJournal();

    renderPageStickers(selectedStickerPageId);
    renderLayerPanel();
}


function flipSelectedSticker(axis) {
    updateSelectedSticker(sticker => {
        if (axis === "horizontal") {
            sticker.flipX = !sticker.flipX;
        } else {
            sticker.flipY = !sticker.flipY;
        }
    });
}


function rotateSelectedSticker(degrees = 15) {
    updateSelectedSticker(sticker => {
        sticker.rotation = (
            (Number(sticker.rotation) || 0) + degrees
        ) % 360;
    });
}


function duplicateSelectedSticker() {
    const page = findPageById(selectedStickerPageId);
    const original = getSelectedSticker();

    if (!page || !original) return;

    const duplicate = {
        ...original,
        id: createStickerId(),
        x: Math.min(0.9, original.x + 0.04),
        y: Math.min(0.9, original.y + 0.04)
    };

    getPageStickers(page).push(duplicate);

    saveJournal();

    renderPageStickers(page.id);
    selectSticker(page.id, duplicate.id);
}


function deleteSelectedSticker() {
    const page = findPageById(selectedStickerPageId);

    if (!page || !selectedStickerId) return;

    page.stickers = getPageStickers(page).filter(
        sticker => sticker.id !== selectedStickerId
    );

    selectedStickerId = null;
    selectedStickerPageId = null;

    saveJournal();

    renderPageStickers(page.id);
    renderLayerPanel();
}


/* -----------------------------------------------------
   50.13 LAYER PANEL
----------------------------------------------------- */

function renderLayerPanel() {
    if (!layerList) return;

    layerList.innerHTML = "";

    const page = getActivePage();

    if (!page) return;

    selectedStickerPageId = page.id;

    const stickers = getPageStickers(page);

    [...stickers].reverse().forEach((sticker, index) => {
        const item = document.createElement("div");

        item.className = "layer-item";

        if (sticker.id === selectedStickerId) {
            item.classList.add("active");
        }

        const label = document.createElement("span");
        label.textContent = sticker.name || `Sticker ${index + 1}`;

        const visibility = document.createElement("button");
        visibility.type = "button";
        visibility.textContent = sticker.hidden ? "Show" : "Hide";

        visibility.addEventListener("click", event => {
            event.stopPropagation();

            sticker.hidden = !sticker.hidden;

            saveJournal();
            renderPageStickers(page.id);
            renderLayerPanel();
        });

        item.append(label, visibility);

        item.addEventListener("click", () => {
            selectSticker(page.id, sticker.id);
        });

        layerList.appendChild(item);
    });
}


function moveSelectedStickerLayer(direction) {
    const page = findPageById(selectedStickerPageId);

    if (!page) return;

    const stickers = getPageStickers(page);

    const index = stickers.findIndex(
        item => item.id === selectedStickerId
    );

    if (index < 0) return;

    const nextIndex = Math.max(
        0,
        Math.min(stickers.length - 1, index + direction)
    );

    if (index === nextIndex) return;

    const [item] = stickers.splice(index, 1);

    stickers.splice(nextIndex, 0, item);

    saveJournal();

    renderPageStickers(page.id);
    renderLayerPanel();
}


layerBringFront.addEventListener("click", () => {
    moveSelectedStickerLayer(1);
});

layerSendBack.addEventListener("click", () => {
    moveSelectedStickerLayer(-1);
});

layerLock.addEventListener("click", () => {
    updateSelectedSticker(sticker => {
        sticker.locked = !sticker.locked;
    });
});

layerHide.addEventListener("click", () => {
    updateSelectedSticker(sticker => {
        sticker.hidden = !sticker.hidden;
    });
});

layerDelete.addEventListener("click", deleteSelectedSticker);


closeLayerPanel.addEventListener("click", () => {
    layerPanel.hidden = true;
});


/* -----------------------------------------------------
   50.14 LAYER PANEL TOGGLE
----------------------------------------------------- */

const openLayerButton = document.createElement("button");

openLayerButton.type = "button";
openLayerButton.id = "open-layer-panel";
openLayerButton.className = "tool-button";
openLayerButton.textContent = "Layers";
openLayerButton.disabled = true;

sidebar.appendChild(openLayerButton);

openLayerButton.addEventListener("click", () => {
    if (!getActivePage()) return;

    layerPanel.hidden = !layerPanel.hidden;

    renderLayerPanel();
});


/* -----------------------------------------------------
   50.15 PAGE SELECTION INTEGRATION
----------------------------------------------------- */

function updateStickerSidebarState() {
    const page = getActivePage();
    const active = Boolean(page);

    document.querySelectorAll(".sticker-category").forEach(button => {
        button.disabled = !active;
    });

    addStickerPackButton.disabled = !active;
    importStickerButton.disabled = !active;
    openLayerButton.disabled = !active;

    if (!active) {
        stickerCategoryView.hidden = false;
        stickerBagView.hidden = true;

        layerPanel.hidden = true;

        selectedStickerId = null;
        selectedStickerPageId = null;
    } else if (selectedStickerPageId !== page.id) {
        selectedStickerId = null;
        selectedStickerPageId = page.id;
    }

    renderAllVisibleStickers();

    if (!layerPanel.hidden) renderLayerPanel();
}


/* -----------------------------------------------------
   50.16 RENDER CURRENT PAGE STICKERS
----------------------------------------------------- */

function renderAllVisibleStickers() {
    getCurrentVisiblePages().forEach(page => {
        renderPageStickers(page.id);
    });
}


/* -----------------------------------------------------
   50.17 INITIALIZE STICKER LIBRARY
----------------------------------------------------- */

loadStickerPacks();

renderStickerCategories();

updateStickerSidebarState();

renderAllVisibleStickers();



    /* =================================================
       51. KEYBOARD SHORTCUTS
    ================================================= */

    document.addEventListener("keydown", event => {

        if (!selectedImageId) return;

        const isTyping = [
            "INPUT",
            "TEXTAREA",
            "SELECT"
        ].includes(document.activeElement?.tagName);

        if (isTyping) return;

        if (
            event.key === "Delete" ||
            event.key === "Backspace"
        ) {

            deleteImageButton.click();

        }

    });


    /* =================================================
       52. SAVE BEFORE LEAVING
    ================================================= */

    window.addEventListener("pagehide", flushSave);

    window.addEventListener("beforeunload", flushSave);


    /* =================================================
       53. INITIALIZE
    ================================================= */

    function initializeJournal() {

        loadJournal();


        currentSpreadIndex = Math.max(
            0,
            Math.min(
                Number(journalData.currentSpreadIndex || 0),
                journalData.spreads.length - 1
            )
        );


        selectionMode = false;

        activePageId = null;

        selectedImageId = null;

        selectedImagePageId = null;


        binderButton.classList.remove("active");

        binderButton.setAttribute(
            "aria-pressed",
            "false"
        );


        propertiesPanel.hidden = true;

        imageToolbar.hidden = true;

        addPageMenu.hidden = true;


        renderPages();

        updatePropertiesPanel();

        updateSidebarState();

        updatePageCounter();

        syncDashboardWallpaper();

        setSaveStatus(
            "All changes saved",
            "saved"
        );

    }


    initializeJournal();

});