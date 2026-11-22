
/* =====================================================
   ALTER DUNE — VINCENT SEQUENCE
   Grand Hall TNT Event + Original Battle Engine
   HARDER VINCENT BATTLE EDITION

   Requires:
   - script.js (loaded FIRST)
   - vincentsprite.png
   - Analysis output 1.png (loaded by script.js)
   - VINCENT.mp3
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
// VINCENT'S EXCLUSIVE BATTLE MUSIC
// =====================================================

const AD_VINCENT_OLD_UPDATE_BATTLE_MUSIC =
    updateBattleMusic;

updateBattleMusic = function (enemy) {

    if (enemy?.id === "vincent") {
        playMusic("vincent");
        return;
    }

    AD_VINCENT_OLD_UPDATE_BATTLE_MUSIC(enemy);
};



// =====================================================
// 2. VINCENT STATE
// =====================================================

const AD_VINCENT = {
    active: false,
    mode: "story",
    line: 0,

    bossHP: 500,
    bossMaxHP: 500,

    defeated: false,
    failed: false,
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

        damage: 3,
        color: "#a7a7b5",
        difficulty: 3,

        active: true,
        defeated: false,
        spared: false,

        actScore: 0,
        fleeGrace: 0,
        alerted: true,

        phaseNumber: 1,
        attackCount: 0
    };
}


// =====================================================
// 5. GRAND HALL CHECKPOINT
// =====================================================

function saveVincentCheckpoint() {
    checkpoint = {
        room: "hall",
        x: player.x,
        y: player.y,
        hp: player.maxHp
    };

    saveGame();

    console.log("VINCENT CHECKPOINT SAVED: GRAND HALL");
}


// =====================================================
// 6. START VINCENT STORY
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

    saveVincentCheckpoint();

    AD_VINCENT.active = true;
    AD_VINCENT.mode = "story";
    AD_VINCENT.line = 0;

    AD_VINCENT.defeated = false;
    AD_VINCENT.failed = false;
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
// 7. CONNECT TO ORIGINAL INTERACTION SYSTEM
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
// 8. STORY INPUT
// =====================================================

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

    // TNT EXPLOSION

    if (
        AD_VINCENT.line === 5 &&
        !castleDestroyed
    ) {
        removeItem("tnt");

        castleDestroyed = true;

        saveGame();
        updateLocation();
    }

    // START ORIGINAL BATTLE

    if (
        AD_VINCENT.line >= AD_VINCENT_STORY.length
    ) {
        AD_VINCENT.mode = "battle";

        AD_VINCENT.enemy = createVincentEnemy();

        paused = false;

        startBattle(AD_VINCENT.enemy);

        playMusic("vincent");

        AD_VINCENT.soundtrackStarted = true;
    }
}, true);


// =====================================================
// 9. VINCENT'S HARDER ATTACK SYSTEM
// =====================================================

const AD_VINCENT_OLD_CREATE_ENEMY_ATTACK =
    createEnemyAttack;

createEnemyAttack = function (enemy) {
    if (!enemy || enemy.id !== "vincent") {
        return AD_VINCENT_OLD_CREATE_ENEMY_ATTACK(enemy);
    }

    // Count every attack so the pattern sequence advances.
    enemy.attackCount = (enemy.attackCount || 0) + 1;

    // THREE PHASES

    const phase =
        enemy.hp <= 120 ? 3 :
        enemy.hp <= 240 ? 2 : 1;

    enemy.phaseNumber = phase;

    // Each phase gets faster.
    const speedMultiplier = [
    0.75,
    0.85,
    0.95
    ][phase - 1];

    // Six different patterns.
    const pattern = (enemy.attackCount - 1) % 6;

    const centerX = W / 2;
    const centerY = 85;

    const speed = (value) =>
        value * speedMultiplier;


    // -------------------------------------------------
    // PATTERN 0: COSMIC RAIN
    // A wider, faster shower of projectiles.
    // -------------------------------------------------

    if (pattern === 0) {
        const count = phase === 1 ? 9 : phase === 2 ? 11 : 13;

        for (let i = 0; i < count; i++) {
            const x = 45 + i * ((W - 90) / (count - 1));

            const delayOffset = (i % 2) * 12;

            spawnProjectile(
                x,
                65 + delayOffset,
                0,
                speed(3.0 + (i % 3) * 0.35),
                9
            );
        }

        return;
    }


    // -------------------------------------------------
    // PATTERN 1: HYPER AWARENESS
    // A wider aimed spread.
    // -------------------------------------------------

    if (pattern === 1) {
        const angle = Math.atan2(
            battle.heart.y - centerY,
            battle.heart.x - centerX
        );

        const spreadCount = phase === 1 ? 5 : phase === 2 ? 7 : 9;

        const spread = phase === 3 ? 0.15 : 0.19;

        for (let i = 0; i < spreadCount; i++) {
            const offset = i - (spreadCount - 1) / 2;

            const shotAngle = angle + offset * spread;

            const projectileSpeed = speed(
                phase === 3 ? 4.6 : 3.7
            );

            spawnProjectile(
                centerX,
                centerY,
                Math.cos(shotAngle) * projectileSpeed,
                Math.sin(shotAngle) * projectileSpeed,
                9
            );
        }

        return;
    }


    // -------------------------------------------------
    // PATTERN 2: VOID WALL
    // Two waves with shifting safe gaps.
    // -------------------------------------------------

    if (pattern === 2) {
        const columns = 10;

        const gapOne = enemy.attackCount % columns;
        const gapTwo = (gapOne + 4) % columns;

        for (let i = 0; i < columns; i++) {
            if (i !== gapOne) {
                spawnProjectile(
                    45 + i * ((W - 90) / (columns - 1)),
                    65,
                    0,
                    speed(3.3),
                    9
                );
            }

            if (
                phase >= 2 &&
                i !== gapTwo
            ) {
                spawnProjectile(
                    45 + i * ((W - 90) / (columns - 1)),
                    45,
                    0,
                    speed(3.8),
                    9
                );
            }
        }

        return;
    }


    // -------------------------------------------------
    // PATTERN 3: HYPER COSMIC BURST
    // A radial burst from the centre.
    // -------------------------------------------------

    if (pattern === 3) {
        const count = phase === 1 ? 12 : phase === 2 ? 16 : 20;

        for (let i = 0; i < count; i++) {
            const angle =
                (Math.PI * 2 * i) / count;

            const projectileSpeed = speed(
                phase === 3 ? 4.2 : 3.3
            );

            spawnProjectile(
                centerX,
                165,
                Math.cos(angle) * projectileSpeed,
                Math.sin(angle) * projectileSpeed,
                8
            );
        }

        return;
    }


    // -------------------------------------------------
    // PATTERN 4: REALITY CROSSOVER
    // Projectiles approach from both sides.
    // -------------------------------------------------

    if (pattern === 4) {
        const rows = phase === 1 ? 5 : phase === 2 ? 7 : 9;

        for (let i = 0; i < rows; i++) {
            const y = 65 + i * 23;

            // Left side
            spawnProjectile(
                45,
                y,
                speed(3.0),
                speed(0.15 * (i - rows / 2)),
                9
            );

            // Right side
            spawnProjectile(
                W - 45,
                y,
                -speed(3.0),
                speed(0.15 * (rows / 2 - i)),
                9
            );
        }

        return;
    }


    // -------------------------------------------------
    // PATTERN 5: HE KNOWS EVERYTHING
    // Aimed spread followed by a falling wave.
    // -------------------------------------------------

    if (pattern === 5) {
        const angle = Math.atan2(
            battle.heart.y - 85,
            battle.heart.x - centerX
        );

        const fanCount = phase === 1 ? 5 : phase === 2 ? 7 : 9;

        for (let i = 0; i < fanCount; i++) {
            const offset =
                i - (fanCount - 1) / 2;

            const shotAngle = angle + offset * 0.16;

            spawnProjectile(
                centerX,
                85,
                Math.cos(shotAngle) * speed(4.0),
                Math.sin(shotAngle) * speed(4.0),
                9
            );
        }

        const rainCount = phase === 1 ? 5 : phase === 2 ? 7 : 9;

        for (let i = 0; i < rainCount; i++) {
            const x =
                55 + i * ((W - 110) / (rainCount - 1));

            spawnProjectile(
                x,
                55,
                0,
                speed(3.2 + (i % 2) * 0.5),
                8
            );
        }

        return;
    }
};




// =====================================================
// 9B. VINCENT SEQUENTIAL ATTACK WAVES
// =====================================================

const AD_VINCENT_WAVES = {
    active: false,
    wave: 0,
    total: 0,
    pattern: 0
};

const AD_VINCENT_SINGLE_ATTACK = createEnemyAttack;

createEnemyAttack = function (enemy) {
    if (!enemy || enemy.id !== "vincent") {
        return AD_VINCENT_SINGLE_ATTACK(enemy);
    }

    // Always use the same pattern throughout this turn.
    enemy.attackCount = AD_VINCENT_WAVES.pattern;

    AD_VINCENT_SINGLE_ATTACK(enemy);
};


const AD_VINCENT_OLD_BEGIN_TURN = beginEnemyTurn;

beginEnemyTurn = function () {
    if (battle.enemy?.id === "vincent") {
        AD_VINCENT_WAVES.active = false;
        AD_VINCENT_WAVES.wave = 0;
        AD_VINCENT_WAVES.total = 0;
    }

    AD_VINCENT_OLD_BEGIN_TURN();
};






// =====================================================
// 10. VINCENT ACT DIALOGUE
// =====================================================

const AD_VINCENT_OLD_DESCRIPTION =
    getEnemyDescription;

getEnemyDescription = function (enemy) {
    if (enemy?.id === "vincent") {
        return "A being cursed with Hyper Cosmic Awareness. He knows every possibility.";
    }

    return AD_VINCENT_OLD_DESCRIPTION(enemy);
};


const AD_VINCENT_OLD_TALK = getEnemyTalk;

getEnemyTalk = function (enemy) {
    if (enemy?.id === "vincent") {
        return "Vincent tells you that he already knows what you are going to say.";
    }

    return AD_VINCENT_OLD_TALK(enemy);
};


const AD_VINCENT_OLD_JOKE = getEnemyJoke;

getEnemyJoke = function (enemy) {
    if (enemy?.id === "vincent") {
        return "You tell Vincent a joke. He laughs before you finish telling it.";
    }

    return AD_VINCENT_OLD_JOKE(enemy);
};


// =====================================================
// 11. VINCENT CANNOT BE SPARED OR ESCAPED
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
        battle.message = "There is nowhere to run!";
        beginEnemyTurn();
        return;
    }

    AD_VINCENT_OLD_FLEE();
};


// =====================================================
// 12. VINCENT DEFEAT EVENT
// =====================================================

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
    AD_VINCENT.failed = false;
    AD_VINCENT.active = false;
    AD_VINCENT.mode = "finished";

    localStorage.setItem(
        "adVincentDefeated",
        "true"
    );

    finishBattle(true);

    showDialogue(
    "VINCENT",
    "Well... that was entertaining. We shall meet again. You know that I'll return everytime you reset"
);

setTimeout(() => {
    adStartGenocideEnding();
}, 3000);
};


// =====================================================
// 13. VINCENT SPRITE DRAWING
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
// 14. ORIGINAL BATTLE SCREEN + VINCENT SPRITE
// =====================================================

const AD_VINCENT_OLD_DRAW_BATTLE = drawBattle;

drawBattle = function () {
    AD_VINCENT_OLD_DRAW_BATTLE();

    if (
        !battleOpen ||
        battle.enemy?.id !== "vincent"
    ) {
        return;
    }

    drawVincentSprite(
        W - 55,
        88,
        52,
        70
    );
};


// =====================================================
// 15. STORY TEXT HELPER
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
// 16. STORY DRAWING
// =====================================================

function drawVincentStory() {
    if (AD_VINCENT.mode !== "story") return;

    const scene =
        AD_VINCENT_STORY[AD_VINCENT.line];

    if (!scene) return;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (AD_VINCENT.line === 5) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, W, H);
    }

    if (
        AD_VINCENT.line >= 6 &&
        AD_VINCENT.line <= 11
    ) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);
    }

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

    ctx.fillStyle = "#080808";
    ctx.fillRect(15, H - 105, W - 30, 90);

    ctx.strokeStyle = "#dedede";
    ctx.lineWidth = 2;
    ctx.strokeRect(15, H - 105, W - 30, 90);

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
// 17. OVERLAY STORY ON EXISTING GAME
// =====================================================

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
// 18. PLAYER DEFEAT — RESTORE GRAND HALL
// =====================================================

const AD_VINCENT_OLD_GAME_OVER =
    triggerGameOver;

triggerGameOver = function () {
    if (
        AD_VINCENT.active &&
        AD_VINCENT.mode === "battle"
    ) {
        AD_VINCENT.failed = true;
        AD_VINCENT.active = false;
        AD_VINCENT.mode = "gameover";

        castleDestroyed = false;

        if (!hasItem("tnt")) {
            addItem("tnt");
        }

        checkpoint = {
            room: "hall",
            x: checkpoint.x,
            y: checkpoint.y,
            hp: player.maxHp
        };

        currentRoom = "hall";

        saveGame();

        console.log(
            "VINCENT DEFEAT: GRAND HALL RESTORED"
        );
    }

    AD_VINCENT_OLD_GAME_OVER();
};


// =====================================================
// 19. RETRY — RETURN TO GRAND HALL
// =====================================================

const AD_VINCENT_OLD_RETRY_CHECKPOINT =
    retryCheckpoint;

retryCheckpoint = function () {
    const wasVincentDefeat = AD_VINCENT.failed;

    AD_VINCENT_OLD_RETRY_CHECKPOINT();

    if (wasVincentDefeat) {
        castleDestroyed = false;
        currentRoom = "hall";

        if (!hasItem("tnt")) {
            addItem("tnt");
        }

        AD_VINCENT.active = false;
        AD_VINCENT.mode = "story";
        AD_VINCENT.line = 0;

        AD_VINCENT.failed = false;
        AD_VINCENT.defeated = false;
        AD_VINCENT.soundtrackStarted = false;

        AD_VINCENT.bossHP = AD_VINCENT.bossMaxHP;
        AD_VINCENT.enemy = createVincentEnemy();

        battle.enemy = null;
        battleOpen = false;

        paused = false;
        gameOver = false;

        saveGame();
        updateLocation();

        console.log(
            "VINCENT RETRY: PLAYER RETURNED TO GRAND HALL"
        );
    }
};


// =====================================================
// 20. RESET VINCENT DEFEAT FLAG ON NEW GAME
// =====================================================

const AD_VINCENT_OLD_START_NEW_GAME =
    startNewGame;

startNewGame = function () {
    localStorage.removeItem("adVincentDefeated");

    AD_VINCENT.active = false;
    AD_VINCENT.mode = "story";
    AD_VINCENT.line = 0;

    AD_VINCENT.defeated = false;
    AD_VINCENT.failed = false;
    AD_VINCENT.soundtrackStarted = false;

    AD_VINCENT.bossHP = AD_VINCENT.bossMaxHP;
    AD_VINCENT.enemy = null;

    AD_VINCENT_OLD_START_NEW_GAME();
};



// =====================================================
// 21. RESUME VINCENT AFTER SAVE LOAD — ACTUAL FIX
// =====================================================

// The old resume check ran too early:
// castleDestroyed had not been restored yet.
//
// Instead, wait until loadGame() has finished.

const AD_VINCENT_OLD_LOAD_GAME = loadGame;

loadGame = function () {

    // Load the player's actual save first.
    AD_VINCENT_OLD_LOAD_GAME();

    // Only resume if the castle was destroyed
    // and Vincent has not already been defeated.
    if (
        !castleDestroyed ||
        localStorage.getItem("adVincentDefeated") === "true"
    ) {
        return;
    }

    // Restore Vincent's appearance scene.
    AD_VINCENT.active = true;
    AD_VINCENT.mode = "story";
    AD_VINCENT.line = 12;

    AD_VINCENT.bossHP = AD_VINCENT.bossMaxHP;
    AD_VINCENT.enemy = createVincentEnemy();

    AD_VINCENT.defeated = false;
    AD_VINCENT.failed = false;
    AD_VINCENT.soundtrackStarted = false;

    // Restore the encounter's rendering and controls.
    currentRoom = "hall";

    paused = false;
    battleOpen = false;
    dialogueOpen = false;
    inventoryOpen = false;

    gameOver = false;
    keys = {};

    updateLocation();

    console.log(
        "VINCENT SAVE RECOVERED: APPEARANCE SCENE"
    );
};




// =====================================================
// 22. READY
// =====================================================

console.log(
    "ALTER DUNE — VINCENT SEQUENCE LOADED"
);

console.log(
    "VINCENT BATTLE: HARDER ATTACKS ENABLED"
);



/* =====================================================
   ALTER DUNE — VOID EXIT & GENOCIDE ENDING
   ===================================================== */

const AD_GENOCIDE = {
    active: false,
    complete: localStorage.getItem("adGenocideComplete") === "true",
    doorX: 10,
    doorY: 2
};

// -----------------------------------------------------
// SYNTHESIZED VINCENT LAUGH
// -----------------------------------------------------


function adPlayVincentLaugh() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        const audio = new AudioContextClass();
        const now = audio.currentTime;

        // Each pair represents one "HA" syllable:
        // [start time, pitch, duration]
        const laughs = [
            [0.00, 390, 0.13],
            [0.22, 470, 0.12],
            [0.48, 350, 0.16],
            [0.78, 510, 0.12],
            [1.02, 420, 0.15],
            [1.35, 300, 0.22],
            [1.75, 440, 0.13],
            [2.02, 330, 0.28]
        ];

        for (const [delay, frequency, duration] of laughs) {
            const start = now + delay;

            const oscillator = audio.createOscillator();
            const gain = audio.createGain();

            const filter = audio.createBiquadFilter();

            oscillator.type = "triangle";

            oscillator.frequency.setValueAtTime(
                frequency,
                start
            );

            oscillator.frequency.exponentialRampToValueAtTime(
                frequency * 0.72,
                start + duration
            );

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1800, start);

            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(
                0.22,
                start + 0.025
            );
            gain.gain.exponentialRampToValueAtTime(
                0.001,
                start + duration
            );

            oscillator.connect(filter);
            filter.connect(gain);
            gain.connect(audio.destination);

            oscillator.start(start);
            oscillator.stop(start + duration + 0.02);
        }

        setTimeout(() => {
            audio.close();
        }, 3500);

    } catch (error) {
        console.warn("Vincent laugh could not play:", error);
    }
}

// -----------------------------------------------------
// DRAW VOID DOOR
// -----------------------------------------------------

const AD_OLD_DRAW_DESTROYED_CASTLE = drawDestroyedCastle;

drawDestroyedCastle = function () {
    AD_OLD_DRAW_DESTROYED_CASTLE();

    const x = AD_GENOCIDE.doorX * TILE - camera.x;
    const y = AD_GENOCIDE.doorY * TILE - camera.y;

    const unlocked =
        localStorage.getItem("adVincentDefeated") === "true";

    ctx.fillStyle = unlocked ? "#321b42" : "#17121f";
    ctx.fillRect(x, y, 32, 32);

    ctx.strokeStyle = unlocked ? "#c77dff" : "#51445a";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, 32, 32);

    ctx.fillStyle = unlocked ? "#e8baff" : "#77707f";
    ctx.fillRect(x + 23, y + 15, 4, 4);

    ctx.fillStyle = "#ffffff";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(
        unlocked ? "EXIT" : "LOCKED",
        x + 16,
        y - 5
    );
    ctx.textAlign = "left";
};

// -----------------------------------------------------
// GENOCIDE ENDING
// -----------------------------------------------------

function adStartGenocideEnding() {
    if (AD_GENOCIDE.active) return;
    AD_GENOCIDE.active = true;
    endingStarted = true;

    localStorage.setItem("adGenocideComplete", "true");

    paused = true;
    battleOpen = false;
    dialogueOpen = false;
    inventoryOpen = false;
    gameOver = false;
    keys = {};

    adPlayVincentLaugh();
}

// -----------------------------------------------------
// VOID DOOR INTERACTION — FIXED
// -----------------------------------------------------

const AD_OLD_INTERACT_VOID = interact;

interact = function () {
    if (castleDestroyed) {

        // Vincent must be defeated first.
        if (
            localStorage.getItem("adVincentDefeated") !== "true"
        ) {
            showDialogue(
                "THE VOID",
                "The door refuses to open."
            );
            return;
        }

        // The destroyed castle has no other interactable objects.
        // Interacting anywhere in the void opens the ending.
        adStartGenocideEnding();
        return;
    }

    AD_OLD_INTERACT_VOID();
};


// -----------------------------------------------------
// PERSISTENT ENDING SCREEN
// -----------------------------------------------------

const AD_OLD_DRAW_ENDING = drawEnding;

drawEnding = function () {
    if (!AD_GENOCIDE.active) {
        AD_OLD_DRAW_ENDING();
        return;
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#777777";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ALTERDUNE", W / 2, H / 2 - 20);

    ctx.fillStyle = "#8b0000";
    ctx.font = "16px monospace";
    ctx.fillText("YOU KILLED EVERYONE", W / 2, H / 2 + 20);

    ctx.textAlign = "left";
};


/* =====================================================
   ALTER DUNE — VINCENT'S FINAL PSYCHOLOGICAL ATTACK
   Three-stage genocide ending
   ===================================================== */

// Reset ending stages when the ending begins.
const AD_FINAL_OLD_START_GENOCIDE = adStartGenocideEnding;

adStartGenocideEnding = function () {
    if (AD_GENOCIDE.active) return;

    AD_GENOCIDE.stage = "main";

    AD_FINAL_OLD_START_GENOCIDE();
};

// Replace the ending renderer.
const AD_FINAL_OLD_DRAW_ENDING = drawEnding;

drawEnding = function () {
    if (!AD_GENOCIDE.active) {
        AD_FINAL_OLD_DRAW_ENDING();
        return;
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    // STAGE 1: ORIGINAL ENDING
    if (AD_GENOCIDE.stage === "main") {
        ctx.fillStyle = "#777777";
        ctx.font = "bold 28px monospace";
        ctx.textAlign = "center";
        ctx.fillText("ALTERDUNE", W / 2, H / 2 - 20);

        ctx.fillStyle = "#8b0000";
        ctx.font = "16px monospace";
        ctx.fillText(
            "YOU KILLED EVERYONE",
            W / 2,
            H / 2 + 20
        );
    }

    // STAGE 2: COMPLETE DARKNESS
    else if (AD_GENOCIDE.stage === "black") {
        // Nothing is displayed.
    }

    // STAGE 3: VINCENT'S FINAL MESSAGE
    else if (AD_GENOCIDE.stage === "final") {
        ctx.fillStyle = "#8b0000";
        ctx.font = "bold 19px monospace";
        ctx.textAlign = "center";

        ctx.fillText(
            "BUT YOU ALREADY KNEW THAT.",
            W / 2,
            H / 2
        );
    }

    ctx.textAlign = "left";
};

// Schedule the two transitions.
const AD_FINAL_OLD_PLAY_LAUGH = adPlayVincentLaugh;

adPlayVincentLaugh = function () {
    AD_FINAL_OLD_PLAY_LAUGH();

    setTimeout(() => {
        if (AD_GENOCIDE.active) {
            AD_GENOCIDE.stage = "black";
        }
    }, 3500);

    setTimeout(() => {
        if (AD_GENOCIDE.active) {
            AD_GENOCIDE.stage = "final";
        }
    }, 6000);
};

console.log("VINCENT FINAL PSYCHOLOGICAL ATTACK LOADED");


/* =====================================================
   ALTER DUNE — STOP EXPLORATION MUSIC AFTER TNT EVENT
   ===================================================== */

const AD_OLD_START_VINCENT_SEQUENCE = startVincentSequence;

startVincentSequence = function () {
    if (typeof musicTracks !== "undefined" && musicTracks.exploration) {
        musicTracks.exploration.pause();
        musicTracks.exploration.currentTime = 0;
    }

    AD_OLD_START_VINCENT_SEQUENCE();
};

// Prevent exploration music from restarting after the TNT event.
const AD_OLD_PLAY_MUSIC = playMusic;

playMusic = function (track) {
    if (castleDestroyed && track === "exploration") {
        return;
    }

    AD_OLD_PLAY_MUSIC(track);
};

console.log("EXPLORATION MUSIC DISABLED AFTER TNT EVENT");


/* =====================================================
   ALTER DUNE — KING DEFEAT / RETRY FIX
   ===================================================== */

// Reset the King after the player loses his battle.
const AD_KING_OLD_GAME_OVER = triggerGameOver;

triggerGameOver = function () {
    const diedToKing =
        battleOpen &&
        battle &&
        battle.enemy &&
        battle.enemy.id === "king";

    AD_KING_OLD_GAME_OVER();

    if (diedToKing && king) {
        king.hp = king.maxHp;
        king.defeated = false;
        king.active = true;

        // Remove an incorrectly awarded victory reward.
        inventory = inventory.filter(
            item => item !== "royal_treasure"
        );
    }
};

// Make sure retry always restores the King.
const AD_KING_OLD_RETRY = retryCheckpoint;

retryCheckpoint = function () {
    if (king && battle && battle.enemy?.id === "king") {
        king.hp = king.maxHp;
        king.defeated = false;
        king.active = true;

        inventory = inventory.filter(
            item => item !== "royal_treasure"
        );
    }

    AD_KING_OLD_RETRY();
};

// Repair an already-glitched save if the King was
// marked defeated without actually awarding the treasure.
const AD_KING_OLD_LOAD = loadGame;

loadGame = function () {
    AD_KING_OLD_LOAD();

    if (
        king &&
        king.defeated &&
        !inventory.includes("royal_treasure")
    ) {
        king.hp = king.maxHp;
        king.defeated = false;
        king.active = true;

        saveGame();

        console.log("KING SAVE RECOVERED");
    }
};

console.log("KING DEFEAT / RETRY FIX LOADED");

