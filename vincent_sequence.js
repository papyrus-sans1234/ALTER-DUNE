
/* =====================================================
   ALTER DUNE — VINCENT SEQUENCE
   Grand Hall TNT Event + Vincent Boss Battle

   Requires:
   - script.js (including castleDestroyed patches)
   - vincentsprite.png
   - Analysis output 1.png (loaded by script.js)

   Soundtrack: VINCENT.mp3
   ===================================================== */

// -----------------------------------------------------
// VINCENT SOUNDTRACK REGISTRATION
// -----------------------------------------------------

if (!musicTracks.vincent) {
    musicTracks.vincent = new Audio("./VINCENT.mp3");
    musicTracks.vincent.loop = true;
    musicTracks.vincent.volume = 0;
    musicTracks.vincent.preload = "auto";

    musicTracks.vincent.addEventListener("error", () => {
        console.error(
            "Could not load Vincent soundtrack:",
            musicTracks.vincent.src
        );
    });
}

// -----------------------------------------------------
// BOSS STATE
// -----------------------------------------------------

const AD_VINCENT = {
    active: false,
    mode: "story",
    line: 0,
    timer: 0,

    bossHP: 360,
    bossMaxHP: 360,

    phase: "menu",
    phaseNumber: 1,

    menu: 0,

    aimX: 70,
    aimDirection: 1,

    heart: {
        x: W / 2,
        y: 300
    },

    bullets: [],
    bulletTimer: 0,
    attackTimer: 0,

    message: "",
    soundtrackStarted: false,

    sprite: new Image()
};

AD_VINCENT.sprite.src = "./vincentsprite.png";

AD_VINCENT.sprite.addEventListener("error", () => {
    console.error(
        "Could not load Vincent sprite:",
        AD_VINCENT.sprite.src
    );
});

// -----------------------------------------------------
// STORY
// -----------------------------------------------------

const AD_VINCENT_STORY = [
    {
        speaker: "NARRATOR",
        text: "You enter the Grand Hall. The castle is silent."
    },
    {
        speaker: "NARRATOR",
        text: "You take the TNT out of your inventory."
    },
    {
        speaker: "NARRATOR",
        text: "You carefully place it in the centre of the hall."
    },
    {
        speaker: "NARRATOR",
        text: "Now... ignite it."
    },
    {
        speaker: "NARRATOR",
        text: "The castle begins to shake."
    },
    {
        speaker: "NARRATOR",
        text: "A blinding flash consumes everything."
    },
    {
        speaker: "NARRATOR",
        text: "..."
    },
    {
        speaker: "NARRATOR",
        text: "You open your eyes."
    },
    {
        speaker: "NARRATOR",
        text: "There is nothing here. No walls. No ceiling. No light."
    },
    {
        speaker: "UNKNOWN",
        text: "..."
    },
    {
        speaker: "UNKNOWN",
        text: "YOU ACTUALLY MADE IT THIS FAR?"
    },
    {
        speaker: "UNKNOWN",
        text: "HOW... INTERESTING."
    },
    {
        speaker: "VINCENT",
        text: "HAHAHAHAHAHA!"
    },
    {
        speaker: "VINCENT",
        text: "Oh, don't look so surprised."
    },
    {
        speaker: "VINCENT",
        text: "I've been expecting you."
    },
    {
        speaker: "VINCENT",
        text: "I know everything. Every possibility. Every outcome."
    },
    {
        speaker: "VINCENT",
        text: "It's a curse, really."
    },
    {
        speaker: "VINCENT",
        text: "But I rather enjoy it."
    },
    {
        speaker: "VINCENT",
        text: "LET'S SEE WHAT YOU CAN DO."
    }
];

// -----------------------------------------------------
// START EVENT
// -----------------------------------------------------

function startVincentSequence() {
    if (AD_VINCENT.active) return;

    if (castleDestroyed) {
        showDialogue(
            "NARRATOR",
            "The castle is already gone."
        );
        return;
    }

    if (!hasItem("tnt")) {
        showDialogue(
            "NARRATOR",
            "You don't have anything to place here."
        );
        return;
    }

    // TNT is deliberately NOT consumed here.
    // It is consumed when the explosion actually happens.

    AD_VINCENT.active = true;
    AD_VINCENT.mode = "story";
    AD_VINCENT.line = 0;
    AD_VINCENT.timer = 0;

    AD_VINCENT.phase = "menu";
    AD_VINCENT.phaseNumber = 1;
    AD_VINCENT.bossHP = AD_VINCENT.bossMaxHP;
    AD_VINCENT.menu = 0;

    AD_VINCENT.bullets = [];
    AD_VINCENT.bulletTimer = 0;
    AD_VINCENT.attackTimer = 0;

    AD_VINCENT.message = "";
    AD_VINCENT.soundtrackStarted = false;

    AD_VINCENT.aimX = 70;
    AD_VINCENT.aimDirection = 1;

    AD_VINCENT.heart.x = W / 2;
    AD_VINCENT.heart.y = 300;

    paused = true;
    dialogueOpen = false;
    inventoryOpen = false;
    battleOpen = false;

    keys = {};

    // Vincent's soundtrack starts when his sprite appears.
}

// -----------------------------------------------------
// CONNECT TO EXISTING INTERACTION SYSTEM
// -----------------------------------------------------

const AD_VINCENT_OLD_INTERACT = interact;

interact = function () {
    if (
        !AD_VINCENT.active &&
        !castleDestroyed &&
        currentRoom === "hall" &&
        hasItem("tnt")
    ) {
        startVincentSequence();
        return;
    }

    AD_VINCENT_OLD_INTERACT();
};

// -----------------------------------------------------
// INPUT
// -----------------------------------------------------

document.addEventListener("keydown", function (e) {
    if (!AD_VINCENT.active) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    const key = e.key.toLowerCase();

    // -----------------------------------------------
    // STORY INPUT
    // -----------------------------------------------

    if (AD_VINCENT.mode === "story") {
        if (
            key === "z" ||
            key === "enter" ||
            key === " "
        ) {
            AD_VINCENT.line++;

            // THE EXPLOSION
            if (
                AD_VINCENT.line === 5 &&
                !castleDestroyed
            ) {
                removeItem("tnt");

                castleDestroyed = true;

                saveGame();
                updateLocation();
            }

            // STORY FINISHED: START BOSS
            if (
                AD_VINCENT.line >=
                AD_VINCENT_STORY.length
            ) {
                AD_VINCENT.mode = "battle";
                AD_VINCENT.phase = "menu";
                AD_VINCENT.phaseNumber = 1;

                AD_VINCENT.bossHP =
                    AD_VINCENT.bossMaxHP;

                AD_VINCENT.menu = 0;
                AD_VINCENT.bullets = [];
                AD_VINCENT.attackTimer = 0;
                AD_VINCENT.bulletTimer = 0;

                AD_VINCENT.message =
                    "VINCENT IS READY.";

                AD_VINCENT.heart.x = W / 2;
                AD_VINCENT.heart.y = 300;
            }
        }

        return;
    }

    if (AD_VINCENT.mode !== "battle") return;

    // -----------------------------------------------
    // DODGE MOVEMENT
    // -----------------------------------------------

    if (AD_VINCENT.phase === "dodge") {
        if (
            key.startsWith("arrow") ||
            ["w", "a", "s", "d"].includes(key)
        ) {
            if (
                key === "arrowleft" ||
                key === "a"
            ) {
                AD_VINCENT.heart.x -= 18;
            }

            if (
                key === "arrowright" ||
                key === "d"
            ) {
                AD_VINCENT.heart.x += 18;
            }

            if (
                key === "arrowup" ||
                key === "w"
            ) {
                AD_VINCENT.heart.y -= 18;
            }

            if (
                key === "arrowdown" ||
                key === "s"
            ) {
                AD_VINCENT.heart.y += 18;
            }
        }

        return;
    }

    // -----------------------------------------------
    // FIGHT TIMING BAR
    // -----------------------------------------------

    if (AD_VINCENT.phase === "aim") {
        if (key === "z" || key === "enter") {
            const accuracy = Math.max(
                0,
                1 -
                Math.abs(
                    AD_VINCENT.aimX - 260
                ) / 190
            );

            const weapon = itemInfo[equippedWeapon];
            const power = weapon?.power || 3;

            const damage = Math.round(
                power * (0.5 + accuracy * 2)
            );

            AD_VINCENT.bossHP = Math.max(
                0,
                AD_VINCENT.bossHP - damage
            );

            AD_VINCENT.message =
                "YOU DEALT " + damage + " DAMAGE!";

            if (AD_VINCENT.bossHP <= 0) {
                AD_VINCENT.mode = "victory";
                AD_VINCENT.timer = 0;
            } else {
                AD_VINCENT.phase = "menu";
            }
        }

        return;
    }

    // -----------------------------------------------
    // MENU NAVIGATION
    // -----------------------------------------------

    if (AD_VINCENT.phase === "menu") {

        if (
            key === "arrowleft" ||
            key === "a" ||
            key === "arrowup" ||
            key === "w"
        ) {
            AD_VINCENT.menu = Math.max(
                0,
                AD_VINCENT.menu - 1
            );
        }

        if (
            key === "arrowright" ||
            key === "d" ||
            key === "arrowdown" ||
            key === "s"
        ) {
            AD_VINCENT.menu = Math.min(
                2,
                AD_VINCENT.menu + 1
            );
        }

        if (key === "z" || key === "enter") {

            // FIGHT
            if (AD_VINCENT.menu === 0) {
                AD_VINCENT.phase = "aim";
                AD_VINCENT.aimX = 70;
                AD_VINCENT.aimDirection = 1;

                return;
            }

            // OBSERVE
            if (AD_VINCENT.menu === 1) {
                AD_VINCENT.message =
                    "You observe Vincent. He seems amused.";

                AD_VINCENT.phase = "enemy";
                AD_VINCENT.attackTimer = 0;

                return;
            }

            // ITEM
            if (AD_VINCENT.menu === 2) {

                if (player.hp >= player.maxHp) {
                    AD_VINCENT.message =
                        "YOUR HP IS ALREADY FULL.";

                    return;
                }

                const healingItem = inventory.find(item =>
                    itemInfo[item.id]?.type === "healing"
                );

                if (healingItem) {
                    const info = itemInfo[healingItem.id];
                    const before = player.hp;

                    player.hp = info.fullHeal
                        ? player.maxHp
                        : Math.min(
                            player.maxHp,
                            player.hp + info.heal
                        );

                    removeItem(healingItem.id);

                    AD_VINCENT.message =
                        "RECOVERED " +
                        (player.hp - before) +
                        " HP.";

                    AD_VINCENT.phase = "enemy";
                    AD_VINCENT.attackTimer = 0;

                } else {
                    AD_VINCENT.message =
                        "YOU HAVE NO HEALING ITEMS.";
                }
            }
        }
    }
}, true);

// -----------------------------------------------------
// BOSS UPDATE
// -----------------------------------------------------

function updateVincentBattle() {
    if (AD_VINCENT.mode !== "battle") return;

    // PHASE PROGRESSION
    if (AD_VINCENT.bossHP <= 240) {
        AD_VINCENT.phaseNumber = 2;
    }

    if (AD_VINCENT.bossHP <= 120) {
        AD_VINCENT.phaseNumber = 3;
    }

    // -----------------------------------------------
    // FIGHT TIMING BAR
    // -----------------------------------------------

    if (AD_VINCENT.phase === "aim") {
        AD_VINCENT.aimX +=
            AD_VINCENT.aimDirection * 5;

        if (AD_VINCENT.aimX >= 450) {
            AD_VINCENT.aimX = 450;
            AD_VINCENT.aimDirection = -1;
        }

        if (AD_VINCENT.aimX <= 70) {
            AD_VINCENT.aimX = 70;
            AD_VINCENT.aimDirection = 1;
        }
    }

    // -----------------------------------------------
    // VINCENT'S ATTACK
    // -----------------------------------------------

    if (AD_VINCENT.phase === "enemy") {
        AD_VINCENT.attackTimer++;

        if (AD_VINCENT.attackTimer % 18 === 0) {
            const phase = AD_VINCENT.phaseNumber;

            AD_VINCENT.bullets.push({
                x: Math.random() * (W - 100) + 50,
                y: 240,
                speed: 2.5 + phase * 0.8,
                size: 6 + phase,
                hit: false
            });
        }

        if (AD_VINCENT.attackTimer >= 150) {
            AD_VINCENT.phase = "dodge";

            AD_VINCENT.attackTimer = 0;
            AD_VINCENT.bulletTimer = 0;

            AD_VINCENT.heart.x = W / 2;
            AD_VINCENT.heart.y = 300;

            AD_VINCENT.message =
                "DODGE VINCENT'S ATTACKS!";
        }
    }

    // -----------------------------------------------
    // DODGE PHASE
    // -----------------------------------------------

    if (AD_VINCENT.phase === "dodge") {
        AD_VINCENT.bulletTimer++;

        AD_VINCENT.heart.x = Math.max(
            60,
            Math.min(
                W - 60,
                AD_VINCENT.heart.x
            )
        );

        AD_VINCENT.heart.y = Math.max(
            245,
            Math.min(
                350,
                AD_VINCENT.heart.y
            )
        );

        AD_VINCENT.bullets.forEach(bullet => {
            bullet.y += bullet.speed;

            if (
                Math.hypot(
                    bullet.x - AD_VINCENT.heart.x,
                    bullet.y - AD_VINCENT.heart.y
                ) < bullet.size + 10
            ) {
                if (!bullet.hit) {
                    bullet.hit = true;

                    player.hp = Math.max(
                        0,
                        player.hp - 2
                    );
                }

                if (player.hp <= 0) {
                    AD_VINCENT.active = false;
                    paused = false;

                    triggerGameOver();
                }
            }
        });

        AD_VINCENT.bullets =
            AD_VINCENT.bullets.filter(
                bullet =>
                    !bullet.hit &&
                    bullet.y < H + 20
            );

        if (AD_VINCENT.bulletTimer >= 180) {
            AD_VINCENT.bullets = [];

            AD_VINCENT.phase = "menu";
            AD_VINCENT.menu = 0;

            AD_VINCENT.message = "YOUR TURN.";
        }
    }
}

// -----------------------------------------------------
// TEXT HELPER
// -----------------------------------------------------

function vincentText(
    text,
    x,
    y,
    size = 16,
    color = "white"
) {
    ctx.fillStyle = color;
    ctx.font = size + "px monospace";
    ctx.textAlign = "center";

    ctx.fillText(text, x, y);
}

// -----------------------------------------------------
// VINCENT SPRITE
// -----------------------------------------------------

function drawVincentSprite(x, y, width, height) {
    if (
        AD_VINCENT.sprite.complete &&
        AD_VINCENT.sprite.naturalWidth > 0
    ) {
        ctx.drawImage(
            AD_VINCENT.sprite,
            x - width / 2,
            y - height,
            width,
            height
        );
    } else {
        vincentText(
            "VINCENT",
            x,
            y,
            20,
            "#dddddd"
        );
    }
}

// -----------------------------------------------------
// PLAYER SPRITE FOR BOSS BATTLE
// Uses the player sprite already loaded by script.js.
// Exact registered sprite key: "player"
// -----------------------------------------------------

function drawVincentPlayerSprite(x, y) {
    const loaded = adDrawSprite(
        "player",
        x,
        y,
        40,
        48,
        {
            camera: false,
            offset: 17
        }
    );

    if (!loaded) {
        vincentText(
            "LOADING PLAYER...",
            x,
            y,
            10,
            "#ffffff"
        );
    }

    vincentText(
        "YOU",
        x,
        y + 35,
        10,
        "#ffffff"
    );
}

// -----------------------------------------------------
// STORY DRAWING
// -----------------------------------------------------

function drawVincentStory() {
    const scene =
        AD_VINCENT_STORY[AD_VINCENT.line];

    if (!scene) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // EXPLOSION FLASH
    if (AD_VINCENT.line === 5) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
    }

    // THE EMPTY VOID
    if (
        AD_VINCENT.line >= 6 &&
        AD_VINCENT.line <= 11
    ) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
    }

    // VINCENT APPEARS
    if (AD_VINCENT.line >= 12) {
        ctx.fillStyle = "#050509";
        ctx.fillRect(0, 0, W, H);

        drawVincentSprite(
            W / 2,
            245,
            150,
            220
        );

        // Start soundtrack exactly once.
        if (!AD_VINCENT.soundtrackStarted) {
            AD_VINCENT.soundtrackStarted = true;
            playMusic("vincent");
        }
    }

    // DIALOGUE BOX
    ctx.fillStyle = "#080808";
    ctx.fillRect(
        15,
        H - 105,
        W - 30,
        90
    );

    ctx.strokeStyle = "#dedede";
    ctx.lineWidth = 2;

    ctx.strokeRect(
        15,
        H - 105,
        W - 30,
        90
    );

    vincentText(
        scene.speaker,
        90,
        H - 80,
        13,
        "#e5c16e"
    );

    ctx.fillStyle = "white";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";

    ctx.fillText(
        scene.text,
        35,
        H - 53,
        W - 70
    );

    vincentText(
        "Z / ENTER - CONTINUE",
        W / 2,
        H - 20,
        10,
        "#aaa"
    );
}

// -----------------------------------------------------
// BOSS BATTLE DRAWING
// -----------------------------------------------------

function drawVincentBattle() {
    ctx.fillStyle = "#08070d";
    ctx.fillRect(0, 0, W, H);

    // VINCENT
    drawVincentSprite(
        W / 2,
        210,
        125,
        180
    );

    // ACTUAL PLAYER IMAGE
    drawVincentPlayerSprite(95, 205);

    vincentText(
        "VINCENT",
        W / 2,
        25,
        18,
        "#eee"
    );

    // BOSS HP BAR
    ctx.fillStyle = "#45232e";
    ctx.fillRect(120, 43, 280, 9);

    ctx.fillStyle = "#bd405d";

    ctx.fillRect(
        120,
        43,
        280 * (
            AD_VINCENT.bossHP /
            AD_VINCENT.bossMaxHP
        ),
        9
    );

    vincentText(
        "HP " +
        AD_VINCENT.bossHP +
        " / " +
        AD_VINCENT.bossMaxHP,
        W / 2,
        70,
        11
    );

    // -----------------------------------------------
    // MENU
    // -----------------------------------------------

    if (AD_VINCENT.phase === "menu") {
        ctx.fillStyle = "#17131f";
        ctx.fillRect(
            35,
            230,
            W - 70,
            135
        );

        ctx.strokeStyle = "#ddd";

        ctx.strokeRect(
            35,
            230,
            W - 70,
            135
        );

        const options = [
            "FIGHT",
            "OBSERVE",
            "ITEM"
        ];

        options.forEach((option, i) => {
            vincentText(
                (i === AD_VINCENT.menu ? "> " : "  ") +
                option,
                100 + i * 160,
                280,
                14,
                i === AD_VINCENT.menu
                    ? "#ffe28a"
                    : "white"
            );
        });

        vincentText(
            AD_VINCENT.message,
            W / 2,
            330,
            11
        );

        vincentText(
            "ARROWS = SELECT | Z = CONFIRM",
            W / 2,
            350,
            10,
            "#aaa"
        );
    }

    // -----------------------------------------------
    // FIGHT TIMING BAR
    // -----------------------------------------------

    if (AD_VINCENT.phase === "aim") {
        ctx.fillStyle = "#201a2a";

        ctx.fillRect(
            45,
            250,
            W - 90,
            70
        );

        ctx.strokeStyle = "#eee";

        ctx.strokeRect(
            70,
            275,
            380,
            18
        );

        ctx.fillStyle = "#3d936d";

        ctx.fillRect(
            245,
            275,
            30,
            18
        );

        ctx.fillStyle = "#fff";

        ctx.fillRect(
            AD_VINCENT.aimX,
            270,
            5,
            28
        );

        vincentText(
            "PRESS Z / ENTER NEAR THE CENTRE",
            W / 2,
            340,
            11
        );
    }

    // -----------------------------------------------
    // ENEMY ATTACK AND DODGE
    // -----------------------------------------------

    if (
        AD_VINCENT.phase === "enemy" ||
        AD_VINCENT.phase === "dodge"
    ) {
        ctx.fillStyle = "#18131f";

        ctx.fillRect(
            45,
            230,
            W - 90,
            140
        );

        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 2;

        ctx.strokeRect(
            45,
            230,
            W - 90,
            140
        );

        // BULLETS
        AD_VINCENT.bullets.forEach(bullet => {
            ctx.fillStyle = "#d7c5ff";

            ctx.beginPath();

            ctx.arc(
                bullet.x,
                bullet.y,
                bullet.size,
                0,
                Math.PI * 2
            );

            ctx.fill();
        });

        // PLAYER HEART
        ctx.fillStyle = "#ff334d";

        ctx.beginPath();

        ctx.moveTo(
            AD_VINCENT.heart.x,
            AD_VINCENT.heart.y + 7
        );

        ctx.arc(
            AD_VINCENT.heart.x - 5,
            AD_VINCENT.heart.y - 3,
            6,
            0,
            Math.PI
        );

        ctx.arc(
            AD_VINCENT.heart.x + 5,
            AD_VINCENT.heart.y - 3,
            6,
            0,
            Math.PI
        );

        ctx.fill();

        vincentText(
            "MOVE WITH ARROW KEYS OR WASD",
            W / 2,
            385,
            10
        );
    }

    vincentText(
        "YOUR HP: " +
        player.hp +
        " / " +
        player.maxHp,
        W / 2,
        415,
        12
    );
}

// -----------------------------------------------------
// VICTORY
// -----------------------------------------------------

function finishVincentBattle() {
    AD_VINCENT.active = false;
    AD_VINCENT.mode = "finished";

    paused = false;
    battleOpen = false;

    playMusic("exploration");

    saveGame();

    showDialogue(
        "VINCENT",
        "Well... that was entertaining. We shall meet again."
    );
}

// -----------------------------------------------------
// DRAW OVER EXISTING GAME
// -----------------------------------------------------

const AD_VINCENT_OLD_DRAW_INVENTORY = drawInventory;

drawInventory = function () {
    AD_VINCENT_OLD_DRAW_INVENTORY();

    if (!AD_VINCENT.active) return;

    if (AD_VINCENT.mode === "story") {
        drawVincentStory();
    }

    if (AD_VINCENT.mode === "battle") {
        updateVincentBattle();
        drawVincentBattle();
    }

    if (AD_VINCENT.mode === "victory") {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        drawVincentSprite(
            W / 2,
            250,
            130,
            190
        );

        vincentText(
            "VINCENT DEFEATED",
            W / 2,
            330,
            20,
            "#e5c16e"
        );

        vincentText(
            "THE END... FOR NOW.",
            W / 2,
            365,
            12
        );

        AD_VINCENT.timer++;

        if (AD_VINCENT.timer > 180) {
            finishVincentBattle();
        }
    }
};

console.log(
    "ALTER DUNE — VINCENT SEQUENCE LOADED"
);
