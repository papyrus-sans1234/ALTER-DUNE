// =====================================================
// ALTER DUNE - DEMO 0.9
// THE HUNT BEGINS
// =====================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menuScreen = document.getElementById("menuScreen");
const gameScreen = document.getElementById("gameScreen");
const dialogueBox = document.getElementById("dialogueBox");
const dialogueText = document.getElementById("dialogueText");
const speaker = document.getElementById("speaker");
const pauseScreen = document.getElementById("pauseScreen");

const TILE = 32;
const W = canvas.width;
const H = canvas.height;

let gameRunning = false;
let paused = false;
let dialogueOpen = false;
let inventoryOpen = false;
let battleOpen = false;
let gameOver = false;
let loopStarted = false;

let endingStarted = false;
let endingStartTime = 0;

let keys = {};
let currentRoom = "entrance";
let camera = { x: 0, y: 0 };
let exploredRooms = ["entrance"];

let player = {
    x: 320,
    y: 320,
    hp: 30,
    maxHp: 30,
    speed: 2.6
};

// =====================================
// SOUNDTRACK SYSTEM
// =====================================

const musicTracks = {
    menu: new Audio("./START%20MENU.mp3"),
    exploration: new Audio("./EXPLORATION.mp3"),
    fight: new Audio("./FIGHT.mp3"),
    hunter: new Audio("./THEHUNTER.mp3"),
    king: new Audio("./FINALBOSS.mp3")
};

let currentMusic = null;
let musicFadeTimer = null;
let musicUnlocked = false;

Object.values(musicTracks).forEach(track => {
    track.loop = true;
    track.volume = 0;
});

function playMusic(name) {
    const nextMusic = musicTracks[name];

    if (!nextMusic) {
        console.error("Unknown music track:", name);
        return;
    }

    if (currentMusic === nextMusic && !nextMusic.paused) return;

    clearInterval(musicFadeTimer);

    const oldMusic = currentMusic;
    nextMusic.volume = 0;

    nextMusic.play()
        .then(() => {
            currentMusic = nextMusic;

            let volume = 0;

            musicFadeTimer = setInterval(() => {
                volume = Math.min(0.35, volume + 0.05);
                nextMusic.volume = volume;

                if (oldMusic && oldMusic !== nextMusic) {
                    oldMusic.volume = Math.max(
                        0,
                        oldMusic.volume - 0.05
                    );

                    if (oldMusic.volume <= 0) {
                        oldMusic.pause();
                        oldMusic.currentTime = 0;
                    }
                }

                if (volume >= 0.35) {
                    clearInterval(musicFadeTimer);
                }
            }, 100);
        })
        .catch(error => {
            console.error("Music error:", error);
        });
}

function stopMusic() {
    clearInterval(musicFadeTimer);

    Object.values(musicTracks).forEach(track => {
        track.pause();
        track.currentTime = 0;
        track.volume = 0;
    });

    currentMusic = null;
}

document.addEventListener("pointerdown", () => {
    if (!musicUnlocked) {
        musicUnlocked = true;
        playMusic("menu");
    }
});

// =====================================================
// ROOMS
// =====================================================

function makeMap(rows) {
    return rows.map(row => row.padEnd(20, "#").slice(0, 20));
}

const rooms = {
    entrance: {
        name: "CASTLE ENTRANCE",
        map: makeMap([
            "####################",
            "#..................#",
            "#..................#",
            "#..######..........#",
            "#..#....#..........#",
            "#..#...............#",
            "#..#.D.............#",
            "#..#....#..........#",
            "#..######..........#",
            "#..................#",
            "#..................#",
            "#..................#",
            "#........D.........#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 12, target: "hall", sx: 320, sy: 340 }
        ]
    },

    hall: {
        name: "GRAND HALL",
        map: makeMap([
            "####################",
            "#........D.........#",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#D................D#",
            "#..................#",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#D..D....D....D....#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 1, target: "library", sx: 320, sy: 340 },
            { x: 1, y: 6, target: "barracks", sx: 550, sy: 340 },
            { x: 18, y: 6, target: "exit", sx: 48, sy: 208 },
            { x: 1, y: 12, target: "entrance", sx: 320, sy: 340 },
            { x: 4, y: 12, target: "armory", sx: 320, sy: 340 },
            { x: 9, y: 12, target: "royal", sx: 320, sy: 340 },
            { x: 14, y: 12, target: "dungeon", sx: 320, sy: 340 },
            { x: 17, y: 12, target: "garden", sx: 320, sy: 340 }
        ]
    },

    barracks: {
        name: "GUARD BARRACKS",
        map: makeMap([
            "####################",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#..................#",
            "#....###..###......#",
            "#....###..###......#",
            "#..................#",
            "#..................#",
            "#..##..........##..#",
            "#..................#",
            "#.................D#",
            "####################"
        ]),
        doors: [
            { x: 18, y: 12, target: "hall", sx: 80, sy: 200 }
        ]
    },

    library: {
        name: "ROYAL LIBRARY",
        map: makeMap([
            "####################",
            "#..................#",
            "#..###......###....#",
            "#..###......###....#",
            "#..................#",
            "#..###......###....#",
            "#..###......###....#",
            "#..................#",
            "#..###......###....#",
            "#..###......###....#",
            "#..................#",
            "#..................#",
            "#........D.........#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 12, target: "hall", sx: 320, sy: 90 }
        ]
    },

    armory: {
        name: "OLD ARMORY",
        map: makeMap([
            "####################",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#....###..###......#",
            "#....###..###......#",
            "#..................#",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#........D.........#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 12, target: "hall", sx: 150, sy: 340 }
        ]
    },

    dungeon: {
        name: "CASTLE DUNGEON",
        map: makeMap([
            "####################",
            "#..................#",
            "#..##..####..##....#",
            "#..##..####..##....#",
            "#..................#",
            "####..########..####",
            "#..................#",
            "#..####......####..#",
            "#..####......####..#",
            "#..................#",
            "#..................#",
            "#........D.........#",
            "#..................#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 11, target: "hall", sx: 500, sy: 340 }
        ]
    },

    garden: {
        name: "HIDDEN GARDEN",
        map: makeMap([
            "####################",
            "#..................#",
            "#..##........##....#",
            "#..##........##....#",
            "#..................#",
            "#....##....##......#",
            "#....##....##......#",
            "#..................#",
            "#..................#",
            "#..##........##....#",
            "#..##........##....#",
            "#..................#",
            "#........D.........#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 12, target: "hall", sx: 550, sy: 340 }
        ]
    },

    royal: {
        name: "ROYAL THRONE ROOM",
        map: makeMap([
            "####################",
            "#..................#",
            "#..####......####..#",
            "#..####......####..#",
            "#..................#",
            "#..................#",
            "#.....######.......#",
            "#.....#....#.......#",
            "#.....#....#.......#",
            "#..................#",
            "#..................#",
            "#........D.........#",
            "#..................#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 11, target: "hall", sx: 320, sy: 340 },
            { x: 9, y: 12, target: "exit", sx: 320, sy: 340 }
        ]
    },

    exit: {
        name: "CASTLE EXIT",
        map: makeMap([
            "#########D##########",
            "#..................#",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#D.................#",
            "#..................#",
            "#..##..........##..#",
            "#..##..........##..#",
            "#..................#",
            "#..................#",
            "#........D.........#",
            "####################"
        ]),
        doors: [
            { x: 9, y: 12, target: "royal", sx: 320, sy: 390 },
            { x: 1, y: 6, target: "hall", sx: 592, sy: 208 }
        ]
    }
};

const exitDoorPosition = {
    x: 9 * TILE + 16,
    y: 1 * TILE + 16
};

// =====================================================
// INVENTORY
// =====================================================

const itemInfo = {
    wooden_sword: { name: "Wooden Sword", type: "weapon", power: 5 },
    frying_pan: { name: "Frying Pan", type: "weapon", power: 8 },
    toy_knife: { name: "Toy Knife", type: "weapon", power: 3 },
    bread: { name: "Bread", type: "healing", heal: 8 },
    apple: { name: "Castle Apple", type: "healing", heal: 15 },
    medkit: { name: "Medkit", type: "healing", fullHeal: true },
    golden_coin: { name: "Golden Coin", type: "misc" },
    old_key: { name: "Old Key", type: "key" },
    kings_key: { name: "King's Key", type: "key" },
    royal_treasure: { name: "Royal Treasure", type: "treasure" }
};

let inventory = [{ id: "wooden_sword", qty: 1 }];
let equippedWeapon = "wooden_sword";
let selectedInventoryIndex = 0;

function hasItem(id) {
    return inventory.some(i => i.id === id && i.qty > 0);
}

function addItem(id, amount = 1) {
    if (!itemInfo[id]) return;

    let item = inventory.find(i => i.id === id);

    if (item) {
        item.qty += amount;
    } else {
        inventory.push({ id, qty: amount });
    }
}

function removeItem(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;

    item.qty--;

    if (item.qty <= 0) {
        inventory = inventory.filter(i => i.id !== id);
    }

    selectedInventoryIndex = Math.min(
        selectedInventoryIndex,
        Math.max(0, inventory.length - 1)
    );
}

function moveInventorySelection(direction) {
    if (inventory.length === 0) {
        selectedInventoryIndex = 0;
        return;
    }

    selectedInventoryIndex =
        (selectedInventoryIndex + direction + inventory.length) %
        inventory.length;
}

function useItem(id) {
    const info = itemInfo[id];

    if (!info || !hasItem(id)) return false;

    if (info.type === "healing") {
        if (player.hp >= player.maxHp) {
            battle.message = "Your HP is already full!";
            return false;
        }

        const oldHP = player.hp;

        if (info.fullHeal) {
            player.hp = player.maxHp;
        } else {
            player.hp = Math.min(player.maxHp, player.hp + info.heal);
        }

        removeItem(id);

        battle.message = info.fullHeal
            ? "The Medkit fully restored your HP!"
            : "You recovered " + (player.hp - oldHP) + " HP!";

        return true;
    }

    battle.message = info.type === "misc"
        ? "You examined the " + info.name + "."
        : "The key feels important...";

    return true;
}

function useSelectedInventoryItem() {
    if (!inventory.length) {
        showDialogue("INVENTORY", "Your inventory is empty.");
        return;
    }

    const item = inventory[selectedInventoryIndex];
    if (!item) return;

    const info = itemInfo[item.id];
    if (!info) return;

    if (info.type === "weapon") {
        equippedWeapon = item.id;
        inventoryOpen = false;

        showDialogue(
            "INVENTORY",
            "Equipped " + info.name + "."
        );
        return;
    }

    if (info.type === "healing") {
        const used = useItem(item.id);

        if (used) inventoryOpen = false;

        showDialogue("ITEM", battle.message);
        return;
    }

    if (info.type === "misc") {
        showDialogue(
            "INVENTORY",
            "You examined the " + info.name + "."
        );
        return;
    }

    if (info.type === "key" || info.type === "treasure") {
        showDialogue(
            "INVENTORY",
            "This item may be important later."
        );
        return;
    }

    showDialogue("INVENTORY", "You cannot use this item right now.");
}

// =====================================================
// FURNITURE
// =====================================================

const furniture = {
    entrance: [
        { x: 5, y: 2, type: "barrel" },
        { x: 12, y: 2, type: "cushion" }
    ],
    hall: [
        { x: 4, y: 5, type: "table" },
        { x: 14, y: 5, type: "table" },
        { x: 5, y: 9, type: "cushion" },
        { x: 13, y: 9, type: "cushion" }
    ],
    barracks: [
        { x: 4, y: 3, type: "box" },
        { x: 14, y: 3, type: "box" },
        { x: 8, y: 9, type: "table" }
    ],
    library: [
        { x: 5, y: 1, type: "bookshelf" },
        { x: 14, y: 1, type: "bookshelf" },
        { x: 5, y: 7, type: "bookshelf" },
        { x: 14, y: 7, type: "bookshelf" }
    ],
    armory: [
        { x: 4, y: 2, type: "box" },
        { x: 15, y: 2, type: "box" },
        { x: 8, y: 9, type: "table" }
    ],
    dungeon: [
        { x: 4, y: 1, type: "barrel" },
        { x: 15, y: 1, type: "barrel" },
        { x: 5, y: 10, type: "box" }
    ],
    garden: [
        { x: 4, y: 3, type: "cushion" },
        { x: 14, y: 8, type: "cushion" }
    ],
    royal: [
        { x: 5, y: 4, type: "table" },
        { x: 14, y: 4, type: "table" },
        { x: 9, y: 9, type: "cushion" }
    ],
    exit: [
        { x: 4, y: 3, type: "box" },
        { x: 15, y: 3, type: "box" }
    ]
};

const furnitureInfo = {
    barrel: { w: 24, h: 25, solid: true },
    table: { w: 28, h: 25, solid: true },
    bookshelf: { w: 28, h: 30, solid: true },
    box: { w: 25, h: 22, solid: true },
    cushion: { w: 27, h: 17, solid: false }
};

// =====================================================
// CHESTS
// =====================================================

const chests = {
    entrance: [{ x: 15, y: 10, items: ["toy_knife", "bread"] }],
    hall: [{ x: 3, y: 2, items: ["bread"] }],
    barracks: [{ x: 10, y: 5, items: ["bread", "golden_coin"] }],
    library: [{ x: 15, y: 11, items: ["golden_coin", "medkit"] }],
    armory: [{ x: 15, y: 10, items: ["frying_pan"] }],
    dungeon: [{ x: 15, y: 10, items: ["apple", "old_key"] }],
    garden: [{ x: 10, y: 5, items: ["apple"] }],
    royal: [{ x: 3, y: 10, items: ["bread"] }],
    exit: []
};

let openedChests = [];

// =====================================================
// NPCs
// =====================================================

const npcs = {
    entrance: [{
        name: "CASTLE WORKER",
        x: 180,
        y: 100,
        color: "#54b88c",
        lines: [
            "Psst! You're not supposed to be here.",
            "The Hunter patrols the Grand Hall.",
            "Be careful!"
        ],
        line: 0
    }],

    hall: [
        {
            name: "EXCITED VISITOR",
            x: 160,
            y: 190,
            color: "#e4c65d",
            lines: [
                "HEY! YOU'RE AN INTRUDER!",
                "WAIT, THAT'S ACTUALLY AWESOME!",
                "I've never seen someone sneak in here!",
                "The Hunter is REALLY strong, though."
            ],
            line: 0
        },
        {
            name: "OLD KNIGHT",
            x: 470,
            y: 180,
            color: "#a7b4d0",
            lines: [
                "I once guarded this castle.",
                "The King was not always like this.",
                "Something changed him."
            ],
            line: 0
        }
    ],

    barracks: [{
        name: "SLEEPY GUARD",
        x: 320,
        y: 190,
        color: "#a3a3b9",
        lines: [
            "Zzz... five more minutes...",
            "Wait! Was that a noise?",
            "I should probably get back to sleep."
        ],
        line: 0
    }],

    library: [{
        name: "LIBRARIAN",
        x: 320,
        y: 190,
        color: "#bd8be0",
        lines: [
            "Welcome to the Royal Library.",
            "The King's records are kept here.",
            "Please don't damage the books."
        ],
        line: 0
    }],

    armory: [{
        name: "BLACKSMITH",
        x: 320,
        y: 180,
        color: "#d18a55",
        lines: [
            "The King ordered all weapons stored here.",
            "Take what you need from the chests.",
            "I won't ask questions."
        ],
        line: 0
    }],

    dungeon: [{
        name: "PRISONER",
        x: 150,
        y: 180,
        color: "#8caaa9",
        lines: [
            "WAIT,ARE YOU FROM THE SAME PLACE AS ME??!?",
            "THE SAME KINGDOM!?!",
            "THEY HAD CAPTURED ME,PLS HELP ME",
            "I was on the same mission as you.",
            "It looks like they hired new guards,because i had earlier defeated them.",
            "After knowing that I had defeated all of his active guards,",
            "He sent his hunter onto me,he will come when you defeat all his guards."
        ],
        line: 0
    }],

    garden: [{
        name: "GARDENER",
        x: 320,
        y: 190,
        color: "#79b76c",
        lines: [
            "This garden used to be beautiful.",
            "The King doesn't visit anymore.",
            "You can rest here if you need to."
        ],
        line: 0
    }],

    royal: [],
    exit: []
};

// =====================================================
// ENEMIES
// =====================================================

let enemies = [];
let hunter;
let king;
let sleepyGuard;

function createEnemy(id, name, room, x, y, hp, damage, color, difficulty) {
    return {
        id,
        name,
        homeRoom: room,
        room,
        x,
        y,
        hp,
        maxHp: hp,
        damage,
        color,
        difficulty,
        active: true,
        defeated: false,
        direction: 1,
        speed: difficulty === 1 ? 0.8 : 1.1,
        fleeGrace: 0,
        actScore: 0,
        spared: false,
        alerted: false,
        lostTimer: 0,
        patrolTimer: 0
    };
}

function resetEnemies() {
    enemies = [
        createEnemy("guard1", "CASTLE GUARD", "barracks", 250, 190, 24, 4, "#b36a77", 1),
        createEnemy("guard2", "CASTLE GUARD", "armory", 450, 200, 28, 5, "#b36a77", 1),
        createEnemy("dungeon_guard", "DUNGEON GUARD", "dungeon", 220, 180, 35, 6, "#9c637d", 2),
        createEnemy("entrance_guard", "ENTRANCE GUARD", "entrance", 480, 190, 24, 4, "#b36a77", 1),
        createEnemy("hall_guard", "HALL GUARD", "hall", 250, 270, 28, 5, "#b36a77", 1),
        createEnemy("barracks_guard", "BARRACKS GUARD", "barracks", 480, 300, 28, 5, "#b36a77", 1),
        createEnemy("library_guard", "LIBRARY GUARD", "library", 480, 300, 24, 4, "#9274ad", 1),
        createEnemy("armory_guard", "ARMORY GUARD", "armory", 160, 280, 28, 5, "#b36a77", 1),
        createEnemy("garden_guard", "GARDEN GUARD", "garden", 480, 190, 24, 4, "#719e68", 1),
        createEnemy("royal_guard", "ROYAL GUARD", "royal", 500, 300, 32, 5, "#bd8b43", 2),
        createEnemy("exit_guard", "EXIT GUARD", "exit", 480, 300, 28, 5, "#b36a77", 1)
    ];

    hunter = createEnemy("hunter", "THE HUNTER", "hall", 470, 190, 100, 4, "#c94c55", 3);
    hunter.speed = 1.05;
    hunter.active = false;

    king = createEnemy("king", "THE KING", "royal", 320, 125, 170, 6, "#e3b34d", 4);
    king.speed = 0;

    sleepyGuard = createEnemy("sleepy_guard", "AWAKENED GUARD", "barracks", 320, 190, 32, 5, "#a3a3b9", 2);
    sleepyGuard.active = false;
}

// =====================================================
// SAVE SYSTEM
// =====================================================

let checkpoint = {
    room: "entrance",
    x: 320,
    y: 320,
    hp: 30
};

function saveGame() {
    const data = {
        player,
        currentRoom,
        inventory,
        equippedWeapon,
        openedChests,
        checkpoint,
        enemies,
        hunter,
        king,
        sleepyGuard,
        exploredRooms
    };

    localStorage.setItem("tarboozSave", JSON.stringify(data));

    const status = document.getElementById("saveStatus");
    if (status) status.textContent = "GAME SAVED";

    updateContinueButton();
}

function loadGame() {
    const raw = localStorage.getItem("tarboozSave");
    if (!raw) return;

    try {
        const data = JSON.parse(raw);

        if (!rooms[data.currentRoom]) return;

        player = data.player;
        currentRoom = data.currentRoom;
        inventory = data.inventory || [];
        equippedWeapon = data.equippedWeapon || "wooden_sword";
        openedChests = data.openedChests || [];
        checkpoint = data.checkpoint || checkpoint;

        if (Array.isArray(data.enemies)) {
            enemies = data.enemies;
        } else {
            resetEnemies();
        }

        if (data.hunter) hunter = data.hunter;
        if (data.king) king = data.king;
        if (data.sleepyGuard) sleepyGuard = data.sleepyGuard;

        exploredRooms = Array.isArray(data.exploredRooms)
            ? data.exploredRooms
            : [currentRoom];

        if (!exploredRooms.includes(currentRoom)) {
            exploredRooms.push(currentRoom);
        }

        // MIGRATE OLD SAVES AND REPAIR DEFEATED ENEMIES.
        [...enemies, hunter, king, sleepyGuard].forEach(enemy => {
            if (!enemy) return;

            if (!enemy.homeRoom) enemy.homeRoom = enemy.room;
            if (enemy.alerted === undefined) enemy.alerted = false;
            if (enemy.lostTimer === undefined) enemy.lostTimer = 0;
            if (enemy.defeated === undefined) {
                enemy.defeated = enemy.hp <= 0;
            }

            // An enemy with zero HP can never become active again.
            if (enemy.hp <= 0 || enemy.defeated) {
                enemy.hp = Math.max(0, enemy.hp);
                enemy.defeated = true;
                enemy.active = false;
            }
        });

        selectedInventoryIndex = 0;

        unlockHunterIfReady();
        wakeSleepyGuardIfReady();

        const safe = findSafeSpawn(player.x, player.y);
        player.x = safe.x;
        player.y = safe.y;

    } catch (err) {
        console.error("Save loading error:", err);
        alert("Save file could not be loaded.");
        return;
    }

    startGameScreen();
}

function updateContinueButton() {
    const btn = document.getElementById("continueBtn");
    if (btn) btn.disabled = !localStorage.getItem("tarboozSave");
}

// =====================================================
// START / RESET
// =====================================================

function startNewGame() {
    player = {
        x: 320,
        y: 320,
        hp: 30,
        maxHp: 30,
        speed: 2.6
    };

    currentRoom = "entrance";
    exploredRooms = ["entrance"];

    inventory = [{ id: "wooden_sword", qty: 1 }];
    equippedWeapon = "wooden_sword";
    selectedInventoryIndex = 0;
    openedChests = [];

    endingStarted = false;
    endingStartTime = 0;

    checkpoint = {
        room: "entrance",
        x: 320,
        y: 320,
        hp: 30
    };

    resetEnemies();

    Object.values(npcs).forEach(list => {
        list.forEach(npc => npc.line = 0);
    });

    localStorage.removeItem("tarboozSave");

    startGameScreen();

    showDialogue(
        "NARRATOR",
        "Your mission: recover the treasure stolen by the King."
    );
}

// =====================================================
// START GAME SCREEN
// =====================================================

function startGameScreen() {
    playMusic("exploration");

    menuScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");

    paused = false;
    gameOver = false;
    inventoryOpen = false;
    battleOpen = false;
    dialogueOpen = false;
    mobilePauseOpen = false;
    keys = {};

    pauseScreen.classList.add("hidden");
    dialogueBox.classList.add("hidden");

    gameRunning = true;

    updateLocation();
    startLoop();
}

// =====================================================
// DEVICE SELECTION: PC / PHONE
// =====================================================

let deviceMode = "pc";
let pendingGameAction = null;
let mobilePauseOpen = false;

function showDeviceSelection(action) {
    pendingGameAction = action;

    let overlay = document.getElementById("deviceSelection");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "deviceSelection";

        overlay.style.cssText = `
            position:fixed;
            inset:0;
            z-index:10000;
            background:#100d18;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            color:white;
            font-family:monospace;
            text-align:center;
        `;

        overlay.innerHTML = `
            <h2>SELECT YOUR DEVICE</h2>
            <p>How are you playing?</p>
            <button id="pcModeBtn">PC / KEYBOARD</button>
            <button id="phoneModeBtn">PHONE / TOUCH</button>
            <button id="deviceBackBtn">BACK</button>
        `;

        document.body.appendChild(overlay);

        overlay.querySelectorAll("button").forEach(button => {
            button.style.cssText = `
                padding:14px 25px;
                margin:9px;
                min-width:190px;
                background:#392b4b;
                color:white;
                border:2px solid #e5c16e;
                font-family:monospace;
                font-size:14px;
                cursor:pointer;
                border-radius:8px;
            `;
        });

        document.getElementById("pcModeBtn").onclick = () => selectDevice("pc");
        document.getElementById("phoneModeBtn").onclick = () => selectDevice("phone");

        document.getElementById("deviceBackBtn").onclick = () => {
            overlay.remove();
            pendingGameAction = null;
        };
    }

    overlay.style.display = "flex";
}

function selectDevice(mode) {
    deviceMode = mode;

    const overlay = document.getElementById("deviceSelection");
    if (overlay) overlay.remove();

    if (mode === "phone") {
        createMobileControls();
    } else {
        removeMobileControls();
    }

    if (pendingGameAction === "new") {
        startNewGame();
    } else if (pendingGameAction === "continue") {
        loadGame();
    }

    pendingGameAction = null;
}

// =====================================================
// MOBILE CONTROLS
// =====================================================

function createMobileControls() {
    removeMobileControls();

    const controls = document.createElement("div");
    controls.id = "mobileControls";

    controls.style.cssText = `
        position:fixed;
        inset:0;
        z-index:9000;
        pointer-events:none;
        user-select:none;
        touch-action:none;
    `;

    controls.innerHTML = `
        <div id="mobileJoystick"
             style="
                position:absolute;
                left:25px;
                bottom:35px;
                width:135px;
                height:135px;
                border:3px solid #ddd;
                border-radius:50%;
                background:#ffffff25;
                pointer-events:auto;
                touch-action:none;
             ">
            <div id="joystickKnob"
                 style="
                    position:absolute;
                    width:48px;
                    height:48px;
                    left:40px;
                    top:40px;
                    border-radius:50%;
                    background:#e5c16e;
                    border:2px solid white;
                 ">
            </div>
        </div>

        <div style="
            position:absolute;
            right:25px;
            bottom:35px;
            display:grid;
            grid-template-columns:65px 65px;
            gap:12px;
            pointer-events:auto;
        ">
            <button id="mobileZ">Z</button>
            <button id="mobileX">X</button>
            <button id="mobileC" style="grid-column:1 / 3; width:142px;">
                C
            </button>
        </div>
    `;

    document.body.appendChild(controls);

    controls.querySelectorAll("button").forEach(button => {
        button.style.cssText += `
            height:58px;
            background:#392b4b;
            color:white;
            border:3px solid #e5c16e;
            border-radius:14px;
            font-size:22px;
            font-weight:bold;
            touch-action:none;
        `;
    });

    const joystick = document.getElementById("mobileJoystick");
    const knob = document.getElementById("joystickKnob");

    let joystickPointer = null;
    let joystickMenuDirection = "";

    function updateJoystickMenu(dx, dy) {
        let direction = "";

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < -12) direction = "arrowleft";
            if (dx > 12) direction = "arrowright";
        } else {
            if (dy < -12) direction = "arrowup";
            if (dy > 12) direction = "arrowdown";
        }

        if (inventoryOpen) {
            if (
                (direction === "arrowleft" ||
                 direction === "arrowright") &&
                direction !== joystickMenuDirection
            ) {
                moveInventorySelection(
                    direction === "arrowleft" ? -1 : 1
                );
            }

            joystickMenuDirection =
                direction === "arrowleft" || direction === "arrowright"
                    ? direction
                    : "";

            return;
        }

        if (!battleOpen || battle.phase !== "menu") {
            joystickMenuDirection = "";
            return;
        }

        if (direction && direction !== joystickMenuDirection) {
            handleBattleInput(direction);
        }

        joystickMenuDirection = direction;
    }

    function resetJoystick() {
        keys["w"] = false;
        keys["a"] = false;
        keys["s"] = false;
        keys["d"] = false;

        knob.style.left = "40px";
        knob.style.top = "40px";
        joystickMenuDirection = "";
    }

    joystick.addEventListener("pointerdown", event => {
        event.preventDefault();
        joystickPointer = event.pointerId;
        joystick.setPointerCapture(event.pointerId);
        updateJoystick(event);
    });

    joystick.addEventListener("pointermove", event => {
        if (event.pointerId !== joystickPointer) return;
        updateJoystick(event);
    });

    function updateJoystick(event) {
        const rect = joystick.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;

        const maxDistance = 42;
        const distance = Math.hypot(dx, dy);

        if (distance > maxDistance) {
            dx = dx / distance * maxDistance;
            dy = dy / distance * maxDistance;
        }

        knob.style.left = (40 + dx) + "px";
        knob.style.top = (40 + dy) + "px";

        keys["a"] = dx < -12;
        keys["d"] = dx > 12;
        keys["w"] = dy < -12;
        keys["s"] = dy > 12;

        updateJoystickMenu(dx, dy);
    }

    joystick.addEventListener("pointerup", event => {
        if (event.pointerId !== joystickPointer) return;
        joystickPointer = null;
        resetJoystick();
    });

    joystick.addEventListener("pointercancel", () => {
        joystickPointer = null;
        resetJoystick();
    });

    document.getElementById("mobileZ").addEventListener("pointerdown", event => {
        event.preventDefault();
        pressGameKey("z");
    });

    document.getElementById("mobileX").addEventListener("pointerdown", event => {
        event.preventDefault();
        pressGameKey("x");
    });

    document.getElementById("mobileC").addEventListener("pointerdown", event => {
        event.preventDefault();
        openMobilePause();
    });
}

function removeMobileControls() {
    const controls = document.getElementById("mobileControls");
    if (controls) controls.remove();
    keys = {};
}

// =====================================================
// MOBILE BUTTON INPUT
// =====================================================

function pressGameKey(key) {
    document.dispatchEvent(
        new KeyboardEvent("keydown", {
            key,
            bubbles: true
        })
    );
}

// =====================================================
// MOBILE PAUSE MENU
// =====================================================

function openMobilePause() {
    if (!gameRunning || gameOver || endingStarted ||
        dialogueOpen || battleOpen) return;

    if (mobilePauseOpen) {
        closeMobilePause();
        return;
    }

    paused = true;
    mobilePauseOpen = true;

    let panel = document.getElementById("mobilePausePanel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "mobilePausePanel";

        panel.style.cssText = `
            position:fixed;
            inset:0;
            z-index:11000;
            background:#100d18ed;
            color:white;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            font-family:monospace;
            overflow:auto;
        `;

        document.body.appendChild(panel);
    }

    const weapon = itemInfo[equippedWeapon]?.name || "None";

    panel.innerHTML = `
        <h2>PAUSED</h2>
        <div style="
            background:#292334;
            border:2px solid #e5c16e;
            padding:15px;
            width:80%;
            max-width:350px;
            margin:10px;
        ">
            <h3>PLAYER STATS</h3>
            <p>HP: ${player.hp} / ${player.maxHp}</p>
            <p>Equipped: ${weapon}</p>
            <p>Location: ${getRoom().name}</p>
        </div>

        <div style="
            background:#292334;
            border:2px solid #e5c16e;
            padding:15px;
            width:80%;
            max-width:350px;
            margin:10px;
        ">
            <h3>INVENTORY</h3>
            <div id="mobileInventoryList"></div>
        </div>

        <button id="mobileResume">RESUME</button>
        <button id="mobileSave">SAVE GAME</button>
        <button id="mobileMainMenu">MAIN MENU</button>
    `;

    panel.querySelectorAll("button").forEach(button => {
        button.style.cssText = `
            padding:13px;
            margin:7px;
            width:220px;
            background:#392b4b;
            color:white;
            border:2px solid #e5c16e;
            border-radius:8px;
            font-family:monospace;
            font-size:13px;
        `;
    });

    const list = document.getElementById("mobileInventoryList");

    inventory.forEach(item => {
        const line = document.createElement("p");
        line.textContent =
            (itemInfo[item.id]?.name || item.id) + " x" + item.qty;
        list.appendChild(line);
    });

    document.getElementById("mobileResume").onclick = closeMobilePause;
    document.getElementById("mobileSave").onclick = saveGame;

    document.getElementById("mobileMainMenu").onclick = () => {
        closeMobilePause();

        gameRunning = false;
        paused = false;
        mobilePauseOpen = false;

        gameScreen.classList.add("hidden");
        menuScreen.classList.remove("hidden");

        playMusic("menu");

        removeMobileControls();
        updateContinueButton();
    };
}

function closeMobilePause() {
    paused = false;
    mobilePauseOpen = false;

    const panel = document.getElementById("mobilePausePanel");
    if (panel) panel.remove();
}

// =====================================================
// MENU BUTTONS
// =====================================================

document.getElementById("newGameBtn").onclick = () => showDeviceSelection("new");
document.getElementById("continueBtn").onclick = () => showDeviceSelection("continue");

document.getElementById("controlsBtn").onclick = () => {
    alert(
        "CONTROLS\n\n" +
        "WASD / ARROWS = MOVE\n" +
        "E = INTERACT\n" +
        "I = INVENTORY\n" +
        "LEFT / RIGHT = SELECT ITEM\n" +
        "Z = USE / EQUIP SELECTED ITEM\n" +
        "X = CLOSE INVENTORY\n" +
        "1 / 2 / 3 = EQUIP WEAPON\n" +
        "H = USE HEALING ITEM\n" +
        "ESC = PAUSE\n\n" +
        "BATTLE:\n" +
        "ENTER = SELECT\n" +
        "ARROWS / WASD = MENU OR DODGE"
    );
};

document.getElementById("pauseBtn").onclick = togglePause;
document.getElementById("resumeBtn").onclick = togglePause;
document.getElementById("saveBtn").onclick = saveGame;

document.getElementById("mainMenuBtn").onclick = () => {
    gameRunning = false;
    paused = false;
    battleOpen = false;
    gameOver = false;
    dialogueOpen = false;
    endingStarted = false;

    pauseScreen.classList.add("hidden");
    dialogueBox.classList.add("hidden");
    gameScreen.classList.add("hidden");
    menuScreen.classList.remove("hidden");

    playMusic("menu");
    updateContinueButton();
};

// =====================================================
// DIALOGUE
// =====================================================

function showDialogue(name, message) {
    dialogueOpen = true;
    speaker.textContent = name;
    dialogueText.textContent = message;
    dialogueBox.classList.remove("hidden");
}

function closeDialogue() {
    dialogueOpen = false;
    dialogueBox.classList.add("hidden");
}

// =====================================================
// PAUSE
// =====================================================

function togglePause() {
    if (!gameRunning || dialogueOpen || battleOpen ||
        gameOver || endingStarted) return;

    paused = !paused;
    pauseScreen.classList.toggle("hidden", !paused);
}

// =====================================================
// GAME OVER
// =====================================================

function triggerGameOver() {
    if (gameOver) return;

    player.hp = 0;
    gameOver = true;
    battleOpen = false;
    inventoryOpen = false;
    dialogueOpen = false;
    paused = false;
    keys = {};

    dialogueBox.classList.add("hidden");
    pauseScreen.classList.add("hidden");
}

function retryCheckpoint() {
    player.hp = checkpoint.hp;
    currentRoom = checkpoint.room;

    player.x = checkpoint.x;
    player.y = checkpoint.y;

    gameOver = false;
    battleOpen = false;
    inventoryOpen = false;
    dialogueOpen = false;
    keys = {};

    if (!exploredRooms.includes(currentRoom)) {
        exploredRooms.push(currentRoom);
    }

    const safe = findSafeSpawn(player.x, player.y);
    player.x = safe.x;
    player.y = safe.y;

    updateLocation();
    saveGame();
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0,0,0,0.92)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#e75b68";
    ctx.font = "30px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", W / 2, 115);

    ctx.fillStyle = "white";
    ctx.font = "14px monospace";
    ctx.fillText("Your adventure is not over.", W / 2, 165);

    ctx.fillStyle = "#ffcf77";
    ctx.fillText("R = RETRY FROM CHECKPOINT", W / 2, 235);
    ctx.fillText("M = MAIN MENU", W / 2, 270);

    ctx.textAlign = "left";
}

// =====================================================
// ENDING
// =====================================================

function startEnding() {
    if (endingStarted) return;

    endingStarted = true;
    endingStartTime = Date.now();

    gameRunning = true;
    paused = false;
    dialogueOpen = false;
    inventoryOpen = false;
    battleOpen = false;
    gameOver = false;

    keys = {};

    dialogueBox.classList.add("hidden");
    pauseScreen.classList.add("hidden");

    stopMusic();
}

function drawEnding() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    if (Date.now() - endingStartTime >= 1000) {
        ctx.fillStyle = "white";
        ctx.font = "bold 42px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText("THE END.", W / 2, H / 2);

        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }
}

// =====================================================
// INPUT
// =====================================================

document.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (endingStarted) {
        e.preventDefault();
        return;
    }

    if (key === "z") {
        e.preventDefault();

        if (dialogueOpen) {
            closeDialogue();
        } else if (battleOpen) {
            handleBattleInput("enter");
        } else if (inventoryOpen) {
            useSelectedInventoryItem();
        } else if (gameRunning && !paused && !gameOver) {
            interact();
        }

        return;
    }

    if (key === "x") {
        e.preventDefault();

        if (dialogueOpen) {
            closeDialogue();
        } else if (battleOpen) {
            handleBattleInput("escape");
        } else if (inventoryOpen) {
            inventoryOpen = false;
        }

        return;
    }

    if (key === "c" && deviceMode === "phone") {
        e.preventDefault();
        openMobilePause();
        return;
    }

    if ([
        "arrowup", "arrowdown",
        "arrowleft", "arrowright", " "
    ].includes(key)) {
        e.preventDefault();
    }

    if (gameOver) {
        if (key === "r") retryCheckpoint();

        if (key === "m") {
            gameRunning = false;
            gameOver = false;
            gameScreen.classList.add("hidden");
            menuScreen.classList.remove("hidden");

            playMusic("menu");
            updateContinueButton();
        }

        return;
    }

    if (dialogueOpen) {
        if (key === "e" || key === "enter") closeDialogue();
        return;
    }

    if (battleOpen) {
        if (
            battle.phase === "dodge" &&
            [
                "w", "a", "s", "d",
                "arrowup", "arrowdown",
                "arrowleft", "arrowright"
            ].includes(key)
        ) {
            keys[key] = true;
        }

        handleBattleInput(key);
        return;
    }

    if (key === "escape") {
        if (inventoryOpen) {
            inventoryOpen = false;
            keys = {};
        } else {
            togglePause();
        }
        return;
    }

    if (paused || !gameRunning) return;

    if (key === "i" && !e.repeat) {
        inventoryOpen = !inventoryOpen;

        if (inventoryOpen) {
            selectedInventoryIndex = Math.min(
                selectedInventoryIndex,
                Math.max(0, inventory.length - 1)
            );
        }

        keys = {};
        return;
    }

    if (inventoryOpen) {
        if (key === "arrowleft") {
            moveInventorySelection(-1);
        }

        if (key === "arrowright") {
            moveInventorySelection(1);
        }

        if (key === "1") equipWeapon("wooden_sword");
        if (key === "2") equipWeapon("frying_pan");
        if (key === "3") equipWeapon("toy_knife");

        return;
    }

    keys[key] = true;

    if (key === "e" && !e.repeat) interact();

    if (key === "1" && !e.repeat) equipWeapon("wooden_sword");
    if (key === "2" && !e.repeat) equipWeapon("frying_pan");
    if (key === "3" && !e.repeat) equipWeapon("toy_knife");

    if (key === "h" && !e.repeat) {
        const healing = inventory.find(i =>
            itemInfo[i.id]?.type === "healing"
        );

        if (healing) {
            useItem(healing.id);
            showDialogue("ITEM", battle.message);
        }
    }
});

document.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

// =====================================================
// EQUIPMENT
// =====================================================

function equipWeapon(id) {
    if (!hasItem(id) || itemInfo[id]?.type !== "weapon") return;

    equippedWeapon = id;

    if (inventoryOpen) inventoryOpen = false;

    showDialogue(
        "INVENTORY",
        "Equipped " + itemInfo[id].name + "."
    );
}

// =====================================================
// ROOM HELPERS
// =====================================================

function getRoom() {
    return rooms[currentRoom];
}

function getMap() {
    return getRoom().map;
}

function updateLocation() {
    const el = document.getElementById("locationName");
    if (el) el.textContent = getRoom().name;
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// =====================================================
// COLLISION
// =====================================================

function isWall(x, y) {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    const map = getMap();

    if (
        row < 0 || row >= map.length ||
        col < 0 || col >= map[row].length
    ) {
        return true;
    }

    return map[row][col] === "#";
}

function hitsFurniture(x, y) {
    for (const object of furniture[currentRoom] || []) {
        const info = furnitureInfo[object.type];
        if (!info?.solid) continue;

        const ox = object.x * TILE + 16;
        const oy = object.y * TILE + 16;

        if (
            Math.abs(x - ox) < (info.w + 20) / 2 &&
            Math.abs(y - oy) < (info.h + 24) / 2
        ) {
            return true;
        }
    }

    return false;
}

function canMove(x, y) {
    const points = [
        [x - 10, y - 12],
        [x + 10, y - 12],
        [x - 10, y + 12],
        [x + 10, y + 12]
    ];

    for (const p of points) {
        if (isWall(p[0], p[1])) return false;
    }

    return !hitsFurniture(x, y);
}

function findSafeSpawn(x, y) {
    if (canMove(x, y)) return { x, y };

    for (let radius = 1; radius <= 12; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const tx = x + dx * TILE;
                const ty = y + dy * TILE;

                if (canMove(tx, ty)) return { x: tx, y: ty };
            }
        }
    }

    const map = getMap();

    for (let row = 1; row < map.length - 1; row++) {
        for (let col = 1; col < map[row].length - 1; col++) {
            const tx = col * TILE + 16;
            const ty = row * TILE + 16;

            if (canMove(tx, ty)) return { x: tx, y: ty };
        }
    }

    return { x: 320, y: 320 };
}

// =====================================================
// DOORS
// =====================================================

function changeRoom(door) {
    currentRoom = door.target;

    const spawn = findSafeSpawn(door.sx, door.sy);
    player.x = spawn.x;
    player.y = spawn.y;

    if (!exploredRooms.includes(currentRoom)) {
        exploredRooms.push(currentRoom);
    }

    keys = {};
    camera.x = 0;
    camera.y = 0;

    updateLocation();

    showDialogue("NARRATOR", "You entered " + getRoom().name + ".");
}

// =====================================================
// CHECKPOINTS
// =====================================================

function activateCheckpoint() {
    checkpoint = {
        room: currentRoom,
        x: player.x,
        y: player.y,
        hp: player.maxHp
    };

    player.hp = player.maxHp;
    saveGame();

    showDialogue(
        "SAVE POINT",
        "Your progress has been saved. HP restored!"
    );
}

// =====================================================
// SLEEPY GUARD EVENT
// =====================================================

function wakeSleepyGuardIfReady() {
    if (!hunter || hunter.active || hunter.hp > 0) return;
    if (!sleepyGuard || sleepyGuard.active || sleepyGuard.defeated) return;

    sleepyGuard.active = true;
    sleepyGuard.room = "barracks";
    sleepyGuard.homeRoom = "barracks";
    sleepyGuard.x = 320;
    sleepyGuard.y = 190;
    sleepyGuard.alerted = false;
    sleepyGuard.fleeGrace = 0;

    const sleepyNPC = npcs.barracks.find(
        npc => npc.name === "SLEEPY GUARD"
    );

    if (sleepyNPC) {
        sleepyNPC.lines = [
            "WHAT?! THE HUNTER HAS BEEN DEFEATED?!",
            "YOU'RE THE ONE WHO DID IT?!",
            "I'M NOT LETTING YOU GO ANY FURTHER!"
        ];

        sleepyNPC.line = 0;
    }
}

// =====================================================
// INTERACTIONS
// =====================================================

function interact() {
    if (
        currentRoom === "exit" &&
        distance(player, exitDoorPosition) < 65
    ) {
        if (!hasItem("royal_treasure")) {
            showDialogue(
                "LOCKED EXIT",
                "The exit is sealed. You must defeat the King and recover the treasure first."
            );
        } else {
            startEnding();
        }

        return;
    }

    for (const npc of npcs[currentRoom] || []) {
        if (
    npc.name === "SLEEPY GUARD" &&
    sleepyGuard &&
    (sleepyGuard.active || sleepyGuard.defeated)
    ) continue;

        if (distance(player, npc) < 55) {
            const line = npc.lines[npc.line % npc.lines.length];
            npc.line++;
            showDialogue(npc.name, line);
            return;
        }
    }

    for (let i = 0; i < (chests[currentRoom] || []).length; i++) {
        const chest = chests[currentRoom][i];

        const pos = {
            x: chest.x * TILE + 16,
            y: chest.y * TILE + 16
        };

        if (distance(player, pos) < 45) {
            openChest(i);
            return;
        }
    }

    for (const object of furniture[currentRoom] || []) {
        const pos = {
            x: object.x * TILE + 16,
            y: object.y * TILE + 16
        };

        if (object.type === "cushion" && distance(player, pos) < 45) {
            player.hp = Math.min(player.maxHp, player.hp + 3);
            showDialogue("NARRATOR", "You rested. (+3 HP)");
            return;
        }
    }

    if (
        currentRoom === "entrance" &&
        distance(player, { x: 320, y: 160 }) < 55
    ) {
        activateCheckpoint();
        return;
    }

    if (
        currentRoom === "royal" &&
        king &&
        king.active &&
        distance(player, king) < 65
    ) {
        if (enemies.some(enemy => enemy.active && !enemy.defeated)) {
            showDialogue("NARRATOR", "The castle guards still stand. Defeat every hostile guard first!");
        } else if (hunter && hunter.active && !hunter.defeated) {
            showDialogue("NARRATOR", "The Hunter still guards the castle. Defeat the Hunter first!");
        } else if (sleepyGuard && sleepyGuard.active && !sleepyGuard.defeated) {
            showDialogue("NARRATOR", "The awakened guard is still standing. Defeat him first!");
        } else {
            startBattle(king);
        }

        return;
    }

    for (const door of getRoom().doors) {
        const pos = {
            x: door.x * TILE + 16,
            y: door.y * TILE + 16
        };

        if (distance(player, pos) < 45) {
            changeRoom(door);
            return;
        }
    }

    showDialogue("NARRATOR", "Nothing interesting nearby.");
}

// =====================================================
// OPEN CHESTS
// =====================================================

function openChest(index) {
    const chest = chests[currentRoom][index];
    const chestId = currentRoom + "_" + index;

    if (openedChests.includes(chestId)) {
        showDialogue("CHEST", "This chest is empty.");
        return;
    }

    chest.items.forEach(id => addItem(id));
    openedChests.push(chestId);

    showDialogue(
        "CHEST",
        "You found: " +
        chest.items.map(id => itemInfo[id].name).join(", ")
    );
}

// =====================================================
// ENEMY ROUTING
// =====================================================

function findRoomRoute(start, destination) {
    const queue = [[start, []]];
    const visited = new Set([start]);

    while (queue.length) {
        const [room, path] = queue.shift();

        if (room === destination) return path;

        for (const door of rooms[room].doors) {
            if (!visited.has(door.target)) {
                visited.add(door.target);
                queue.push([door.target, [...path, { from: room, door }]]);
            }
        }
    }

    return null;
}

function moveEnemyThroughDoor(enemy, door) {
    enemy.room = door.target;
    enemy.x = door.sx;
    enemy.y = door.sy;
    enemy.fleeGrace = 50;
}

function unlockHunterIfReady() {
    if (!hunter || hunter.defeated || hunter.hp <= 0 || hunter.active) return;

    const allEnemiesDefeated = enemies.every(enemy =>
        !enemy.active || enemy.hp <= 0 || enemy.spared || enemy.defeated
    );

    if (!allEnemiesDefeated) return;

    hunter.active = true;
    hunter.room = "hall";
    hunter.homeRoom = "hall";
    hunter.x = 470;
    hunter.y = 190;
    hunter.alerted = true;
    hunter.lostTimer = 0;
    hunter.fleeGrace = 0;
}

// =====================================================
// ENEMY DETECTION
// =====================================================

function detectPlayer(enemy) {
    if (!enemy.active || enemy.defeated || enemy.id === "king") return;
    if (enemy.room === currentRoom) enemy.alerted = true;
}

function updateOneEnemy(enemy) {
    if (!enemy || !enemy.active || enemy.defeated ||
        enemy.hp <= 0 || enemy.id === "king") return;

    if (enemy.fleeGrace > 0) enemy.fleeGrace--;

    detectPlayer(enemy);

    if (!enemy.alerted) return;

    if (enemy.room === currentRoom) {
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 1) {
            const nx = enemy.x + dx / dist * enemy.speed;
            const ny = enemy.y + dy / dist * enemy.speed;

            const oldRoom = currentRoom;
            currentRoom = enemy.room;

            if (!isWall(nx, enemy.y)) enemy.x = nx;
            if (!isWall(enemy.x, ny)) enemy.y = ny;

            currentRoom = oldRoom;
        }

        if (dist < 28 && enemy.fleeGrace <= 0 && !battleOpen) {
            startBattle(enemy);
        }

        return;
    }

    const route = findRoomRoute(enemy.room, currentRoom);
    if (!route || !route.length) return;

    const door = route[0].door;
    const targetX = door.x * TILE + 16;
    const targetY = door.y * TILE + 16;

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
        enemy.x += dx / dist * enemy.speed;
        enemy.y += dy / dist * enemy.speed;
    } else {
        moveEnemyThroughDoor(enemy, door);
    }
}

function updateEnemies() {
    if (
        battleOpen ||
        dialogueOpen ||
        paused ||
        gameOver ||
        endingStarted
    ) return;

    unlockHunterIfReady();
    wakeSleepyGuardIfReady();

    enemies.forEach(updateOneEnemy);
    updateOneEnemy(hunter);
    updateOneEnemy(sleepyGuard);
}

// =====================================================
// BATTLE STATE
// =====================================================

let battle = {
    enemy: null,
    phase: "menu",
    menu: "main",
    selected: 0,
    message: "",
    aimX: 0,
    aimDirection: 1,
    aimSpeed: 5,
    bullets: [],
    bulletTimer: 0,
    bulletDuration: 240,
    heart: {
        x: W / 2,
        y: 250,
        size: 12
    },
    arena: {
        x: 190,
        y: 175,
        w: 260,
        h: 150
    },
    actOptions: ["TALK", "JOKE", "CHEER", "THREATEN", "CHECK"],
    actScore: 0,
    itemOptions: [],
    bulletPattern: 0,
    turnCount: 0
};

function startBattle(enemy) {
    if (
        battleOpen ||
        !enemy ||
        !enemy.active ||
        enemy.defeated ||
        enemy.hp <= 0
    ) return;

    battleOpen = true;
    keys = {};
    battle.enemy = enemy;

    if (enemy.id === "king") {
        playMusic("king");
    } else if (enemy.id === "hunter") {
        playMusic("hunter");
    } else {
        playMusic("fight");
    }

    battle.phase = "menu";
    battle.menu = "main";
    battle.selected = 0;
    battle.message = enemy.name + " blocks your way!";
    battle.actScore = enemy.actScore || 0;
    battle.turnCount = 0;
    battle.bullets = [];
    battle.bulletTimer = 0;
    battle.bulletPattern = 0;
    battle.heart.x = battle.arena.x + battle.arena.w / 2;
    battle.heart.y = battle.arena.y + battle.arena.h / 2;
}

// =====================================================
// BATTLE MENUS
// =====================================================

const mainOptions = ["FIGHT", "ACT", "ITEM", "MERCY"];

function handleBattleInput(key) {
    if (!battleOpen) return;

    if (battle.phase === "aim") {
        if (key === "enter" || key === "e") resolveAttack();
        return;
    }

    if (battle.phase === "dodge") return;

    if (battle.phase === "message") {
        if (key === "enter" || key === "e") continueBattle();
        return;
    }

    const options = getCurrentOptions();
    if (!options.length) return;

    const columns = Math.min(2, options.length);

    if (key === "arrowleft" || key === "a") {
        if (battle.selected % columns > 0) battle.selected--;
    }

    if (key === "arrowright" || key === "d") {
        if (
            battle.selected % columns < columns - 1 &&
            battle.selected + 1 < options.length
        ) battle.selected++;
    }

    if (key === "arrowup" || key === "w") {
        battle.selected = Math.max(0, battle.selected - columns);
    }

    if (key === "arrowdown" || key === "s") {
        battle.selected = Math.min(options.length - 1, battle.selected + columns);
    }

    if (key === "escape") {
        if (battle.menu !== "main") {
            battle.menu = "main";
            battle.selected = 0;
        }
        return;
    }

    if (key === "enter" || key === "e") selectBattleOption();
}

function getCurrentOptions() {
    if (battle.menu === "main") return mainOptions;
    if (battle.menu === "act") return battle.actOptions;
    if (battle.menu === "item") return battle.itemOptions;
    if (battle.menu === "mercy") return ["FLEE", "SPARE"];
    return mainOptions;
}

function selectBattleOption() {
    const options = getCurrentOptions();
    const selected = options[battle.selected];

    if (!selected) return;

    if (battle.menu === "main") {
        if (selected === "FIGHT") startAim();

        if (selected === "ACT") {
            battle.menu = "act";
            battle.selected = 0;
        }

        if (selected === "ITEM") {
            battle.menu = "item";
            battle.itemOptions = inventory.map(i =>
                itemInfo[i.id]?.name || i.id
            );
            battle.itemOptions.push("BACK");
            battle.selected = 0;
        }

        if (selected === "MERCY") {
            battle.menu = "mercy";
            battle.selected = 0;
        }

        return;
    }

    if (battle.menu === "act") {
        performAct(selected);
        return;
    }

    if (battle.menu === "item") {
        if (selected === "BACK") {
            battle.menu = "main";
            battle.selected = 0;
            return;
        }

        const item = inventory.find(i =>
            itemInfo[i.id]?.name === selected
        );

        if (!item) return;

        const used = useItem(item.id);

        if (used) {
            finishPlayerTurn();
        } else {
            battle.phase = "message";
        }

        return;
    }

    if (battle.menu === "mercy") {
        if (selected === "FLEE") fleeBattle();
        if (selected === "SPARE") spareEnemy();
    }
}

// =====================================================
// ACT SYSTEM
// =====================================================

function performAct(action) {
    const enemy = battle.enemy;
    let response = "";

    const reactions = {
        TALK: {
            hunter: "The Hunter refuses to listen.",
            king: "The King ignores your words.",
            default: "The enemy listens for a moment."
        },
        JOKE: {
            hunter: "The Hunter does not find it funny.",
            king: "The King looks unimpressed.",
            default: "The enemy tries not to laugh."
        },
        CHEER: {
            hunter: "The Hunter becomes more determined.",
            king: "The King raises an eyebrow.",
            default: "The enemy seems encouraged."
        },
        THREATEN: {
            hunter: "The Hunter steps forward.",
            king: "The King is not intimidated.",
            default: "The enemy looks uncertain."
        },
        CHECK: {
            hunter: "A relentless guardian. It will not give up.",
            king: "The ruler of this castle. Extremely powerful.",
            default: "HP: " + enemy.hp + " / " + enemy.maxHp
        }
    };

    if (action === "CHECK") {
        response = reactions.CHECK[enemy.id] || reactions.CHECK.default;
        battle.message = response;
        battle.phase = "message";
        return;
    }

    if (enemy.id === "hunter" || enemy.id === "king") {
        response = reactions[action][enemy.id];
    } else {
        response = reactions[action].default;

        const points = {
            TALK: 1,
            JOKE: 1,
            CHEER: 2,
            THREATEN: -1
        };

        battle.actScore += points[action] || 0;
    }

    enemy.actScore = battle.actScore;
    battle.message = response;
    battle.phase = "message";
}

function continueBattle() {
    const enemy = battle.enemy;

    // HP IS THE FINAL AUTHORITY.
    // A zero-HP enemy always counts as defeated.
    if (enemy && enemy.hp <= 0) {
        finishBattle(true);
        return;
    }

    if (battle.message === "YOU WON!") {
        finishBattle(true);
        return;
    }

    if (battle.message === "YOU WERE SPARED!") {
        finishBattle(false, true);
        return;
    }

    if (battle.message === "YOU ESCAPED!") {
        finishBattle(false);
        return;
    }

    finishPlayerTurn();
}

// =====================================================
// ACCURACY ATTACK
// =====================================================

function startAim() {
    battle.phase = "aim";
    battle.aimX = 0;
    battle.aimDirection = 1;

    battle.aimSpeed =
        battle.enemy.id === "hunter" ? 7 :
        battle.enemy.id === "king" ? 8 : 5;

    battle.message = "PRESS ENTER NEAR THE CENTRE!";
}

function updateAim() {
    battle.aimX += battle.aimSpeed * battle.aimDirection;

    if (battle.aimX >= 260) {
        battle.aimX = 260;
        battle.aimDirection = -1;
    } else if (battle.aimX <= 0) {
        battle.aimX = 0;
        battle.aimDirection = 1;
    }
}

function resolveAttack() {
    const enemy = battle.enemy;

    if (!enemy || enemy.defeated || enemy.hp <= 0) {
        if (enemy) {
            enemy.hp = 0;
            enemy.defeated = true;
            enemy.active = false;
        }

        battle.message = "YOU WON!";
        battle.phase = "message";
        return;
    }

    const weapon = itemInfo[equippedWeapon] || { power: 3 };
    const distanceFromCentre = Math.abs(battle.aimX - 130);

    const accuracy = Math.max(0, 1 - distanceFromCentre / 130);
    const multiplier = 0.5 + accuracy * 1.5;

    const damage = Math.max(1, Math.round(weapon.power * multiplier));

    enemy.hp = Math.max(0, enemy.hp - damage);

    if (enemy.hp <= 0) {
        // IMMEDIATELY MARK THE ENEMY AS DEFEATED.
        enemy.hp = 0;
        enemy.defeated = true;
        enemy.active = false;

        battle.message = "YOU WON!";
        battle.phase = "message";
        return;
    }

    battle.message =
        "Accuracy: " + Math.round(accuracy * 100) +
        "% | Damage: " + damage;

    battle.phase = "message";
}

// =====================================================
// MERCY
// =====================================================

function fleeBattle() {
    if (battle.enemy.id === "king") {
        battle.message = "You cannot flee from the King!";
        battle.phase = "message";
        return;
    }

    battle.message = "YOU ESCAPED!";
    battle.phase = "message";
}

function spareEnemy() {
    const enemy = battle.enemy;

    if (
        enemy.id === "hunter" ||
        enemy.id === "king" ||
        enemy.id === "sleepy_guard"
    ) {
        battle.message = "This enemy cannot be spared yet.";
        battle.phase = "message";
        return;
    }

    if (battle.actScore < 3) {
        battle.message = "The enemy is not ready to be spared.";
        battle.phase = "message";
        return;
    }

    enemy.spared = true;
    enemy.active = false;

    battle.message = "YOU WERE SPARED!";
    battle.phase = "message";
}

// =====================================================
// PLAYER TURN END
// =====================================================

function finishPlayerTurn() {
    battle.menu = "main";
    battle.selected = 0;
    battle.phase = "dodge";

    battle.turnCount++;
    battle.bullets = [];
    battle.bulletTimer = 0;

    battle.heart.x = battle.arena.x + battle.arena.w / 2;
    battle.heart.y = battle.arena.y + battle.arena.h / 2;

    battle.bulletDuration =
        battle.enemy.id === "king" ? 220 :
        battle.enemy.id === "hunter" ? 210 : 180;

    battle.message = battle.enemy.name + " attacks!";
}

// =====================================================
// BULLET PATTERNS
// =====================================================

function spawnBullet(x, y, vx, vy, radius = 6) {
    battle.bullets.push({ x, y, vx, vy, radius });
}

function firePattern() {
    const arena = battle.arena;
    const enemy = battle.enemy;
    const difficulty = enemy.difficulty || 1;

    const pattern = battle.bulletPattern % 4;
    battle.bulletPattern++;

    const speed = 0.7 + difficulty * 0.13;

    if (pattern === 0) {
        const startX = arena.x + 20 + Math.random() * (arena.w - 40);
        const startY = arena.y + 3;

        const dx = battle.heart.x - startX;
        const dy = battle.heart.y - startY;
        const length = Math.hypot(dx, dy) || 1;

        spawnBullet(startX, startY, dx / length * speed, dy / length * speed);
    } else if (pattern === 1) {
        const y = arena.y + 20 + Math.random() * (arena.h - 40);
        const count = 1 + difficulty;

        for (let i = 0; i < count; i++) {
            spawnBullet(
                arena.x + 3,
                y + i * 15 - (count - 1) * 7,
                speed,
                0
            );
        }
    } else if (pattern === 2) {
        const count = 1 + difficulty;

        for (let i = 0; i < count; i++) {
            spawnBullet(
                arena.x + 15 + Math.random() * (arena.w - 30),
                arena.y + 3,
                (Math.random() - 0.5) * 0.35,
                speed
            );
        }
    } else {
        const y = arena.y + 20 + Math.random() * (arena.h - 40);
        const count = 1 + difficulty;

        for (let i = 0; i < count; i++) {
            spawnBullet(
                arena.x + arena.w - 3,
                y + i * 15 - (count - 1) * 7,
                -speed,
                0
            );
        }
    }
}

// =====================================================
// DODGE UPDATE
// =====================================================

function updateDodge() {
    const arena = battle.arena;
    const heart = battle.heart;

    if (
        !battle.enemy ||
        battle.enemy.defeated ||
        battle.enemy.hp <= 0
    ) {
        battle.bullets = [];
        battle.phase = "message";
        battle.message = "YOU WON!";
        return;
    }

    const speed = 3.3;

    if (keys["arrowleft"] || keys["a"]) heart.x -= speed;
    if (keys["arrowright"] || keys["d"]) heart.x += speed;
    if (keys["arrowup"] || keys["w"]) heart.y -= speed;
    if (keys["arrowdown"] || keys["s"]) heart.y += speed;

    heart.x = Math.max(
        arena.x + heart.size,
        Math.min(arena.x + arena.w - heart.size, heart.x)
    );

    heart.y = Math.max(
        arena.y + heart.size,
        Math.min(arena.y + arena.h - heart.size, heart.y)
    );

    battle.bulletTimer++;

    const difficulty = Math.max(1, battle.enemy.difficulty || 1);
    const interval = Math.max(24, 42 - difficulty * 4);

    if (battle.bulletTimer === 1 || battle.bulletTimer % interval === 0) {
        firePattern();
    }

    for (const bullet of battle.bullets) {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        const distance = Math.hypot(
            bullet.x - heart.x,
            bullet.y - heart.y
        );

        if (distance < bullet.radius + heart.size / 2) {
            const hitDamage =
                (battle.enemy.id === "hunter" || battle.enemy.id === "king")
                    ? 1
                    : 2;

            player.hp = Math.max(0, player.hp - hitDamage);
            bullet.x = -1000;

            if (player.hp <= 0) {
                triggerGameOver();
                return;
            }
        }
    }

    battle.bullets = battle.bullets.filter(bullet =>
        Number.isFinite(bullet.x) &&
        Number.isFinite(bullet.y) &&
        bullet.x > arena.x - 35 &&
        bullet.x < arena.x + arena.w + 35 &&
        bullet.y > arena.y - 35 &&
        bullet.y < arena.y + arena.h + 35
    );

    if (battle.bulletTimer >= battle.bulletDuration) {
        battle.bullets = [];
        battle.phase = "menu";
        battle.menu = "main";
        battle.selected = 0;
        keys = {};
        battle.message = "Your turn!";
    }
}

// =====================================================
// END BATTLE
// =====================================================

function finishBattle(victory, spared = false) {
    const enemy = battle.enemy;

    if (!enemy) {
        battleOpen = false;
        battle.enemy = null;
        return;
    }

    // EVEN IF THE MESSAGE IS WRONG, ZERO HP MEANS VICTORY.
    if (enemy.hp <= 0) {
        victory = true;
        enemy.hp = 0;
    }

    if (victory || spared) {
        enemy.active = false;
        enemy.defeated = true;

        if (enemy.id === "hunter") {
            wakeSleepyGuardIfReady();

            showDialogue(
                "NARRATOR",
                "The Hunter has been defeated! Somewhere in the barracks, a sleepy guard has awakened..."
            );
        } else if (enemy.id === "king") {
            if (victory) {
                if (!hasItem("kings_key")) addItem("kings_key");
                if (!hasItem("royal_treasure")) addItem("royal_treasure");
            }

            showDialogue(
                "NARRATOR",
                "You defeated the King and recovered the stolen treasure! The King's Key is now yours. The castle exit is unlocked!"
            );
        } else if (enemy.id === "sleepy_guard") {
            showDialogue(
                "NARRATOR",
                "The awakened guard has been defeated. The way to the King is clear!"
            );
        } else {
            showDialogue("NARRATOR", "The enemy is no longer a threat.");
        }
    } else {
        enemy.fleeGrace = 100;
        showDialogue("NARRATOR", "You escaped. The enemy is still nearby!");
    }

    battleOpen = false;
    battle.enemy = null;

    playMusic("exploration");

    unlockHunterIfReady();
    wakeSleepyGuardIfReady();

    saveGame();
}

// =====================================================
// BATTLE UPDATE
// =====================================================

function updateBattle() {
    if (!battleOpen) return;
    if (battle.phase === "aim") updateAim();
    if (battle.phase === "dodge") updateDodge();
}

// =====================================================
// PLAYER MOVEMENT
// =====================================================

function updatePlayer() {
    if (
        dialogueOpen ||
        paused ||
        inventoryOpen ||
        battleOpen ||
        gameOver ||
        endingStarted
    ) return;

    let dx = 0;
    let dy = 0;

    if (keys["w"] || keys["arrowup"]) dy--;
    if (keys["s"] || keys["arrowdown"]) dy++;
    if (keys["a"] || keys["arrowleft"]) dx--;
    if (keys["d"] || keys["arrowright"]) dx++;

    if (dx && dy) {
        dx *= 0.707;
        dy *= 0.707;
    }

    const nx = player.x + dx * player.speed;
    const ny = player.y + dy * player.speed;

    if (canMove(nx, player.y)) player.x = nx;
    if (canMove(player.x, ny)) player.y = ny;
}

// =====================================================
// CAMERA
// =====================================================

function updateCamera() {
    const mapWidth = getMap()[0].length * TILE;
    const mapHeight = getMap().length * TILE;

    camera.x = Math.max(0, Math.min(player.x - W / 2, mapWidth - W));
    camera.y = Math.max(0, Math.min(player.y - H / 2, mapHeight - H));
}

// =====================================================
// DRAW MAP
// =====================================================

function drawMap() {
    const map = getMap();

    for (let row = 0; row < map.length; row++) {
        for (let col = 0; col < map[row].length; col++) {
            const x = col * TILE - camera.x;
            const y = row * TILE - camera.y;

            if (map[row][col] === "#") {
                ctx.fillStyle = "#292334";
                ctx.fillRect(x, y, TILE, TILE);

                ctx.fillStyle = "#41364e";
                ctx.fillRect(x + 2, y + 2, TILE - 4, 5);
            } else {
                ctx.fillStyle = "#51445a";
                ctx.fillRect(x, y, TILE, TILE);

                ctx.fillStyle = "#5b4b62";
                ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            }
        }
    }

    for (const door of getRoom().doors) {
        const x = door.x * TILE - camera.x;
        const y = door.y * TILE - camera.y;

        ctx.fillStyle = "#a66a37";
        ctx.fillRect(x + 5, y + 3, 22, 29);

        ctx.fillStyle = "#ffca64";
        ctx.fillRect(x + 21, y + 16, 3, 3);
    }

    if (currentRoom === "exit") {
        const x = exitDoorPosition.x - camera.x;
        const y = exitDoorPosition.y - camera.y;
        const unlocked = hasItem("royal_treasure");

        ctx.fillStyle = unlocked ? "#b17a3c" : "#633c35";
        ctx.fillRect(x - 13, y - 16, 26, 32);

        ctx.fillStyle = unlocked ? "#ffcf77" : "#a64b55";
        ctx.fillRect(x - 3, y - 3, 6, 6);

        ctx.fillStyle = unlocked ? "#ffe7a3" : "#e75b68";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(unlocked ? "EXIT" : "LOCKED", x, y - 23);
        ctx.textAlign = "left";
    }
}

// =====================================================
// DRAW FURNITURE
// =====================================================

function drawFurniture() {
    for (const object of furniture[currentRoom] || []) {
        const x = object.x * TILE - camera.x;
        const y = object.y * TILE - camera.y;

        if (object.type === "barrel") {
            ctx.fillStyle = "#88522d";
            ctx.fillRect(x + 5, y + 3, 22, 26);

            ctx.fillStyle = "#c18a4c";
            ctx.fillRect(x + 5, y + 9, 22, 3);
            ctx.fillRect(x + 5, y + 22, 22, 3);
        }

        if (object.type === "table") {
            ctx.fillStyle = "#70452d";
            ctx.fillRect(x + 2, y + 5, 28, 9);
            ctx.fillRect(x + 5, y + 13, 5, 17);
            ctx.fillRect(x + 22, y + 13, 5, 17);
        }

        if (object.type === "bookshelf") {
            ctx.fillStyle = "#66402d";
            ctx.fillRect(x + 2, y + 1, 28, 30);

            const colors = ["#c44d4d", "#5686ba", "#d5b75b", "#7aaf78"];

            colors.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.fillRect(x + 5 + i * 6, y + 5, 5, 22);
            });
        }

        if (object.type === "box") {
            ctx.fillStyle = "#99602e";
            ctx.fillRect(x + 3, y + 5, 26, 22);

            ctx.fillStyle = "#d19a51";
            ctx.fillRect(x + 14, y + 5, 3, 22);
        }

        if (object.type === "cushion") {
            ctx.fillStyle = "#9a526d";
            ctx.fillRect(x + 3, y + 9, 26, 16);

            ctx.fillStyle = "#d17b9c";
            ctx.fillRect(x + 6, y + 11, 20, 3);
        }
    }
}

// =====================================================
// DRAW CHESTS
// =====================================================

function drawChests() {
    (chests[currentRoom] || []).forEach((chest, index) => {
        const x = chest.x * TILE - camera.x;
        const y = chest.y * TILE - camera.y;

        const opened = openedChests.includes(currentRoom + "_" + index);

        ctx.fillStyle = opened ? "#59402d" : "#9b5c2d";
        ctx.fillRect(x + 4, y + 10, 24, 17);

        ctx.fillStyle = opened ? "#453328" : "#c17a3b";
        ctx.fillRect(x + 4, y + 6, 24, 7);

        if (!opened) {
            ctx.fillStyle = "#ffcf55";
            ctx.fillRect(x + 14, y + 14, 5, 6);
        }
    });
}

// =====================================================
// DRAW CHARACTERS
// =====================================================


// =====================================================
// DRAW CHARACTERS - MEDIEVAL REDESIGN
// =====================================================

function drawCharacter(x, y, color, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    // Body
    ctx.fillStyle = color;
    ctx.fillRect(sx - 10, sy - 4, 20, 22);

    // Head
    ctx.fillStyle = "#e8b68d";
    ctx.fillRect(sx - 8, sy - 16, 16, 12);

    // Hair
    ctx.fillStyle = "#211b27";
    ctx.fillRect(sx - 9, sy - 19, 18, 5);

    // Eyes
    ctx.fillStyle = "#171321";
    ctx.fillRect(sx - 5, sy - 12, 2, 2);
    ctx.fillRect(sx + 3, sy - 12, 2, 2);

    if (label) {
        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, sx, sy - 25);
        ctx.textAlign = "left";
    }
}

// MEDIEVAL GUARD ARMOR
function drawGuardCharacter(x, y, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    // Legs
    ctx.fillStyle = "#393b48";
    ctx.fillRect(sx - 8, sy + 11, 6, 9);
    ctx.fillRect(sx + 2, sy + 11, 6, 9);

    // Boots
    ctx.fillStyle = "#29232a";
    ctx.fillRect(sx - 9, sy + 17, 8, 4);
    ctx.fillRect(sx + 1, sy + 17, 8, 4);

    // Armor body
    ctx.fillStyle = "#727d91";
    ctx.fillRect(sx - 11, sy - 5, 22, 19);

    // Silver chest plate
    ctx.fillStyle = "#c4cfda";
    ctx.fillRect(sx - 8, sy - 4, 16, 13);

    // Chest plate shine
    ctx.fillStyle = "#eef2f5";
    ctx.fillRect(sx - 5, sy - 3, 3, 9);

    // Gold belt
    ctx.fillStyle = "#d8aa48";
    ctx.fillRect(sx - 10, sy + 8, 20, 3);

    // Shoulder armor
    ctx.fillStyle = "#aab5c5";
    ctx.fillRect(sx - 14, sy - 6, 6, 8);
    ctx.fillRect(sx + 8, sy - 6, 6, 8);

    // Neck
    ctx.fillStyle = "#b98567";
    ctx.fillRect(sx - 4, sy - 10, 8, 6);

    // Helmet
    ctx.fillStyle = "#68758c";
    ctx.fillRect(sx - 9, sy - 21, 18, 12);

    ctx.fillStyle = "#bfcbd9";
    ctx.fillRect(sx - 7, sy - 20, 14, 5);

    // Helmet visor
    ctx.fillStyle = "#242c3c";
    ctx.fillRect(sx - 7, sy - 13, 14, 3);

    // Helmet crest
    ctx.fillStyle = "#9d3e49";
    ctx.fillRect(sx - 2, sy - 26, 4, 6);

    // Shield
    ctx.fillStyle = "#8b3d4b";
    ctx.fillRect(sx + 12, sy - 2, 7, 15);

    ctx.fillStyle = "#e5bd60";
    ctx.fillRect(sx + 14, sy + 1, 3, 9);

    if (label) {
        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, sx, sy - 32);
        ctx.textAlign = "left";
    }
}

// THE HUNTER - BLUE AND GOLD WARRIOR ARMOR
function drawHunterCharacter(x, y, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    // Legs
    ctx.fillStyle = "#173f61";
    ctx.fillRect(sx - 9, sy + 10, 7, 11);
    ctx.fillRect(sx + 2, sy + 10, 7, 11);

    // Boots
    ctx.fillStyle = "#d2a33e";
    ctx.fillRect(sx - 10, sy + 18, 9, 4);
    ctx.fillRect(sx + 1, sy + 18, 9, 4);

    // Armor torso
    ctx.fillStyle = "#155b91";
    ctx.fillRect(sx - 12, sy - 6, 24, 19);

    // Blue chest plate
    ctx.fillStyle = "#2788bc";
    ctx.fillRect(sx - 8, sy - 5, 16, 14);

    // Gold chest decoration
    ctx.fillStyle = "#f3c64e";
    ctx.fillRect(sx - 2, sy - 4, 4, 12);
    ctx.fillRect(sx - 8, sy + 2, 16, 3);

    // Shoulder armor
    ctx.fillStyle = "#e2b541";
    ctx.fillRect(sx - 16, sy - 8, 7, 9);
    ctx.fillRect(sx + 9, sy - 8, 7, 9);

    // Neck
    ctx.fillStyle = "#b8d5d8";
    ctx.fillRect(sx - 4, sy - 11, 8, 6);

    // Head
    ctx.fillStyle = "#a9d6d6";
    ctx.fillRect(sx - 8, sy - 21, 16, 13);

    // Red hair / helmet crest
    ctx.fillStyle = "#bd303d";
    ctx.fillRect(sx - 9, sy - 24, 18, 6);
    ctx.fillRect(sx - 5, sy - 29, 12, 6);
    ctx.fillRect(sx + 3, sy - 33, 9, 5);

    // Eyes
    ctx.fillStyle = "#18243b";
    ctx.fillRect(sx - 5, sy - 15, 3, 3);
    ctx.fillRect(sx + 3, sy - 15, 3, 3);

    // Gold armor edges
    ctx.fillStyle = "#ffdb71";
    ctx.fillRect(sx - 12, sy - 6, 2, 17);
    ctx.fillRect(sx + 10, sy - 6, 2, 17);

    if (label) {
        ctx.fillStyle = "#ffdb71";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, sx, sy - 40);
        ctx.textAlign = "left";
    }
}

// THE KING - ROYAL DESIGN
function drawKingCharacter(x, y, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    // Royal robe
    ctx.fillStyle = "#54234e";
    ctx.fillRect(sx - 15, sy - 4, 30, 25);

    // Red robe center
    ctx.fillStyle = "#8d2946";
    ctx.fillRect(sx - 9, sy - 4, 18, 24);

    // Gold robe decorations
    ctx.fillStyle = "#eac052";
    ctx.fillRect(sx - 13, sy - 3, 3, 23);
    ctx.fillRect(sx + 10, sy - 3, 3, 23);
    ctx.fillRect(sx - 4, sy + 3, 8, 3);

    // Royal collar
    ctx.fillStyle = "#f2ce62";
    ctx.fillRect(sx - 10, sy - 8, 20, 6);

    // Head
    ctx.fillStyle = "#e8b68d";
    ctx.fillRect(sx - 9, sy - 21, 18, 14);

    // Beard
    ctx.fillStyle = "#ddd2c0";
    ctx.fillRect(sx - 7, sy - 11, 14, 7);
    ctx.fillRect(sx - 5, sy - 4, 10, 3);

    // Eyes
    ctx.fillStyle = "#211b27";
    ctx.fillRect(sx - 5, sy - 16, 3, 2);
    ctx.fillRect(sx + 3, sy - 16, 3, 2);

    // Crown base
    ctx.fillStyle = "#e8bd48";
    ctx.fillRect(sx - 11, sy - 25, 22, 5);

    // Crown points
    ctx.fillRect(sx - 10, sy - 30, 5, 6);
    ctx.fillRect(sx - 2, sy - 33, 5, 9);
    ctx.fillRect(sx + 6, sy - 30, 5, 6);

    // Crown jewels
    ctx.fillStyle = "#c33b55";
    ctx.fillRect(sx - 2, sy - 25, 5, 3);

    // Royal shoes
    ctx.fillStyle = "#29232a";
    ctx.fillRect(sx - 11, sy + 19, 9, 4);
    ctx.fillRect(sx + 2, sy + 19, 9, 4);

    if (label) {
        ctx.fillStyle = "#ffdc76";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(label, sx, sy - 40);
        ctx.textAlign = "left";
    }
}

function drawNPCs() {
    const roomNPCs = npcs[currentRoom] || [];

    roomNPCs.forEach(npc => {
        if (!npc) return;

        // Hide sleepy guard when handled by the special guard system
        if (
            npc.name === "SLEEPY GUARD" &&
            sleepyGuard &&
            (sleepyGuard.active || sleepyGuard.defeated)
        ) {
            return;
        }

        // Character type selection
        switch (npc.name) {
            case "SLEEPY GUARD":
            case "OLD KNIGHT":
                drawGuardCharacter(npc.x, npc.y, npc.name);
                break;

            case "THE HUNTER":
                drawHunterCharacter(npc.x, npc.y, npc.name);
                break;

            case "THE KING":
                drawKingCharacter(npc.x, npc.y, npc.name);
                break;

            default:
                drawCharacter(
                    npc.x,
                    npc.y,
                    npc.color || "#777777",
                    npc.name || ""
                );
                break;
        }
    });
}

function drawRoyalTreasureChest() {
    if (currentRoom !== "royal" || !king) return;

    const x = 320 - camera.x;
    const y = 66 - camera.y;

    const glow = ctx.createRadialGradient(x, y + 13, 8, x, y + 13, 82);
    glow.addColorStop(0, "rgba(255, 205, 75, 0.34)");
    glow.addColorStop(1, "rgba(255, 174, 40, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(x - 90, y - 65, 180, 145);

    ctx.fillStyle = "#512b16";
    ctx.fillRect(x - 49, y - 8, 98, 19);

    ctx.fillStyle = "#b87522";
    ctx.fillRect(x - 46, y - 18, 92, 20);

    ctx.fillStyle = "#f4bd45";
    ctx.fillRect(x - 42, y - 15, 84, 5);

    ctx.fillStyle = "#704018";
    ctx.fillRect(x - 54, y + 2, 108, 43);

    ctx.fillStyle = "#c98228";
    ctx.fillRect(x - 49, y + 5, 98, 35);

    ctx.fillStyle = "#f5c34e";
    ctx.fillRect(x - 49, y + 5, 98, 5);

    ctx.fillStyle = "#f8d878";
    ctx.fillRect(x - 35, y - 17, 8, 61);
    ctx.fillRect(x + 27, y - 17, 8, 61);
    ctx.fillRect(x - 7, y + 9, 14, 19);

    ctx.fillStyle = "#fff0a6";
    ctx.fillRect(x - 3, y + 13, 6, 7);

    ctx.fillStyle = "#6b421e";
    ctx.fillRect(x - 1, y + 20, 2, 5);

    ctx.fillStyle = "#ffe49a";

    for (const dx of [-43, 43]) {
        ctx.fillRect(x + dx - 2, y + 10, 4, 4);
        ctx.fillRect(x + dx - 2, y + 32, 4, 4);
    }

    if (!king.active && hasItem("kings_key")) {
        ctx.save();
        ctx.translate(x + 72, y + 25);
        ctx.rotate(-0.35);

        ctx.fillStyle = "#ffe36b";
        ctx.fillRect(-3, -17, 6, 28);
        ctx.fillRect(-8, -19, 16, 6);
        ctx.fillRect(-8, -19, 5, 12);
        ctx.fillRect(3, -19, 5, 12);
        ctx.fillRect(1, 5, 8, 5);
        ctx.fillRect(5, 10, 4, 6);

        ctx.restore();
    }
}

function drawEnemies() {
    if (currentRoom === "royal") drawRoyalTreasureChest();

    enemies.forEach(enemy => {
        if (
            enemy.active &&
            !enemy.defeated &&
            enemy.hp > 0 &&
            enemy.room === currentRoom
        ) {
            drawGuardCharacter(enemy.x, enemy.y, enemy.name);
        }
    });

    if (
        hunter.active &&
        !hunter.defeated &&
        hunter.hp > 0 &&
        hunter.room === currentRoom
    ) {
        drawHunterCharacter(hunter.x, hunter.y, hunter.name);
    }

    if (
        sleepyGuard.active &&
        !sleepyGuard.defeated &&
        sleepyGuard.hp > 0 &&
        sleepyGuard.room === currentRoom
    ) {
        drawGuardCharacter(
            sleepyGuard.x,
            sleepyGuard.y,
            sleepyGuard.name
        );
    }

    if (
        king.active &&
        !king.defeated &&
        king.hp > 0 &&
        king.room === currentRoom
    ) {
        drawKingCharacter(king.x, king.y, king.name);
    }
}

function drawPlayer() {
    const x = player.x - camera.x;
    const y = player.y - camera.y;

    ctx.fillStyle = "#4a8ac7";
    ctx.fillRect(x - 9, y - 5, 18, 17);

    ctx.fillStyle = "#e8b68d";
    ctx.fillRect(x - 8, y - 16, 16, 12);

    ctx.fillStyle = "#392b27";
    ctx.fillRect(x - 9, y - 18, 18, 5);

    ctx.fillStyle = "#171321";
    ctx.fillRect(x - 5, y - 12, 2, 2);
    ctx.fillRect(x + 3, y - 12, 2, 2);

    ctx.fillStyle = "#302a43";
    ctx.fillRect(x - 7, y + 11, 5, 6);
    ctx.fillRect(x + 3, y + 11, 5, 6);
}


function drawRoyalTreasureChest() {
    if (currentRoom !== "royal" || !king) return;

    const x = 320 - camera.x;
    const y = 66 - camera.y;

    const glow = ctx.createRadialGradient(x, y + 13, 8, x, y + 13, 82);
    glow.addColorStop(0, "rgba(255, 205, 75, 0.34)");
    glow.addColorStop(1, "rgba(255, 174, 40, 0)");

    ctx.fillStyle = glow;
    ctx.fillRect(x - 90, y - 65, 180, 145);

    ctx.fillStyle = "#512b16";
    ctx.fillRect(x - 49, y - 8, 98, 19);

    ctx.fillStyle = "#b87522";
    ctx.fillRect(x - 46, y - 18, 92, 20);

    ctx.fillStyle = "#f4bd45";
    ctx.fillRect(x - 42, y - 15, 84, 5);

    ctx.fillStyle = "#704018";
    ctx.fillRect(x - 54, y + 2, 108, 43);

    ctx.fillStyle = "#c98228";
    ctx.fillRect(x - 49, y + 5, 98, 35);

    ctx.fillStyle = "#f5c34e";
    ctx.fillRect(x - 49, y + 5, 98, 5);

    ctx.fillStyle = "#f8d878";
    ctx.fillRect(x - 35, y - 17, 8, 61);
    ctx.fillRect(x + 27, y - 17, 8, 61);
    ctx.fillRect(x - 7, y + 9, 14, 19);

    ctx.fillStyle = "#fff0a6";
    ctx.fillRect(x - 3, y + 13, 6, 7);

    ctx.fillStyle = "#6b421e";
    ctx.fillRect(x - 1, y + 20, 2, 5);

    ctx.fillStyle = "#ffe49a";

    for (const dx of [-43, 43]) {
        ctx.fillRect(x + dx - 2, y + 10, 4, 4);
        ctx.fillRect(x + dx - 2, y + 32, 4, 4);
    }

    if (!king.active && hasItem("kings_key")) {
        ctx.save();
        ctx.translate(x + 72, y + 25);
        ctx.rotate(-0.35);

        ctx.fillStyle = "#ffe36b";
        ctx.fillRect(-3, -17, 6, 28);
        ctx.fillRect(-8, -19, 16, 6);
        ctx.fillRect(-8, -19, 5, 12);
        ctx.fillRect(3, -19, 5, 12);
        ctx.fillRect(1, 5, 8, 5);
        ctx.fillRect(5, 10, 4, 6);

        ctx.restore();
    }
}

function drawEnemies() {
    if (currentRoom === "royal") drawRoyalTreasureChest();

    enemies.forEach(enemy => {
        if (
            enemy.active &&
            !enemy.defeated &&
            enemy.hp > 0 &&
            enemy.room === currentRoom
        ) {
            drawCharacter(enemy.x, enemy.y, enemy.color, enemy.name);
        }
    });

    if (
        hunter.active &&
        !hunter.defeated &&
        hunter.hp > 0 &&
        hunter.room === currentRoom
    ) {
        drawCharacter(hunter.x, hunter.y, hunter.color, hunter.name);
    }

    if (
        sleepyGuard.active &&
        !sleepyGuard.defeated &&
        sleepyGuard.hp > 0 &&
        sleepyGuard.room === currentRoom
    ) {
        drawCharacter(sleepyGuard.x, sleepyGuard.y, sleepyGuard.color, sleepyGuard.name);
    }

    if (
        king.active &&
        !king.defeated &&
        king.hp > 0 &&
        king.room === currentRoom
    ) {
        drawCharacter(king.x, king.y, king.color, king.name);
    }
}

function drawPlayer() {
    const x = player.x - camera.x;
    const y = player.y - camera.y;

    ctx.fillStyle = "#4a8ac7";
    ctx.fillRect(x - 9, y - 5, 18, 17);

    ctx.fillStyle = "#e8b68d";
    ctx.fillRect(x - 8, y - 16, 16, 12);

    ctx.fillStyle = "#392b27";
    ctx.fillRect(x - 9, y - 18, 18, 5);

    ctx.fillStyle = "#171321";
    ctx.fillRect(x - 5, y - 12, 2, 2);
    ctx.fillRect(x + 3, y - 12, 2, 2);

    ctx.fillStyle = "#302a43";
    ctx.fillRect(x - 7, y + 11, 5, 6);
    ctx.fillRect(x + 3, y + 11, 5, 6);
}

// =====================================================
// MINIMAP
// =====================================================

const miniMapLayout = {
    barracks: { x: 0, y: 0, label: "BARR" },
    library: { x: 1, y: 0, label: "LIB" },
    garden: { x: 2, y: 0, label: "GARD" },
    entrance: { x: 0, y: 1, label: "ENT" },
    hall: { x: 1, y: 1, label: "HALL" },
    royal: { x: 2, y: 1, label: "ROY" },
    armory: { x: 0, y: 2, label: "ARM" },
    dungeon: { x: 1, y: 2, label: "DUNG" },
    exit: { x: 2, y: 2, label: "EXIT" }
};

const miniMapLinks = [
    ["entrance", "hall"],
    ["hall", "library"],
    ["hall", "barracks"],
    ["hall", "armory"],
    ["hall", "royal"],
    ["hall", "dungeon"],
    ["hall", "garden"],
    ["royal", "exit"]
];

function drawMiniMap() {
    const panelX = 450;
    const panelY = 10;
    const panelW = 180;
    const panelH = 130;

    const startX = 465;
    const startY = 39;
    const gapX = 55;
    const gapY = 32;

    ctx.fillStyle = "rgba(12, 9, 20, 0.88)";
    ctx.fillRect(panelX, panelY, panelW, panelH);

    ctx.strokeStyle = "#d6b46b";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelW, panelH);

    ctx.fillStyle = "#ffcf77";
    ctx.font = "10px monospace";
    ctx.fillText("CASTLE MAP", panelX + 12, panelY + 17);

    function getNodePosition(roomId) {
        const node = miniMapLayout[roomId];

        return {
            x: startX + node.x * gapX,
            y: startY + node.y * gapY
        };
    }

    ctx.strokeStyle = "#82758d";
    ctx.lineWidth = 2;

    miniMapLinks.forEach(([a, b]) => {
        if (!exploredRooms.includes(a) && !exploredRooms.includes(b)) return;

        const p1 = getNodePosition(a);
        const p2 = getNodePosition(b);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    });

    Object.keys(miniMapLayout).forEach(roomId => {
        const node = miniMapLayout[roomId];
        const pos = getNodePosition(roomId);

        const discovered = exploredRooms.includes(roomId);
        const current = currentRoom === roomId;

        ctx.fillStyle = current
            ? "#ffcf77"
            : discovered
                ? "#66a9df"
                : "#55505e";

        ctx.fillRect(pos.x - 5, pos.y - 5, 10, 10);

        ctx.fillStyle = current
            ? "#ffcf77"
            : discovered
                ? "#ffffff"
                : "#88818f";

        ctx.font = "8px monospace";
        ctx.fillText(node.label, pos.x - 15, pos.y + 13);
    });
}

// =====================================================
// INVENTORY DISPLAY
// =====================================================

function drawInventory() {
    if (!inventoryOpen) return;

    ctx.fillStyle = "rgba(0,0,0,0.9)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#292334";
    ctx.fillRect(55, 35, 530, 330);

    ctx.strokeStyle = "#d6b46b";
    ctx.lineWidth = 3;
    ctx.strokeRect(55, 35, 530, 330);

    ctx.fillStyle = "#ffcf77";
    ctx.font = "20px monospace";
    ctx.fillText("INVENTORY", 80, 70);

    ctx.fillStyle = "white";
    ctx.font = "13px monospace";

    ctx.fillText(
        "EQUIPPED: " + (itemInfo[equippedWeapon]?.name || "None"),
        80, 110
    );

    inventory.forEach((item, i) => {
        const selected = i === selectedInventoryIndex;
        const equipped = item.id === equippedWeapon;

        if (selected) {
            ctx.fillStyle = "#51445a";
            ctx.fillRect(75, 130 + i * 22, 470, 20);
        }

        ctx.fillStyle = selected
            ? "#ffcf77"
            : equipped
                ? "#e5c16e"
                : "white";

        ctx.fillText(
            (selected ? "> " : "  ") +
            (itemInfo[item.id]?.name || item.id) +
            " x" + item.qty,
            85,
            145 + i * 22
        );
    });

    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText("LEFT / RIGHT / JOYSTICK = SELECT ITEM", 80, 326);
    ctx.fillText("Z = USE / EQUIP SELECTED ITEM", 80, 341);
    ctx.fillText("X / I / ESC = CLOSE", 80, 356);
}

// =====================================================
// BATTLE DISPLAY
// =====================================================

function drawBattle() {
    if (!battleOpen) return;

    ctx.fillStyle = "#100d18";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#e5c16e";
    ctx.lineWidth = 3;
    ctx.strokeRect(35, 25, 570, 350);

    const enemy = battle.enemy;

    ctx.fillStyle = "white";
    ctx.font = "18px monospace";
    ctx.fillText(enemy.name, 65, 60);

    ctx.fillStyle = "#542d35";
    ctx.fillRect(65, 75, 250, 12);

    ctx.fillStyle = "#e45b65";
    ctx.fillRect(65, 75, 250 * (enemy.hp / enemy.maxHp), 12);

    ctx.font = "12px monospace";
    ctx.fillStyle = "white";
    ctx.fillText("HP " + enemy.hp + " / " + enemy.maxHp, 330, 86);
    ctx.fillText("PLAYER HP: " + player.hp + " / " + player.maxHp, 65, 115);

    ctx.fillStyle = "#542d35";
    ctx.fillRect(65, 125, 250, 10);

    ctx.fillStyle = "#62bd79";
    ctx.fillRect(65, 125, 250 * (player.hp / player.maxHp), 10);

    if (battle.phase === "menu") drawBattleMenu();
    if (battle.phase === "aim") drawAimBar();
    if (battle.phase === "dodge") drawDodgeArena();

    if (battle.phase === "message") {
        ctx.fillStyle = "white";
        ctx.font = "13px monospace";
        ctx.fillText(battle.message, 65, 220);

        ctx.fillStyle = "#ffcf77";
        ctx.font = "12px monospace";
        ctx.fillText("PRESS ENTER TO CONTINUE", 185, 340);
    }
}

// =====================================================
// BATTLE MENU
// =====================================================

function drawBattleMenu() {
    const options = getCurrentOptions();

    ctx.fillStyle = "white";
    ctx.font = "13px monospace";
    ctx.fillText(battle.message, 65, 185);

    const columns = Math.min(2, Math.max(1, options.length));
    const startX = 70;
    const startY = 220;
    const buttonWidth = 230;
    const buttonHeight = 30;
    const columnGap = 250;
    const rowGap = 38;

    options.forEach((option, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);

        const x = startX + col * columnGap;
        const y = startY + row * rowGap;

        ctx.strokeStyle = battle.selected === i ? "#ffcf77" : "#aaa";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, buttonWidth, buttonHeight);

        ctx.fillStyle = battle.selected === i ? "#ffcf77" : "white";
        ctx.fillText(option, x + 12, y + 20);
    });

    ctx.fillStyle = "#aaa";
    ctx.font = "10px monospace";
    ctx.fillText("ESC = BACK", 470, 355);
}

// =====================================================
// AIM BAR
// =====================================================

function drawAimBar() {
    ctx.fillStyle = "white";
    ctx.font = "13px monospace";
    ctx.fillText("STOP THE MARKER NEAR THE CENTRE!", 130, 205);

    const x = 190;
    const y = 250;
    const width = 260;

    ctx.fillStyle = "#a84e4e";
    ctx.fillRect(x, y, width, 22);

    ctx.fillStyle = "#d7a94c";
    ctx.fillRect(x + 55, y, 150, 22);

    ctx.fillStyle = "#56b879";
    ctx.fillRect(x + 105, y, 50, 22);

    ctx.fillStyle = "white";
    ctx.fillRect(x + battle.aimX - 2, y - 8, 4, 38);

    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText("ENTER TO ATTACK", 235, 310);
}

// =====================================================
// DODGE ARENA
// =====================================================

function drawDodgeArena() {
    const arena = battle.arena;

    ctx.fillStyle = "#201a2c";
    ctx.fillRect(arena.x, arena.y, arena.w, arena.h);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);

    ctx.fillStyle = "#ff5268";
    ctx.beginPath();
    ctx.arc(
        battle.heart.x,
        battle.heart.y,
        battle.heart.size / 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#f4f4f4";

    battle.bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "white";
    ctx.font = "11px monospace";
    ctx.fillText("DODGE THE PROJECTILES!", 220, 350);
}

// =====================================================
// GAME LOOP
// =====================================================

function startLoop() {
    if (loopStarted) return;

    loopStarted = true;
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!gameRunning) {
        loopStarted = false;
        return;
    }

    if (endingStarted) {
        ctx.clearRect(0, 0, W, H);
        drawEnding();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!paused && !gameOver) {
        if (!battleOpen) {
            updatePlayer();
            updateEnemies();
        } else {
            updateBattle();
        }
    }

    updateCamera();
    ctx.clearRect(0, 0, W, H);

    if (!battleOpen) {
        drawMap();
        drawFurniture();
        drawChests();
        drawNPCs();
        drawEnemies();
        drawPlayer();
        drawMiniMap();
        drawInventory();
    } else {
        drawBattle();
    }

    const status = document.getElementById("playerStatus");

    if (status) {
        status.textContent =
            "HP: " + player.hp + " / " + player.maxHp +
            " | Weapon: " +
            (itemInfo[equippedWeapon]?.name || "None");
    }

    if (gameOver) drawGameOver();

    requestAnimationFrame(gameLoop);
}

// =====================================================
// INITIALIZATION
// =====================================================

ctx.imageSmoothingEnabled = false;

resetEnemies();
updateContinueButton();
updateLocation();
