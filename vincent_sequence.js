
/* =====================================================
   ALTER DUNE — VINCENT SEQUENCE
   Grand Hall TNT Event + Original Battle Engine

   Requires:
   - script.js (loaded FIRST)
   - vincentsprite.png
   - Analysis output 1.png (loaded by script.js)
   - VINCENT.mp3

   IMPORTANT:
   Vincent uses the ORIGINAL ALTER DUNE battle system.
   ===================================================== */


// =====================================================
// 1. VINCENT SOUNDTRACK
// =====================================================

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


// =====================================================
// 2. VINCENT STATE
// =====================================================

const AD_VINCENT = {
    active: false,
    mode: "story",
    line: 0,

    bossHP: 360,
    bossMaxHP: 360,

    defeated: false,
    soundtrackStarted: false,

    sprite: new Image(),
    enemy: null
};

AD_VINCENT.sprite.src = "./vincentsprite.png";

AD_VINCENT.sprite.addEventListener("error", () => {
    console.error(
        "Could not load Vincent sprite:",
        AD_VINCENT.sprite.src
    );
});


// =====================================================
// 3. STORY
// =====================================================

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


// =====================================================
// 4. CREATE VINCENT AS AN ORIGINAL BATTLE ENEMY
// =====================================================

function createVincentEnemy() {
    return {
        id: "vincent",
        name: "Vincent",

        hp: AD_VINCENT.bossMaxHP,
        maxHp: AD_VINCENT.bossMaxHP,

        // Damage dealt when his projectiles hit.
        damage: 6,

        color: "#a7a7b5",
        difficulty: 3,

        active: true,
        defeated: false,
        spared: false,

        actScore: 0,
        fleeGrace: 0,
        alerted: true,

        // Extra battle information.
        phaseNumber: 1
    };
}


// =====================================================
// 5. START VINCENT STORY
// =====================================================

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

    AD_VINCENT.active = true;
    AD_VINCENT.mode = "story";
    AD_VINCENT.line = 0;

    AD_VINCENT.defeated = false;
    AD_VINCENT.soundtrackStarted = false;

    AD_VINCENT.bossHP = AD_VINCENT.bossMaxHP;

    AD_VINCENT.enemy = createVincentEnemy();

    paused = true;
    battleOpen = false;
    dialogueOpen = false;
    inventoryOpen = false;

    keys = {};
}


// =====================================================
// 6. CONNECT TO ORIGINAL INTERACTION SYSTEM
// =====================================================

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


// =====================================================
// 7. STORY INPUT
// =====================================================

// Capture input BEFORE the original game keyboard handler.
// This only intercepts input during Vincent's story.
// The original battle input remains untouched.

document.addEventListener("keydown", function (e) {
    if (
        !AD_VINCENT.active ||
        AD_VINCENT.mode !== "story"
    ) {
        return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    const key = e.key.toLowerCase();

    if (
        key !== "z" &&
        key !== "enter" &&
        key !== " "
    ) {
        return;
    }

    AD_VINCENT.line++;

    // -----------------------------------------------
    // TNT EXPLOSION
    // -----------------------------------------------

    if (
        AD_VINCENT.line === 5 &&
        !castleDestroyed
    ) {
        removeItem("tnt");

        castleDestroyed = true;

        saveGame();
        updateLocation();
    }

    // -----------------------------------------------
    // STORY COMPLETE: START ORIGINAL BATTLE
    // -----------------------------------------------

    if (
        AD_VINCENT.line >=
        AD_VINCENT_STORY.length
    ) {
        AD_VINCENT.mode = "battle";

        AD_VINCENT.enemy = createVincentEnemy();

        paused = false;

        // This calls the real startBattle()
        // from script.js.
        startBattle(AD_VINCENT.enemy);

        // The original startBattle() selects normal
        // fight music. Replace it with Vincent's music.
        playMusic("vincent");

        AD_VINCENT.soundtrackStarted = true;
    }
}, true);


// =====================================================
// 8. VINCENT'S CUSTOM PROJECTILE PATTERNS
// =====================================================

// Preserve the original projectile attack function.
const AD_VINCENT_OLD_CREATE_ENEMY_ATTACK =
    createEnemyAttack;

// Vincent gets custom attacks.
// Every other enemy keeps its original attacks.

createEnemyAttack = function (enemy) {
    if (!enemy || enemy.id !== "vincent") {
        return AD_VINCENT_OLD_CREATE_ENEMY_ATTACK(enemy);
    }

    const pattern = battle.turn % 4;

    const phase =
        enemy.hp <= 120 ? 3 :
        enemy.hp <= 240 ? 2 : 1;

    enemy.phaseNumber = phase;

    const speedMultiplier = 1 + (phase - 1) * 0.35;

    // -----------------------------------------------
    // PATTERN 0: COSMIC RAIN
    // -----------------------------------------------

    if (pattern === 0) {
        for (let i = 0; i < 8; i++) {
            spawnProjectile(
                65 + i * 55,
                75,
                0,
                (2.5 + phase * 0.45) * speedMultiplier,
                9
            );
        }

        return;
    }

    // -----------------------------------------------
    // PATTERN 1: AWARENESS
    // Vincent aims a spread towards the player's heart.
    // -----------------------------------------------

    if (pattern === 1) {
        const angle = Math.atan2(
            battle.heart.y - 85,
            battle.heart.x - W / 2
        );

        for (let i = -2; i <= 2; i++) {
            const shotAngle = angle + i * 0.2;

            spawnProjectile(
                W / 2,
                85,
                Math.cos(shotAngle) * 3.2 * speedMultiplier,
                Math.sin(shotAngle) * 3.2 * speedMultiplier,
                9
            );
        }

        return;
    }

    // -----------------------------------------------
    // PATTERN 2: VOID WALL
    // -----------------------------------------------

    if (pattern === 2) {
        const gap = Math.floor(Math.random() * 8);

        for (let i = 0; i < 8; i++) {
            if (i === gap) continue;

            spawnProjectile(
                65 + i * 55,
                75,
                0,
                3.1 * speedMultiplier,
                10
            );
        }

        return;
    }

    // -----------------------------------------------
    // PATTERN 3: HYPER COSMIC BURST
    // -----------------------------------------------

    for (let i = 0; i < 10; i++) {
        const angle =
            (Math.PI * 2 * i) / 10;

        spawnProjectile(
            W / 2,
            170,
            Math.cos(angle) * 3.2 * speedMultiplier,
            Math.sin(angle) * 3.2 * speedMultiplier,
            8
        );
    }
};


// =====================================================
// 9. VINCENT ACT DIALOGUE
// =====================================================

// Preserve the original enemy descriptions.
const AD_VINCENT_OLD_DESCRIPTION =
    getEnemyDescription;

getEnemyDescription = function (enemy) {
    if (enemy?.id === "vincent") {
        return "A being cursed with Hyper Cosmic Awareness. He knows every possibility.";
    }

    return AD_VINCENT_OLD_DESCRIPTION(enemy);
};


// Preserve the original enemy TALK dialogue.
const AD_VINCENT_OLD_TALK = getEnemyTalk;

getEnemyTalk = function (enemy) {
    if (enemy?.id === "vincent") {
        return "Vincent tells you that he already knows what you are going to say.";
    }

    return AD_VINCENT_OLD_TALK(enemy);
};


// Preserve the original enemy JOKE dialogue.
const AD_VINCENT_OLD_JOKE = getEnemyJoke;

getEnemyJoke = function (enemy) {
    if (enemy?.id === "vincent") {
        return "You tell Vincent a joke. He laughs before you finish telling it.";
    }

    return AD_VINCENT_OLD_JOKE(enemy);
};


// =====================================================
// 10. VINCENT CANNOT BE SPARED OR ESCAPED
// =====================================================

const AD_VINCENT_OLD_SPARE = attemptSpare;

attemptSpare = function () {
    if (battle.enemy?.id === "vincent") {
        battle.message =
            "Vincent already knows how this ends.";

        return;
    }

    AD_VINCENT_OLD_SPARE();
};


const AD_VINCENT_OLD_FLEE = attemptFlee;

attemptFlee = function () {
    if (battle.enemy?.id === "vincent") {
        battle.message =
            "There is nowhere to run.";

        beginEnemyTurn();
        return;
    }

    AD_VINCENT_OLD_FLEE();
};


// =====================================================
// 11. VINCENT DEFEAT EVENT
// =====================================================

// Preserve the original defeat handler.
const AD_VINCENT_OLD_HANDLE_DEFEAT =
    handleEnemyDefeat;

handleEnemyDefeat = function (enemy) {
    if (!enemy || enemy.id !== "vincent") {
        return AD_VINCENT_OLD_HANDLE_DEFEAT(enemy);
    }

    enemy.hp = 0;
    enemy.defeated = true;
    enemy.active = false;

    AD_VINCENT.defeated = true;
    AD_VINCENT.active = false;
    AD_VINCENT.mode = "finished";

    // Use the original battle-ending function.
    finishBattle(true);

    showDialogue(
        "VINCENT",
        "Well... that was entertaining. We shall meet again."
    );
};


// =====================================================
// 12. VINCENT SPRITE DRAWING
// =====================================================

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
        ctx.fillStyle = "#dddddd";
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";

        ctx.fillText("VINCENT", x, y - 10);
    }
}


// =====================================================
// 13. ORIGINAL BATTLE SCREEN + VINCENT SPRITE
// =====================================================

// Preserve the original battle renderer.
const AD_VINCENT_OLD_DRAW_BATTLE = drawBattle;

drawBattle = function () {
    // Draw the COMPLETE original battle screen:
    // - HP bar
    // - FIGHT / ACT / ITEM / MERCY
    // - Attack timing bar
    // - Dodge arena
    // - Player sprite
    // - Projectiles
    // - Battle messages

    AD_VINCENT_OLD_DRAW_BATTLE();

    if (
        !battleOpen ||
        battle.enemy?.id !== "vincent"
    ) {
        return;
    }

    // Vincent appears in the upper-right of
    // the original battle screen.
    drawVincentSprite(
        W - 55,
        88,
        52,
        70
    );
};


// =====================================================
// 14. STORY TEXT HELPER
// =====================================================

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


// =====================================================
// 15. STORY DRAWING
// =====================================================

function drawVincentStory() {
    if (AD_VINCENT.mode !== "story") return;

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

    // EMPTY VOID
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


// =====================================================
// 16. OVERLAY STORY ON EXISTING GAME
// =====================================================

// The original battle screen does NOT need to be
// redrawn here. It is already drawn by gameLoop()
// through the original drawBattle() function.

const AD_VINCENT_OLD_DRAW_INVENTORY =
    drawInventory;

drawInventory = function () {
    AD_VINCENT_OLD_DRAW_INVENTORY();

    if (!AD_VINCENT.active) return;

    if (AD_VINCENT.mode === "story") {
        drawVincentStory();
    }
};


// =====================================================
// 17. GAME OVER CLEANUP
// =====================================================

const AD_VINCENT_OLD_GAME_OVER =
    triggerGameOver;

triggerGameOver = function () {
    if (
        AD_VINCENT.active &&
        AD_VINCENT.mode === "battle"
    ) {
        AD_VINCENT.active = false;
        AD_VINCENT.mode = "gameover";
    }

    AD_VINCENT_OLD_GAME_OVER();
};


// =====================================================
// 18. READY
// =====================================================

console.log(
    "ALTER DUNE — VINCENT SEQUENCE LOADED"
);

console.log(
    "VINCENT BATTLE: ORIGINAL GAME ENGINE CONNECTED"
);
