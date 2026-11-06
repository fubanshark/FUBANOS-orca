document.addEventListener("DOMContentLoaded", () => {

    const layer = document.getElementById("constellation-layer");
    const tooltip = document.getElementById("constellation-tooltip");
    const shootingLayer = document.getElementById("shooting-star-layer");

    if (!layer || !tooltip) return;

    // =====================================
    // CONSTELLATION DATA
    // =====================================

    const constellations = [
        {
            name: "Orion",
            date: "Winter Constellation",
            description: "The Hunter — one of the most recognizable constellations in the night sky.",
            stars: [[10,10],[35,25],[60,10],[35,55],[35,75],[10,90],[60,90]],
            lines: [[0,1],[1,2],[1,3],[3,4],[4,5],[4,6]]
        },
        {
            name: "Cassiopeia",
            date: "Northern Sky",
            description: "The Queen — famous for its distinctive W-shaped pattern.",
            stars: [[5,65],[25,10],[50,60],[75,10],[95,65]],
            lines: [[0,1],[1,2],[2,3],[3,4]]
        },
        {
            name: "Ursa Major",
            date: "Northern Sky",
            description: "The Great Bear — home to the famous Big Dipper asterism.",
            stars: [[5,20],[30,10],[55,25],[75,55],[90,70],[65,85],[40,70]],
            lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]
        },
        {
            name: "Cygnus",
            date: "Summer Constellation",
            description: "The Swan — its stars form the shape of a flying swan.",
            stars: [[50,5],[50,30],[50,55],[50,90],[15,45],[85,45]],
            lines: [[0,1],[1,2],[2,3],[2,4],[2,5]]
        },
        {
            name: "Lyra",
            date: "Summer Constellation",
            description: "The Lyre — a small constellation containing the bright star Vega.",
            stars: [[50,5],[15,35],[50,55],[85,35],[50,95]],
            lines: [[0,1],[1,2],[2,3],[3,0],[2,4]]
        },
        {
            name: "Aries",
            date: "21 Mar – 19 Apr",
            description: "The Ram — a constellation associated with courage and new beginnings.",
            stars: [[15,25],[50,10],[85,25]],
            lines: [[0,1],[1,2]]
        },
        {
            name: "Taurus",
            date: "20 Apr – 20 May",
            description: "The Bull — known for its association with strength and determination.",
            stars: [[50,80],[50,45],[20,15],[5,5],[80,15],[95,5]],
            lines: [[0,1],[1,2],[2,3],[1,4],[4,5]]
        },
        {
            name: "Gemini",
            date: "21 May – 20 Jun",
            description: "The Twins — represented by two parallel lines of stars.",
            stars: [[20,10],[25,40],[30,80],[75,10],[70,40],[65,80]],
            lines: [[0,1],[1,2],[3,4],[4,5],[1,4]]
        },
        {
            name: "Cancer",
            date: "21 Jun – 22 Jul",
            description: "The Crab — a faint constellation located between Gemini and Leo.",
            stars: [[10,20],[50,50],[90,20],[50,90]],
            lines: [[0,1],[1,2],[1,3]]
        },
        {
            name: "Leo",
            date: "23 Jul – 22 Aug",
            description: "The Lion — recognizable by its distinctive sickle-shaped pattern.",
            stars: [[15,25],[35,10],[60,20],[75,45],[55,65],[30,55],[15,80]],
            lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[5,6]]
        },
        {
            name: "Virgo",
            date: "23 Aug – 22 Sep",
            description: "The Maiden — one of the largest constellations in the night sky.",
            stars: [[15,15],[35,35],[55,15],[70,45],[50,70],[85,85]],
            lines: [[0,1],[1,2],[2,3],[3,4],[4,5]]
        },
        {
            name: "Libra",
            date: "23 Sep – 22 Oct",
            description: "The Scales — symbolizing balance, harmony, and justice.",
            stars: [[50,10],[20,45],[80,45],[35,85],[65,85]],
            lines: [[0,1],[0,2],[1,3],[2,4],[3,4]]
        },
        {
            name: "Scorpius",
            date: "23 Oct – 21 Nov",
            description: "The Scorpion — famous for its curved tail and bright star Antares.",
            stars: [[10,15],[30,30],[50,20],[65,45],[75,65],[90,70],[80,90],[60,95]],
            lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]]
        },
        {
            name: "Sagittarius",
            date: "22 Nov – 21 Dec",
            description: "The Archer — associated with a centaur aiming its bow toward the sky.",
            stars: [[15,20],[50,10],[85,25],[50,45],[20,75],[75,80],[50,95]],
            lines: [[0,1],[1,2],[0,3],[2,3],[3,4],[3,5],[5,6]]
        },
        {
            name: "Capricornus",
            date: "22 Dec – 19 Jan",
            description: "The Sea-Goat — one of the oldest recognized constellations.",
            stars: [[10,50],[30,20],[55,35],[75,15],[90,60],[60,85],[30,75]],
            lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]]
        },
        {
            name: "Aquarius",
            date: "20 Jan – 18 Feb",
            description: "The Water-Bearer — a large constellation representing a figure pouring water.",
            stars: [[10,20],[35,40],[60,20],[85,40],[60,65],[35,85],[85,90]],
            lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[4,6]]
        },
        {
            name: "Pisces",
            date: "19 Feb – 20 Mar",
            description: "The Fishes — two fish connected by a cord of stars.",
            stars: [[15,20],[35,40],[55,60],[80,80],[85,20],[65,40],[45,60]],
            lines: [[0,1],[1,2],[2,3],[4,5],[5,6],[6,2]]
        }
    ];


    // =====================================
    // CONNECTOR SVG
    // =====================================

    const connector = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
    );

    connector.id = "constellation-connector";
    document.body.appendChild(connector);


    // =====================================
    // CARD POSITION
    // =====================================

    let selectedElement = null;

    function positionCard(element) {

        const starRect = element.getBoundingClientRect();

        const gap = 38;
        const margin = 16;

        const cardWidth = Math.min(280, window.innerWidth - 32);

        tooltip.style.width = `${cardWidth}px`;
        tooltip.style.left = "0px";
        tooltip.style.top = "0px";

        // แสดงชั่วคราวเพื่อวัดขนาดจริง
        tooltip.classList.add("show");

        const cardHeight = tooltip.offsetHeight;

        // วางกล่องตรงกลางใต้กลุ่มดาว
        let left = starRect.left + starRect.width / 2 - cardWidth / 2;
        let top = starRect.bottom + gap;

        // ป้องกันกล่องล้นขอบซ้ายและขวา
        left = Math.max(
            margin,
            Math.min(left, window.innerWidth - cardWidth - margin)
        );

        // ถ้าพื้นที่ด้านล่างไม่พอ ให้ย้ายขึ้นด้านบน
        if (top + cardHeight > window.innerHeight - margin) {
            top = starRect.top - cardHeight - gap;
        }

        // ป้องกันกล่องล้นด้านบน
        top = Math.max(margin, top);

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        drawConnector(element);
    }


    // =====================================
    // DRAW CONNECTOR
    // =====================================

    function drawConnector(element) {

        const starRect = element.getBoundingClientRect();
        const cardRect = tooltip.getBoundingClientRect();

        // จุดเริ่มต้น: กึ่งกลางด้านล่างของกลุ่มดาว
        const startX = starRect.left + starRect.width / 2;

        let startY;
        let endY;

        if (cardRect.top > starRect.top) {
            // กล่องอยู่ด้านล่าง
            startY = starRect.bottom;
            endY = cardRect.top;
        } else {
            // กล่องอยู่ด้านบน
            startY = starRect.top;
            endY = cardRect.bottom;
        }

        // จุดปลายเส้นอยู่กึ่งกลางขอบกล่อง
        const endX = Math.max(
            cardRect.left + 20,
            Math.min(startX, cardRect.right - 20)
        );

        connector.setAttribute(
            "viewBox",
            `0 0 ${window.innerWidth} ${window.innerHeight}`
        );

        connector.innerHTML = `
            <line
                x1="${startX}"
                y1="${startY}"
                x2="${endX}"
                y2="${endY}"
                stroke="rgba(210,220,245,0.55)"
                stroke-width="1.5"
            />

            <circle
                cx="${endX}"
                cy="${endY}"
                r="4"
                fill="#AEB5C8"
            />
        `;
    }


    // =====================================
    // SHOW DETAILS
    // =====================================

    function showDetails(pattern, element) {

        selectedElement = element;

        tooltip.innerHTML = `
            <div class="constellation-detail">
                <h2>${pattern.name}</h2>
                <p class="constellation-date">${pattern.date}</p>
                <p class="constellation-description">
                    ${pattern.description}
                </p>
            </div>
        `;

        positionCard(element);
    }


    // =====================================
    // CREATE CONSTELLATION
    // =====================================

    function createConstellation(pattern) {

        const element = document.createElement("div");

        element.className = "constellation";
        element.style.left = (Math.random() * 75 + 5) + "%";
        element.style.top = (Math.random() * 65 + 10) + "%";
        element.style.width = "100px";
        element.style.height = "100px";

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");

        svg.setAttribute("viewBox", "0 0 100 100");

        pattern.lines.forEach(([start, end]) => {

            const line = document.createElementNS(svgNS, "line");

            line.setAttribute("x1", pattern.stars[start][0]);
            line.setAttribute("y1", pattern.stars[start][1]);
            line.setAttribute("x2", pattern.stars[end][0]);
            line.setAttribute("y2", pattern.stars[end][1]);

            svg.appendChild(line);
        });

        pattern.stars.forEach(([x, y]) => {

            const star = document.createElementNS(svgNS, "circle");

            star.setAttribute("cx", x);
            star.setAttribute("cy", y);
            star.setAttribute("r", "2");

            svg.appendChild(star);
        });

        element.appendChild(svg);
        layer.appendChild(element);

        element.addEventListener("click", (event) => {
            event.stopPropagation();
            showDetails(pattern, element);
        });
    }


    // =====================================
    // RANDOM CONSTELLATIONS
    // =====================================

    const shuffled = [...constellations]
        .sort(() => Math.random() - 0.5);

    shuffled.slice(0, 4).forEach(createConstellation);


    // =====================================
    // CLOSE CARD
    // =====================================

    document.addEventListener("click", (event) => {

        if (
            !tooltip.contains(event.target) &&
            !event.target.closest(".constellation")
        ) {
            tooltip.classList.remove("show");
            connector.innerHTML = "";
            selectedElement = null;
        }
    });


    // =====================================
    // UPDATE POSITION
    // =====================================

    function refreshPosition() {
        if (
            selectedElement &&
            tooltip.classList.contains("show")
        ) {
            positionCard(selectedElement);
        }
    }

    window.addEventListener("resize", refreshPosition);
    window.addEventListener("scroll", refreshPosition);


    // =====================================
    // SHOOTING STARS
    // =====================================

    if (shootingLayer) {

        function createShootingStar() {

            const star = document.createElement("div");
            star.className = "shooting-star";

            const startX = Math.random() * 100;
            const startY = Math.random() * 55;

            const duration = 0.7 + Math.random() * 1.3;
            const distance = 130 + Math.random() * 170;
            const angle = 25 + Math.random() * 20;

            const distanceX =
                Math.cos(angle * Math.PI / 180) * distance;

            const distanceY =
                Math.sin(angle * Math.PI / 180) * distance;

            star.style.left = startX + "%";
            star.style.top = startY + "%";

            star.style.setProperty("--duration", duration + "s");
            star.style.setProperty("--distance-x", distanceX + "px");
            star.style.setProperty("--distance-y", distanceY + "px");
            star.style.setProperty("--angle", angle + "deg");
            star.style.setProperty(
                "--tail",
                (50 + Math.random() * 70) + "px"
            );

            shootingLayer.appendChild(star);

            star.addEventListener("animationend", () => {
                star.remove();
            });
        }

        function scheduleNextStar() {

            const delay = 1800 + Math.random() * 5000;

            setTimeout(() => {

                createShootingStar();

                if (Math.random() > 0.8) {
                    setTimeout(createShootingStar, 400);
                }

                scheduleNextStar();

            }, delay);
        }

        scheduleNextStar();
    }

});