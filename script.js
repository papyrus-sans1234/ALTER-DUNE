// =====================================================
// ALTER DUNE - DEMO 0.9
// THE HUNT BEGINS
// PART 1 OF 2
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
let endingType = "neutral";
let endingPage = 0;
let endingFade = 0;
let prisonerRescued = false;
let royalEndingComplete = false;

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
                "The Hunter is REALLY strong, though.",
                "If the King falls, maybe both kingdoms can finally talk.",
                "People deserve a choice about where they call home."
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
                "Something changed him.",
                "If someone ever freed the prisoners, this kingdom could heal.",
                "A ruler should bring people together, not keep them apart."
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
        exploredRooms,
        prisonerRescued,
        royalEndingComplete
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

        prisonerRescued = Boolean(data.prisonerRescued);
        royalEndingComplete = Boolean(data.royalEndingComplete);

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
    endingType = "neutral";
    endingPage = 0;
    endingFade = 0;
    prisonerRescued = false;
    royalEndingComplete = false;

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
    endingType = "neutral";
    endingPage = 0;

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
// ENDING SYSTEM
// =====================================================

function startEnding(type = "neutral") {
    if (endingStarted) return;

    endingStarted = true;
    endingType = type;
    endingPage = 0;
    endingStartTime = Date.now();
    endingFade = 1;

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

const endingScenes = {
    neutral: [
        {
            title: "THE TREASURE IS YOURS",
            lines: [
                "With the King's defeat, the castle gates finally open.",
                "You take the royal treasure and walk away.",
                "The kingdom is left to find its own future."
            ]
        },
        {
            title: "THE END",
            lines: [
                "You escaped with the treasure.",
                "Your adventure ends here."
            ]
        }
    ],

    royal: [
        {
            title: "A FRIEND REUNITED",
            lines: [
                "You return to the dungeon and free the prisoner.",
                "Together, you leave the castle behind.",
                "For the first time, the road ahead feels hopeful."
            ]
        },
        {
            title: "A MESSAGE OF PEACE",
            lines: [
                "Back in your homeland, you gather the people.",
                "You tell them the King has fallen and the treasure",
                "has been recovered. Then you make an invitation:"
            ]
        },
        {
            title: "TWO KINGDOMS, ONE HOME",
            lines: [
                "\"There is room for all of us. Come with us.\"",
                "People from the neighbouring kingdom accept.",
                "Families, workers and travellers join your journey.",
                "No one is forced to leave; the choice is theirs."
            ]
        },
        {
            title: "A NEW CROWN",
            lines: [
                "The rescued prisoner stands beside you.",
                "The two kingdoms begin rebuilding together.",
                "You are chosen to lead—not through fear,",
                "but because you brought people together."
            ]
        },
        {
            title: "THE ROYAL ENDING",
            lines: [
                "Two kingdoms. One future.",
                "A new chapter begins."
            ]
        }
    ]
};

function advanceEnding() {
    if (!endingStarted) return;

    const scenes = endingScenes[endingType] || endingScenes.neutral;

    if (endingPage < scenes.length - 1) {
        endingPage++;
        endingStartTime = Date.now();
        endingFade = 1;
    } else {
        endingStarted = false;
        endingPage = 0;

        if (endingType === "royal") {
            royalEndingComplete = true;
            saveGame();
        }

        gameRunning = false;
        gameScreen.classList.add("hidden");
        menuScreen.classList.remove("hidden");

        playMusic("menu");
        updateContinueButton();
    }
}

function drawEnding() {
    const scenes = endingScenes[endingType] || endingScenes.neutral;
    const scene = scenes[endingPage] || scenes[scenes.length - 1];

    const elapsed = Date.now() - endingStartTime;
    endingFade = Math.max(0, 1 - elapsed / 420);

    ctx.fillStyle = "#080812";
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(
        W / 2, H / 2, 15,
        W / 2, H / 2, 310
    );

    glow.addColorStop(
        0,
        endingType === "royal"
            ? "rgba(225,174,78,0.16)"
            : "rgba(120,130,170,0.12)"
    );

    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();

    ctx.globalAlpha = 1 - endingFade;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = endingType === "royal"
        ? "#f4d58a"
        : "#e7e7ee";

    ctx.font = "bold 25px monospace";
    ctx.fillText(scene.title, W / 2, 105);

    ctx.fillStyle = "#f0edf5";
    ctx.font = "14px monospace";

    scene.lines.forEach((line, index) => {
        ctx.fillText(line, W / 2, 165 + index * 27);
    });

    ctx.fillStyle = "#a9a3b5";
    ctx.font = "11px monospace";

    ctx.fillText(
        "PRESS ENTER / Z / E TO CONTINUE",
        W / 2,
        H - 45
    );

    ctx.fillText(
        (endingPage + 1) + " / " + scenes.length,
        W / 2,
        H - 22
    );

    ctx.restore();
}

// =====================================================
// INPUT
// =====================================================

document.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (endingStarted) {
        if (
            ["enter", "z", "e", " "].includes(key) &&
            !e.repeat
        ) {
            e.preventDefault();
            advanceEnding();
        }

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
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " "
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
        if (key === "e" || key === "enter") {
            closeDialogue();
        }

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
            startEnding(prisonerRescued ? "royal" : "neutral");
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
          if (
    npc.name === "PRISONER" &&
    currentRoom === "dungeon" &&
    !prisonerRescued &&
    king &&
    king.hp <= 0
) {
    prisonerRescued = true;

    npc.lines = [
        "Thank you for coming back for me.",
        "I knew someone would eventually stand up to the King.",
        "Let's get out of this castle together."
    ];

    npc.line = 1;
    saveGame();

    showDialogue(
        "PRISONER",
        "You came back! The King is defeated, and I'm finally free. Let's leave this place together."
    );

    return;
}
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
            if (visited.has(door.target)) continue;

            visited.add(door.target);
            queue.push([
                door.target,
                [...path, door.target]
            ]);
        }
    }

    return [];
}
// =====================================================
// ENEMY ROUTING — CONTINUED
// =====================================================

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

    // Part 1 stores room names in the route.
    const nextRoom = route[0];
    const door = rooms[enemy.room].doors.find(
        item => item.target === nextRoom
    );

    if (!door) return;

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
    turn: 0,
    action: "",
    attackPower: 0,
    enemyTurnStarted: false,
    enemyTurnFinished: false,
    attackAnimation: 0,
    dodgeTime: 0,
    spared: false,
    mercyAvailable: false,
    defendBonus: 0,
    lastDamage: 0
};

// =====================================================
// BATTLE MUSIC
// =====================================================

function updateBattleMusic(enemy) {
    if (!enemy) return;

    if (enemy.id === "hunter") {
        playMusic("hunter");
    } else if (enemy.id === "king") {
        playMusic("king");
    } else {
        playMusic("fight");
    }
}

// =====================================================
// START BATTLE
// =====================================================

function startBattle(enemy) {
    if (!enemy || enemy.defeated || enemy.hp <= 0 || battleOpen) return;

    battleOpen = true;
    inventoryOpen = false;
    dialogueOpen = false;

    battle.enemy = enemy;
    battle.phase = "menu";
    battle.menu = "main";
    battle.selected = 0;
    battle.message = enemy.name + " blocks your path!";
    battle.turn = 0;
    battle.action = "";
    battle.bullets = [];
    battle.bulletTimer = 0;
    battle.attackAnimation = 0;
    battle.dodgeTime = 0;
    battle.spared = false;
    battle.mercyAvailable = false;
    battle.defendBonus = 0;
    battle.enemyTurnStarted = false;
    battle.enemyTurnFinished = false;
    battle.lastDamage = 0;

    battle.heart.x = W / 2;
    battle.heart.y = 250;

    keys = {};

    updateBattleMusic(enemy);
}

// =====================================================
// BATTLE MENU
// =====================================================

const battleMenus = {
    main: ["FIGHT", "ACT", "ITEM", "MERCY"],
    act: ["CHECK", "TALK", "JOKE", "BACK"],
    item: [],
    mercy: ["SPARE", "FLEE", "BACK"]
};

function getBattleMenu() {
    if (battle.menu === "item") {
        return inventory
            .filter(item => itemInfo[item.id])
            .map(item => itemInfo[item.id].name)
            .concat(["BACK"]);
    }

    return battleMenus[battle.menu] || battleMenus.main;
}

function changeBattleSelection(direction) {
    const menu = getBattleMenu();

    if (!menu.length) {
        battle.selected = 0;
        return;
    }

    battle.selected =
        (battle.selected + direction + menu.length) % menu.length;
}

function handleBattleInput(key) {
    if (!battleOpen) return;

    if (battle.phase === "dodge") {
        return;
    }

    if (battle.phase === "attack") {
        return;
    }

    if (
        key === "arrowup" || key === "w"
    ) {
        changeBattleSelection(-1);
        return;
    }

    if (
        key === "arrowdown" || key === "s"
    ) {
        changeBattleSelection(1);
        return;
    }

    if (
        key === "arrowleft" || key === "a"
    ) {
        changeBattleSelection(-1);
        return;
    }

    if (
        key === "arrowright" || key === "d"
    ) {
        changeBattleSelection(1);
        return;
    }

    if (key === "escape") {
        if (battle.menu !== "main") {
            battle.menu = "main";
            battle.selected = 0;
        }

        return;
    }

    if (key === "enter" || key === " ") {
        selectBattleOption();
    }
}

// =====================================================
// BATTLE OPTION SELECTION
// =====================================================

function selectBattleOption() {
    const menu = getBattleMenu();
    const option = menu[battle.selected];

    if (!option) return;

    if (battle.menu === "main") {
        if (option === "FIGHT") {
            beginPlayerAttack();
        } else if (option === "ACT") {
            battle.menu = "act";
            battle.selected = 0;
        } else if (option === "ITEM") {
            battle.menu = "item";
            battle.selected = 0;
        } else if (option === "MERCY") {
            battle.menu = "mercy";
            battle.selected = 0;
        }

        return;
    }

    if (battle.menu === "act") {
        if (option === "BACK") {
            battle.menu = "main";
            battle.selected = 0;
        } else {
            performAct(option);
        }

        return;
    }

    if (battle.menu === "item") {
        if (option === "BACK") {
            battle.menu = "main";
            battle.selected = 0;
        } else {
            const item = inventory.find(
                i => itemInfo[i.id]?.name === option
            );

            if (item) useBattleItem(item.id);
        }

        return;
    }

    if (battle.menu === "mercy") {
        if (option === "BACK") {
            battle.menu = "main";
            battle.selected = 0;
        } else if (option === "SPARE") {
            attemptSpare();
        } else if (option === "FLEE") {
            attemptFlee();
        }
    }
}

// =====================================================
// ACT SYSTEM
// =====================================================

function performAct(action) {
    const enemy = battle.enemy;
    if (!enemy) return;

    let message = "";

    if (action === "CHECK") {
        message =
            enemy.name + " — HP " +
            enemy.hp + "/" + enemy.maxHp +
            ". " + getEnemyDescription(enemy);
    }

    if (action === "TALK") {
        enemy.actScore += 1;

        message = getEnemyTalk(enemy);

        if (enemy.actScore >= 2) {
            battle.mercyAvailable = true;
        }
    }

    if (action === "JOKE") {
        enemy.actScore += 1;
        message = getEnemyJoke(enemy);

        if (enemy.actScore >= 2) {
            battle.mercyAvailable = true;
        }
    }

    battle.message = message;
    beginEnemyTurn();
}

function getEnemyDescription(enemy) {
    const descriptions = {
        guard1: "A nervous castle guard. He looks tired.",
        guard2: "A determined guard protecting the armory.",
        dungeon_guard: "A strict guard who watches the prisoners.",
        entrance_guard: "A guard who takes his job very seriously.",
        hall_guard: "A guard who is not sure what is happening.",
        barracks_guard: "A guard who wants to impress the others.",
        library_guard: "A quiet guard who dislikes loud noises.",
        armory_guard: "A guard who knows every weapon in the room.",
        garden_guard: "A guard who secretly likes the flowers.",
        royal_guard: "A loyal royal guard.",
        exit_guard: "A guard who has been ordered to stop everyone.",
        hunter: "The King's most dangerous fighter.",
        king: "The ruler of the neighbouring kingdom."
    };

    return descriptions[enemy.id] || "An unknown opponent.";
}

function getEnemyTalk(enemy) {
    const dialogue = {
        guard1: "The guard tells you he only wants to go home.",
        guard2: "The guard explains that he is protecting his family.",
        dungeon_guard: "The guard admits that the dungeon is unfair.",
        entrance_guard: "The guard says he never wanted to fight.",
        hall_guard: "The guard is confused about his orders.",
        barracks_guard: "The guard says he is afraid of the Hunter.",
        library_guard: "The guard asks you to keep your voice down.",
        armory_guard: "The guard remembers when the kingdom was peaceful.",
        garden_guard: "The guard talks about the garden.",
        royal_guard: "The royal guard says he cannot abandon the King.",
        exit_guard: "The guard says he hopes the conflict ends soon.",
        hunter: "The Hunter refuses to answer.",
        king: "The King tells you that power is the only way to rule."
    };

    return dialogue[enemy.id] || "Your opponent remains silent.";
}

function getEnemyJoke(enemy) {
    const dialogue = {
        guard1: "You tell the guard a joke. He almost laughs.",
        guard2: "You make a terrible pun. The guard looks confused.",
        dungeon_guard: "You make a joke about keys. The guard sighs.",
        entrance_guard: "The guard tries not to smile.",
        hall_guard: "The guard laughs despite himself.",
        barracks_guard: "The guard chuckles.",
        library_guard: "The librarian shushes you from somewhere.",
        armory_guard: "The guard smiles at your joke.",
        garden_guard: "The guard laughs. A flower seems to sway.",
        royal_guard: "The guard looks away to hide a smile.",
        exit_guard: "The guard lets out a small laugh.",
        hunter: "The Hunter does not find it funny.",
        king: "The King is not amused."
    };

    return dialogue[enemy.id] || "Your joke receives no reaction.";
}

// =====================================================
// ITEM IN BATTLE
// =====================================================

function useBattleItem(id) {
    const info = itemInfo[id];

    if (!info || info.type !== "healing") {
        battle.message = "That item cannot be used here.";
        return;
    }

    if (player.hp >= player.maxHp) {
        battle.message = "Your HP is already full!";
        return;
    }

    const before = player.hp;

    if (info.fullHeal) {
        player.hp = player.maxHp;
    } else {
        player.hp = Math.min(player.maxHp, player.hp + info.heal);
    }

    removeItem(id);

    battle.message =
        "You used " + info.name + ". Recovered " +
        (player.hp - before) + " HP.";

    beginEnemyTurn();
}

// =====================================================
// MERCY
// =====================================================

function attemptSpare() {
    const enemy = battle.enemy;
    if (!enemy) return;

    if (enemy.id === "hunter" || enemy.id === "king") {
        battle.message = enemy.name + " cannot be spared yet.";
        return;
    }

    if (!battle.mercyAvailable && enemy.actScore < 2) {
        battle.message = enemy.name + " is not ready to listen.";
        return;
    }

    enemy.spared = true;
    enemy.defeated = true;
    enemy.active = false;
    enemy.hp = 0;

    battle.message = enemy.name + " decided not to fight anymore.";

    finishBattle(true);
}

function attemptFlee() {
    const enemy = battle.enemy;
    if (!enemy) return;

    if (enemy.id === "hunter" || enemy.id === "king") {
        battle.message = "There is no escape from this battle!";
        beginEnemyTurn();
        return;
    }

    enemy.fleeGrace = 120;
    enemy.alerted = false;

    battle.message = "You escaped from the battle!";
    finishBattle(false);
}

// =====================================================
// PLAYER ATTACK
// =====================================================

function beginPlayerAttack() {
    const weapon = itemInfo[equippedWeapon];

    battle.phase = "attack";
    battle.attackAnimation = 0;
    battle.attackPower = weapon?.power || 3;
    battle.message = "Press ENTER when the marker is near the centre!";
    battle.aimX = 80;
    battle.aimDirection = 1;
    battle.aimSpeed = 5;
}

function updatePlayerAttack() {
    if (battle.phase !== "attack") return;

    battle.attackAnimation++;

    battle.aimX += battle.aimDirection * battle.aimSpeed;

    if (battle.aimX >= 440) {
        battle.aimX = 440;
        battle.aimDirection = -1;
    }

    if (battle.aimX <= 80) {
        battle.aimX = 80;
        battle.aimDirection = 1;
    }
}

function confirmPlayerAttack() {
    if (battle.phase !== "attack") return;

    const accuracy = Math.max(
        0,
        1 - Math.abs(battle.aimX - 260) / 180
    );

    const damage = Math.max(
        1,
        Math.round(battle.attackPower * (0.5 + accuracy * 1.5))
    );

    const enemy = battle.enemy;

    enemy.hp = Math.max(0, enemy.hp - damage);

    battle.message =
        "You dealt " + damage + " damage!";

    battle.phase = "message";
    battle.lastDamage = damage;

    if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.defeated = true;
        enemy.active = false;

        setTimeout(() => {
            if (!battleOpen) return;

            handleEnemyDefeat(enemy);
        }, 900);

        return;
    }

    setTimeout(() => {
        if (!battleOpen) return;
        beginEnemyTurn();
    }, 650);
}

// =====================================================
// ENEMY DEFEAT EVENTS
// =====================================================

function handleEnemyDefeat(enemy) {
    if (!enemy) return;

    enemy.hp = 0;
    enemy.defeated = true;
    enemy.active = false;

    if (enemy.id === "king") {
        addItem("royal_treasure");

        battle.message =
            "The King has been defeated! You recovered the Royal Treasure.";

        finishBattle(false);

        setTimeout(() => {
            if (!gameRunning) return;

            showDialogue(
                "NARRATOR",
                "The King has fallen. The castle is finally quiet. You should check the dungeon."
            );
        }, 400);

        return;
    }

    if (enemy.id === "hunter") {
        battle.message =
            "THE HUNTER HAS BEEN DEFEATED!";

        finishBattle(false);

        setTimeout(() => {
            wakeSleepyGuardIfReady();

            showDialogue(
                "NARRATOR",
                "The Hunter has fallen. But the castle still has secrets..."
            );
        }, 400);

        return;
    }

    if (enemy.id === "sleepy_guard") {
        battle.message =
            "The awakened guard has been defeated!";

        finishBattle(false);
        unlockHunterIfReady();
        return;
    }

    finishBattle(false);
    unlockHunterIfReady();
}

// =====================================================
// ENEMY TURN
// =====================================================

function beginEnemyTurn() {
    if (!battleOpen || !battle.enemy) return;

    battle.phase = "dodge";
    battle.turn++;

    battle.bullets = [];
    battle.bulletTimer = 0;
    battle.dodgeTime = 0;

    battle.heart.x = W / 2;
    battle.heart.y = 250;

    battle.enemyTurnStarted = true;
    battle.enemyTurnFinished = false;

    battle.message =
        battle.enemy.name + " is preparing an attack!";

    playEnemyAttackSound();
}

function playEnemyAttackSound() {
    // Placeholder for optional battle sound effects.
}

// =====================================================
// PROJECTILE GENERATION
// =====================================================

function spawnProjectile(x, y, vx, vy, size = 8) {
    battle.bullets.push({
        x,
        y,
        vx,
        vy,
        size,
        active: true
    });
}

function createEnemyAttack(enemy) {
    const pattern = battle.turn % 4;

    if (enemy.id === "hunter") {
        if (pattern === 0) {
            for (let i = 0; i < 7; i++) {
                spawnProjectile(
                    80 + i * 55,
                    70,
                    0,
                    2.3 + i * 0.08,
                    9
                );
            }
        } else if (pattern === 1) {
            for (let i = 0; i < 5; i++) {
                spawnProjectile(
                    70,
                    120 + i * 40,
                    2.7,
                    0,
                    9
                );
            }
        } else if (pattern === 2) {
            for (let i = 0; i < 6; i++) {
                spawnProjectile(
                    100 + i * 48,
                    70,
                    0,
                    2.8,
                    10
                );
            }
        } else {
            for (let i = 0; i < 8; i++) {
                spawnProjectile(
                    70 + i * 45,
                    100,
                    0,
                    2.2,
                    8
                );
            }
        }

        return;
    }

    if (enemy.id === "king") {
        if (pattern === 0) {
            for (let i = 0; i < 8; i++) {
                spawnProjectile(
                    65 + i * 44,
                    75,
                    0,
                    2.8,
                    10
                );
            }
        } else if (pattern === 1) {
            for (let i = 0; i < 7; i++) {
                spawnProjectile(
                    70,
                    90 + i * 35,
                    2.9,
                    0,
                    10
                );
            }
        } else if (pattern === 2) {
            for (let i = 0; i < 9; i++) {
                spawnProjectile(
                    55 + i * 40,
                    80,
                    0,
                    3,
                    10
                );
            }
        } else {
            for (let i = 0; i < 8; i++) {
                spawnProjectile(
                    80 + i * 42,
                    80,
                    0,
                    2.5,
                    11
                );
            }
        }

        return;
    }

    const count = enemy.difficulty >= 2 ? 6 : 4;

    for (let i = 0; i < count; i++) {
        spawnProjectile(
            100 + i * 55,
            85,
            0,
            2 + enemy.difficulty * 0.3,
            8
        );
    }
}

// =====================================================
// UPDATE BATTLE
// =====================================================

function updateBattle() {
    if (!battleOpen) return;

    if (battle.phase === "attack") {
        updatePlayerAttack();
        return;
    }

    if (battle.phase !== "dodge") return;

    battle.dodgeTime++;

    if (battle.bulletTimer === 0) {
        createEnemyAttack(battle.enemy);
    }

    battle.bulletTimer++;

    const heart = battle.heart;
    const speed = 3.5;

    let dx = 0;
    let dy = 0;

    if (keys["arrowleft"] || keys["a"]) dx--;
    if (keys["arrowright"] || keys["d"]) dx++;
    if (keys["arrowup"] || keys["w"]) dy--;
    if (keys["arrowdown"] || keys["s"]) dy++;

    if (dx && dy) {
        dx *= 0.707;
        dy *= 0.707;
    }

    heart.x += dx * speed;
    heart.y += dy * speed;

    heart.x = Math.max(55, Math.min(W - 55, heart.x));
    heart.y = Math.max(90, Math.min(340, heart.y));

    battle.bullets.forEach(bullet => {
        if (!bullet.active) return;

        bullet.x += bullet.vx;
        bullet.y += bullet.vy;

        const dist = Math.hypot(
            heart.x - bullet.x,
            heart.y - bullet.y
        );

        if (dist < bullet.size + heart.size) {
            bullet.active = false;

            const damage = Math.max(
                1,
                battle.enemy.damage - battle.defendBonus
            );

            player.hp = Math.max(0, player.hp - damage);
            battle.lastDamage = damage;

            if (player.hp <= 0) {
                triggerGameOver();
            }
        }

        if (
            bullet.x < -30 ||
            bullet.x > W + 30 ||
            bullet.y < -30 ||
            bullet.y > H + 30
        ) {
            bullet.active = false;
        }
    });

    battle.bullets = battle.bullets.filter(
        bullet => bullet.active
    );

    if (battle.bulletTimer >= battle.bulletDuration) {
        battle.phase = "menu";
        battle.menu = "main";
        battle.selected = 0;
        battle.bullets = [];
        battle.defendBonus = 0;
        battle.enemyTurnFinished = true;

        battle.message =
            "Your turn! Choose your next action.";
    }
}

// =====================================================
// DRAW NPCS
// =====================================================

function drawNPCs() {

    if (typeof npcs === "undefined") return;

    const roomNPCs = npcs[currentRoom] || [];

    roomNPCs.forEach(npc => {

        if (npc.hidden) return;

        const x = npc.x;
        const y = npc.y;

        // NPC BODY
        ctx.fillStyle = npc.color || "#54b88c";
        ctx.fillRect(x - 9, y - 5, 18, 20);

        // NPC HEAD
        ctx.fillStyle = "#f2c6a0";
        ctx.fillRect(x - 7, y - 19, 14, 14);

        // HAIR
        ctx.fillStyle = npc.hairColor || "#49352b";
        ctx.fillRect(x - 7, y - 21, 14, 5);

        // EYES
        ctx.fillStyle = "#222";
        ctx.fillRect(x - 4, y - 14, 2, 2);
        ctx.fillRect(x + 2, y - 14, 2, 2);

        // NPC NAME
        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, x, y - 27);

        // INTERACTION INDICATOR
        if (
            Math.hypot(player.x - x, player.y - y) < 45
        ) {
            ctx.fillStyle = "#ffe66d";
            ctx.font = "12px monospace";
            ctx.fillText("!", x, y - 34);
        }

    });

}

// =====================================================
// BATTLE DRAWING
// =====================================================

function drawBattle() {
    const enemy = battle.enemy;
    if (!enemy) return;

    ctx.fillStyle = "#100d18";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#29213a";
    ctx.fillRect(0, 0, W, 85);

    ctx.fillStyle = "#f2d28c";
    ctx.font = "bold 19px monospace";
    ctx.textAlign = "center";
    ctx.fillText(enemy.name, W / 2, 32);

    ctx.fillStyle = "#ddd";
    ctx.font = "12px monospace";
    ctx.fillText(
        "HP: " + enemy.hp + " / " + enemy.maxHp,
        W / 2,
        58
    );

    ctx.fillStyle = "#7c303b";
    ctx.fillRect(120, 68, 280, 7);

    ctx.fillStyle = "#df5964";
    ctx.fillRect(
        120,
        68,
        280 * (enemy.hp / enemy.maxHp),
        7
    );

    if (battle.phase === "attack") {
        drawAttackBar();
    } else if (battle.phase === "dodge") {
        drawDodgeArea();
    } else {
        drawBattleMenu();
    }

    ctx.textAlign = "left";
}

function drawBattleMenu() {
    ctx.fillStyle = "#1b1725";
    ctx.fillRect(25, 110, W - 50, 230);

    ctx.strokeStyle = "#e5c16e";
    ctx.lineWidth = 2;
    ctx.strokeRect(25, 110, W - 50, 230);

    ctx.fillStyle = "#fff";
    ctx.font = "13px monospace";
    ctx.textAlign = "center";

    ctx.fillText(battle.message, W / 2, 145);

    const menu = getBattleMenu();

    ctx.textAlign = "left";
    ctx.font = "15px monospace";

    menu.forEach((option, index) => {
        const x = 75;
        const y = 190 + index * 34;

        ctx.fillStyle = index === battle.selected
            ? "#f2d28c"
            : "#eee";

        ctx.fillText(
            (index === battle.selected ? "▶ " : "  ") + option,
            x,
            y
        );
    });

    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText(
        "ARROWS = SELECT     ENTER = CONFIRM",
        75,
        320
    );
}

function drawAttackBar() {
    ctx.fillStyle = "#201a2b";
    ctx.fillRect(25, 130, W - 50, 170);

    ctx.strokeStyle = "#e5c16e";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 210, 380, 22);

    ctx.fillStyle = "#3b8c6e";
    ctx.fillRect(245, 210, 30, 22);

    ctx.fillStyle = "#f0d28a";
    ctx.fillRect(battle.aimX, 205, 5, 32);

    ctx.fillStyle = "white";
    ctx.font = "12px monospace";
    ctx.textAlign = "center";

    ctx.fillText(
        "PRESS ENTER NEAR THE CENTRE!",
        W / 2,
        175
    );

    ctx.fillText(
        battle.message,
        W / 2,
        275
    );
}

function drawDodgeArea() {
    ctx.fillStyle = "#201a2b";
    ctx.fillRect(25, 105, W - 50, 250);

    ctx.strokeStyle = "#e5c16e";
    ctx.lineWidth = 3;
    ctx.strokeRect(55, 135, W - 110, 205);

    ctx.fillStyle = "#f5e4e6";

    battle.bullets.forEach(bullet => {
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

    ctx.fillStyle = "#ff536c";
    ctx.beginPath();
    ctx.moveTo(battle.heart.x, battle.heart.y - 10);
    ctx.lineTo(battle.heart.x - 9, battle.heart.y + 7);
    ctx.lineTo(battle.heart.x + 9, battle.heart.y + 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DODGE THE PROJECTILES!", W / 2, 375);
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
