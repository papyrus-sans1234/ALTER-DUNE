// =====================================================
// ALTER DUNE - DEMO 0.9
// THE HUNT BEGINS
// PART 1 OF 3
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
const prisonerFollower = { x: 150, y: 180, active: false };
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
let requestedMusic = "menu";
let musicRequestId = 0;

Object.values(musicTracks).forEach(track => {
    track.loop = true;
    track.volume = 0;
    track.preload = "auto";

    track.addEventListener("error", () => {
        console.error("Could not load soundtrack:", track.src);
    });
});

function playMusic(name) {
    const nextMusic = musicTracks[name];

    if (!nextMusic) {
        console.error("Unknown music track:", name);
        return;
    }

    requestedMusic = name;

    // Wait for the first player interaction.
    if (!musicUnlocked) return;

    if (currentMusic === nextMusic && !nextMusic.paused) {
        return;
    }

    clearInterval(musicFadeTimer);

    const requestId = ++musicRequestId;
    const oldMusic = currentMusic;

    nextMusic.volume = 0;

    nextMusic.play()
        .then(() => {
            // Ignore outdated music requests.
            if (requestId !== musicRequestId) {
                nextMusic.pause();
                return;
            }

            currentMusic = nextMusic;

            let volume = 0;

            musicFadeTimer = setInterval(() => {
                if (requestId !== musicRequestId) {
                    clearInterval(musicFadeTimer);
                    return;
                }

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
            console.error("Music playback failed:", error);
        });
}

function stopMusic() {
    clearInterval(musicFadeTimer);
    musicRequestId++;

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
        playMusic(requestedMusic);
    }
}, { once: true });
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
        prisonerFollower.active = prisonerRescued;
        if (prisonerRescued) {
            const savedPrisoner = (npcs.dungeon || []).find(
                npc => npc.name === "PRISONER"
            );
            if (savedPrisoner) savedPrisoner.hidden = true;
            prisonerFollower.x = player.x - 30;
            prisonerFollower.y = player.y + 12;
        }
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
    prisonerFollower.active = false;
    prisonerFollower.x = 150;
    prisonerFollower.y = 180;
    royalEndingComplete = false;

    checkpoint = {
        room: "entrance",
        x: 320,
        y: 320,
        hp: 30
    };

    resetEnemies();

    Object.values(npcs).forEach(list => {
        list.forEach(npc => {
            npc.line = 0;
            npc.hidden = false;
        });
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

        list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "8px";
    list.style.maxHeight = "220px";
    list.style.overflowY = "auto";

    if (inventory.length === 0) {
        list.textContent = "Your inventory is empty.";
    }

    inventory.forEach(item => {
        const info = itemInfo[item.id];
        if (!info) return;

        const button = document.createElement("button");

        button.textContent =
            info.name + " x" + item.qty +
            (item.id === equippedWeapon ? " [EQUIPPED]" : "");

        button.style.width = "100%";
        button.style.padding = "12px";
        button.style.fontSize = "12px";

        button.onclick = () => {
            closeMobilePause();

            if (info.type === "weapon") {
                equipWeapon(item.id);
                return;
            }

            if (info.type === "healing") {
                useItem(item.id);
            } else if (info.type === "key") {
                battle.message = "This key might unlock something.";
            } else if (info.type === "treasure") {
                battle.message = "A valuable treasure.";
            } else {
                battle.message = "You examined " + info.name + ".";
            }

            showDialogue("ITEM", battle.message);
        };

        list.appendChild(button);
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

    // RESET KING'S HP AFTER PLAYER DEFEAT
    if (king && !king.defeated) {
        king.hp = king.maxHp;
        king.active = true;
    }

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
            if (battle.phase === "attack") {
                confirmPlayerAttack();
            } else {
                handleBattleInput("enter");
            }
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

        if (
            battle.phase === "attack" &&
            (key === "enter" || key === " ")
        ) {
            if (!e.repeat) {
                confirmPlayerAttack();
            }
            return;
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

    if (prisonerRescued && prisonerFollower.active) {
        prisonerFollower.x = player.x - 30;
        prisonerFollower.y = player.y + 12;
    }

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
                prisonerFollower.active = true;
                prisonerFollower.x = npc.x;
                prisonerFollower.y = npc.y;
                npc.hidden = true;

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

    if (battle.phase === "dodge") return;
    if (battle.phase === "attack") return;

    if (battle.menu === "item") {
        if (key === "arrowleft" || key === "a") {
            moveBattleItemGrid(-1, 0);
            return;
        }

        if (key === "arrowright" || key === "d") {
            moveBattleItemGrid(1, 0);
            return;
        }

        if (key === "arrowup" || key === "w") {
            moveBattleItemGrid(0, -1);
            return;
        }

        if (key === "arrowdown" || key === "s") {
            moveBattleItemGrid(0, 1);
            return;
        }
    } else {
        if (
            key === "arrowup" || key === "w" ||
            key === "arrowleft" || key === "a"
        ) {
            changeBattleSelection(-1);
            return;
        }

        if (
            key === "arrowdown" || key === "s" ||
            key === "arrowright" || key === "d"
        ) {
            changeBattleSelection(1);
            return;
        }
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

function moveBattleItemGrid(horizontal, vertical) {
    const menu = getBattleMenu();

    if (!menu.length) return;

    let selected = battle.selected;

    if (horizontal !== 0) {
        const next = selected + horizontal;

        if (
            next >= 0 &&
            next < menu.length &&
            Math.floor(next / 2) === Math.floor(selected / 2)
        ) {
            selected = next;
        }
    }

    if (vertical !== 0) {
        const next = selected + vertical * 2;

        if (next >= 0 && next < menu.length) {
            selected = next;
        }
    }

    battle.selected = selected;
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
                 battle.message = "The enemy is not ready to be spared.";
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

function finishBattle(victory = false, spared = false) {
    const enemy = battle.enemy;

    if (!enemy) {
        battleOpen = false;
        battle.enemy = null;
        return;
    }

    if (enemy.hp <= 0) {
        victory = true;
        enemy.hp = 0;
    }

    if (victory || spared) {
        enemy.active = false;
        enemy.defeated = true;
    } else {
        enemy.fleeGrace = 120;
        enemy.alerted = false;
    }

    battleOpen = false;
    battle.enemy = null;
    battle.phase = "menu";
    battle.menu = "main";
    battle.selected = 0;
    battle.bullets = [];
    battle.bulletTimer = 0;
    battle.enemyTurnStarted = false;
    battle.enemyTurnFinished = false;

    keys = {};

    playMusic("exploration");

    unlockHunterIfReady();
    wakeSleepyGuardIfReady();

    saveGame();

    if (!victory && !spared) {
        showDialogue(
            "NARRATOR",
            "You escaped. The enemy is still nearby!"
        );
    }
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
        battle.message = "THE HUNTER HAS BEEN DEFEATED!";

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
        battle.message = "The awakened guard has been defeated!";

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
        const rage = enemy.hp / enemy.maxHp <= 0.5 ? 1.3 : 1;

        // PATTERN 0: ROYAL BARRAGE
        if (pattern === 0) {
            for (let i = 0; i < 9; i++) {
                if (i === 3 || i === 6) continue;

                spawnProjectile(
                    55 + i * 42,
                    75,
                    0,
                    3.5 * rage,
                    10
                );
            }
        }

        // PATTERN 1: CROWN WALL
        else if (pattern === 1) {
            for (let i = 0; i < 8; i++) {
                spawnProjectile(
                    70,
                    90 + i * 32,
                    3.5 * rage,
                    0,
                    10
                );

                spawnProjectile(
                    W - 70,
                    90 + i * 32,
                    -3.5 * rage,
                    0,
                    10
                );
            }
        }

        // PATTERN 2: KING'S JUDGMENT
        else if (pattern === 2) {
            const angle = Math.atan2(
                battle.heart.y - 80,
                battle.heart.x - W / 2
            );

            for (let i = -2; i <= 2; i++) {
                const shotAngle = angle + i * 0.22;

                spawnProjectile(
                    W / 2,
                    80,
                    Math.cos(shotAngle) * 4 * rage,
                    Math.sin(shotAngle) * 4 * rage,
                    10
                );
            }
        }

        // PATTERN 3: FINAL DECREE
        else {
            for (let i = 0; i < 10; i++) {
                spawnProjectile(
                    45 + i * 38,
                    75,
                    0,
                    3.8 * rage,
                    11
                );
            }

            for (let i = 0; i < 5; i++) {
                spawnProjectile(
                    80 + i * 80,
                    90,
                    0,
                    4.5 * rage,
                    8
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

        ctx.fillStyle = npc.color || "#54b88c";
        ctx.fillRect(x - 9, y - 5, 18, 20);

        ctx.fillStyle = "#f2c6a0";
        ctx.fillRect(x - 7, y - 19, 14, 14);

        ctx.fillStyle = npc.hairColor || "#49352b";
        ctx.fillRect(x - 7, y - 21, 14, 5);

        ctx.fillStyle = "#222";
        ctx.fillRect(x - 4, y - 14, 2, 2);
        ctx.fillRect(x + 2, y - 14, 2, 2);

        ctx.fillStyle = "white";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(npc.name, x, y - 27);

        if (Math.hypot(player.x - x, player.y - y) < 45) {
            ctx.fillStyle = "#ffe66d";
            ctx.font = "12px monospace";
            ctx.fillText("!", x, y - 34);
        }
    });

    if (prisonerRescued && prisonerFollower.active) {
        drawCharacter(
            prisonerFollower.x,
            prisonerFollower.y,
            "#8caaa9",
            "PRISONER"
        );
    }
}

function updatePrisonerFollower() {
    if (!prisonerRescued || !prisonerFollower.active) return;

    const targetX = player.x - 28;
    const targetY = player.y + 12;

    const dx = targetX - prisonerFollower.x;
    const dy = targetY - prisonerFollower.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 5) {
        const speed = 2.5;

        prisonerFollower.x += (dx / distance) * speed;
        prisonerFollower.y += (dy / distance) * speed;
    }
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

    if (battle.menu === "item") {
        const pageStart =
            Math.floor(battle.selected / 10) * 10;

        const pageEnd = Math.min(
            pageStart + 10,
            menu.length
        );

        ctx.font = "13px monospace";

        for (let i = pageStart; i < pageEnd; i++) {
            const localIndex = i - pageStart;

            const column = localIndex % 2;
            const row = Math.floor(localIndex / 2);

            const x = column === 0 ? 55 : 325;
            const y = 190 + row * 25;

            ctx.fillStyle = i === battle.selected
                ? "#f2d28c"
                : "#eee";

            ctx.fillText(
                (i === battle.selected ? "▶ " : "  ") + menu[i],
                x,
                y
            );
        }

        ctx.fillStyle = "#aaa";
        ctx.font = "10px monospace";

        ctx.fillText(
            "ARROWS = SELECT   ENTER = USE",
            75,
            320
        );

        if (menu.length > 10) {
            ctx.fillText(
                "PAGE " +
                (Math.floor(battle.selected / 10) + 1) +
                " / " + Math.ceil(menu.length / 10),
                450,
                320
            );
        }

    } else {
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

    ctx.fillText(battle.message, W / 2, 275);
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

    // RED HEART SOUL
    ctx.fillStyle = "#ff0000";
    ctx.beginPath();

    const hx = battle.heart.x;
    const hy = battle.heart.y;

    ctx.moveTo(hx, hy + 9);

    ctx.bezierCurveTo(
        hx - 18, hy - 2,
        hx - 13, hy - 17,
        hx, hy - 8
    );

    ctx.bezierCurveTo(
        hx + 13, hy - 17,
        hx + 18, hy - 2,
        hx, hy + 9
    );

    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("DODGE THE PROJECTILES!", W / 2, 375);
}

// =====================================================
// RESTORED WORLD MOVEMENT AND RENDERING
// =====================================================

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

function updateCamera() {
    const mapWidth = getMap()[0].length * TILE;
    const mapHeight = getMap().length * TILE;

    camera.x = Math.max(
        0,
        Math.min(player.x - W / 2, mapWidth - W)
    );

    camera.y = Math.max(
        0,
        Math.min(player.y - H / 2, mapHeight - H)
    );
}

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

            const colors = [
                "#c44d4d",
                "#5686ba",
                "#d5b75b",
                "#7aaf78"
            ];

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

function drawChests() {
    (chests[currentRoom] || []).forEach((chest, index) => {
        const x = chest.x * TILE - camera.x;
        const y = chest.y * TILE - camera.y;

        const opened = openedChests.includes(
            currentRoom + "_" + index
        );

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

function drawCharacter(x, y, color, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    ctx.fillStyle = color;
    ctx.fillRect(sx - 10, sy - 4, 20, 22);

    ctx.fillStyle = "#e8b68d";
    ctx.fillRect(sx - 8, sy - 16, 16, 12);

    ctx.fillStyle = "#211b27";
    ctx.fillRect(sx - 9, sy - 19, 18, 5);

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

function drawGuardCharacter(x, y, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    ctx.fillStyle = "#393b48";
    ctx.fillRect(sx - 8, sy + 11, 6, 9);
    ctx.fillRect(sx + 2, sy + 11, 6, 9);

    ctx.fillStyle = "#29232a";
    ctx.fillRect(sx - 9, sy + 17, 8, 4);
    ctx.fillRect(sx + 1, sy + 17, 8, 4);

    ctx.fillStyle = "#727d91";
    ctx.fillRect(sx - 11, sy - 5, 22, 19);

    ctx.fillStyle = "#c4cfda";
    ctx.fillRect(sx - 8, sy - 4, 16, 13);

    ctx.fillStyle = "#eef2f5";
    ctx.fillRect(sx - 5, sy - 3, 3, 9);

    ctx.fillStyle = "#d8aa48";
    ctx.fillRect(sx - 10, sy + 8, 20, 3);

    ctx.fillStyle = "#aab5c5";
    ctx.fillRect(sx - 14, sy - 6, 6, 8);
    ctx.fillRect(sx + 8, sy - 6, 6, 8);

    ctx.fillStyle = "#b98567";
    ctx.fillRect(sx - 4, sy - 10, 8, 6);

    ctx.fillStyle = "#68758c";
    ctx.fillRect(sx - 9, sy - 21, 18, 12);

    ctx.fillStyle = "#bfcbd9";
    ctx.fillRect(sx - 7, sy - 20, 14, 5);

    ctx.fillStyle = "#242c3c";
    ctx.fillRect(sx - 7, sy - 13, 14, 3);

    ctx.fillStyle = "#9d3e49";
    ctx.fillRect(sx - 2, sy - 26, 4, 6);

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

function drawHunterCharacter(x, y, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    ctx.fillStyle = "#173f61";
    ctx.fillRect(sx - 9, sy + 10, 7, 11);
    ctx.fillRect(sx + 2, sy + 10, 7, 11);

    ctx.fillStyle = "#d2a33e";
    ctx.fillRect(sx - 10, sy + 18, 9, 4);
    ctx.fillRect(sx + 1, sy + 18, 9, 4);

    ctx.fillStyle = "#155b91";
    ctx.fillRect(sx - 12, sy - 6, 24, 19);

    ctx.fillStyle = "#2788bc";
    ctx.fillRect(sx - 8, sy - 5, 16, 14);

    ctx.fillStyle = "#f3c64e";
    ctx.fillRect(sx - 2, sy - 4, 4, 12);
    ctx.fillRect(sx - 8, sy + 2, 16, 3);

    ctx.fillStyle = "#e2b541";
    ctx.fillRect(sx - 16, sy - 8, 7, 9);
    ctx.fillRect(sx + 9, sy - 8, 7, 9);

    ctx.fillStyle = "#b8d5d8";
    ctx.fillRect(sx - 4, sy - 11, 8, 6);

    ctx.fillStyle = "#a9d6d6";
    ctx.fillRect(sx - 8, sy - 21, 16, 13);

    ctx.fillStyle = "#bd303d";
    ctx.fillRect(sx - 9, sy - 24, 18, 6);
    ctx.fillRect(sx - 5, sy - 29, 12, 6);
    ctx.fillRect(sx + 3, sy - 33, 9, 5);

    ctx.fillStyle = "#18243b";
    ctx.fillRect(sx - 5, sy - 15, 3, 3);
    ctx.fillRect(sx + 3, sy - 15, 3, 3);

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

function drawKingCharacter(x, y, label) {
    const sx = x - camera.x;
    const sy = y - camera.y;

    ctx.fillStyle = "#54234e";
    ctx.fillRect(sx - 15, sy - 4, 30, 25);

    ctx.fillStyle = "#8d2946";
    ctx.fillRect(sx - 9, sy - 4, 18, 24);

    ctx.fillStyle = "#eac052";
    ctx.fillRect(sx - 13, sy - 3, 3, 23);
    ctx.fillRect(sx + 10, sy - 3, 3, 23);
    ctx.fillRect(sx - 4, sy + 3, 8, 3);

    ctx.fillStyle = "#f2ce62";
    ctx.fillRect(sx - 10, sy - 8, 20, 6);

    ctx.fillStyle = "#e8b68d";
    ctx.fillRect(sx - 9, sy - 21, 18, 14);

    ctx.fillStyle = "#ddd2c0";
    ctx.fillRect(sx - 7, sy - 11, 14, 7);
    ctx.fillRect(sx - 5, sy - 4, 10, 3);

    ctx.fillStyle = "#211b27";
    ctx.fillRect(sx - 5, sy - 16, 3, 2);
    ctx.fillRect(sx + 3, sy - 16, 3, 2);

    ctx.fillStyle = "#e8bd48";
    ctx.fillRect(sx - 11, sy - 25, 22, 5);
    ctx.fillRect(sx - 10, sy - 30, 5, 6);
    ctx.fillRect(sx - 2, sy - 33, 5, 9);
    ctx.fillRect(sx + 6, sy - 30, 5, 6);

    ctx.fillStyle = "#c33b55";
    ctx.fillRect(sx - 2, sy - 25, 5, 3);

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

function drawRoyalTreasureChest() {
    if (currentRoom !== "royal" || !king) return;

    const x = 320 - camera.x;
    const y = 66 - camera.y;

    const glow = ctx.createRadialGradient(
        x, y + 13, 8,
        x, y + 13, 82
    );

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
        if (
            !exploredRooms.includes(a) &&
            !exploredRooms.includes(b)
        ) return;

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
            updatePrisonerFollower();
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
