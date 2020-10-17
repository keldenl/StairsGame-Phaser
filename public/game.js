// Game constants
let GAME_WIDTH = 1366;
let GAME_HEIGHT = 768;
GAME_HEIGHT = GAME_HEIGHT * 4;
console.log(GAME_HEIGHT)


// Units
let UNIT_BLOCK = 32;
var SPRITE_WIDTH = 128;
const BLOCK_HEIGHT = 142 / 2;
const BLOCK_WIDTH = UNIT_BLOCK * 4;

const defaultLevelLoad = '279,1.429631057330303k128,1.4712247943087209k359,1.1383154817725396k559,0.9474566411783156k356,0.8746282753717414k531,0.7708042629893437k380,1.441797320465066k163,0.8489133989373676k311,0.8129905040793921k128,1.1500767277428878k359,0.8316530000093791k546,1.2034011446068729k675,1.3066462848342573k553,0.7959866923718679k791,1.02277579302855k966,1.3370390300681283k787,1.1842304289477505k1017,0.7656444689333228k796,0.7889342657681733k661,1.6066851466019763k446,1.6964965428269665k644,0.7688917285125929k431,1.1408319461296066k662,0.9169891029256751k855,0.9453627326549818k730,1.4688353414061062k951,0.9234054432272525k793,0.760073208954537k607,1.5477095046175684k383,1.5468201884374777k266,1.0777920996435173k396,1.2173962155579954k582,1.2901514519502562k354,1.569983269542072k510,0.7734382106872069k287,1.207263915926446k480,0.8520339829815458k628,1.2220489741154543k473,0.9826918095514907k351,1.0408944685116388k'

// More Config
let heightLevel = 0;
const PLAYER_START_HEIGHT = GAME_HEIGHT - 128 - UNIT_BLOCK;

// Game states
let gamePaused = true;
let cameraOnSelf = true;

// Networking
let SOCKET_UPDATE_DELAY = 100; // How often we should listen to other player's movements in ms
let selfSocketId;
let nameTags = {};

// Objects
let cursors;
let keyC;

// Game objects
let platforms;
let player;

// Player Constants
let RUN_MULTIPLIER = 1.5;
let JUMP_SPEED_LOSS = 50;
var DOUBLE_JUMP_ENABLED = false;
const DEFAULT_WALK_SPEED = 325;
const DEFAULT_JUMP_POWER = 450;
const DEFAULT_DOUBLE_JUMP_POWER = 400;

let WALK_SPEED = DEFAULT_WALK_SPEED;
let JUMP_POWER = DOUBLE_JUMP_ENABLED ? DEFAULT_DOUBLE_JUMP_POWER : DEFAULT_JUMP_POWER;
let PLAYER_ENERGY = 0;


// Player States
var jumping = false;
var doubleJumping = false;
var inAction = false;

// Xbox Controller Constants
var CONTROLLER_ENABLED = false;
let pad = Phaser.Input.Gamepad.Gamepad;
let lAxis;
let R1;


// Functions
// Set up animations
const createPlayerAnims = self => {
    self.anims.create({
        key: 'idle',
        // frames: [{ key: 'dude', frame: 4 }],
        frames: self.anims.generateFrameNumbers('dude-idle', { start: 0, end: 3 }),
        frameRate: 5,
        repeat: -1
    })

    self.anims.create({
        key: 'walk',
        frames: self.anims.generateFrameNumbers('dude-walk', { start: 0, end: 3 }),
        frameRate: 7,
        repeat: -1
    })

    self.anims.create({
        key: 'jump',
        frames: self.anims.generateFrameNumbers('dude-walk', { start: 0, end: 3 }), // 7
        frameRate: 5
    })

    self.anims.create({
        key: 'run',
        frames: self.anims.generateFrameNumbers('dude-walk', { start: 0, end: 3 }),
        frameRate: 9,
        repeat: -1
    })

    self.anims.create({
        key: 'attack',
        frames: self.anims.generateFrameNumbers('dude-attack', { start: 0, end: 5 }),
        frameRate: 10
    })
}

// Players setup
const addPlayer = (self) => {
    player = self.physics.add.sprite(GAME_WIDTH / 2, PLAYER_START_HEIGHT, 'dude').setOrigin(0.5, 0.5).setScale(0.25);
    player.setBounce(0.15);
    player.setCollideWorldBounds(true);

    nameTags['self'] = self.add.text(GAME_WIDTH / 2, PLAYER_START_HEIGHT, '',
        { fontSize: '24px', fill: '#f44336' }).setScale(0.5).setOrigin(0.5, 1);
}

const setUpPlayer = (player, playerInfo) => {
    const { playerId, x, y, tint } = playerInfo;
    selfSocketId = playerId;
    player.x = x;
    player.y = y;
    player.tint = tint;
}

const addOtherPlayers = (self, playerInfo) => {
    const { x, y, playerId, anim, tint, username } = playerInfo;

    const otherPlayer = self.physics.add.sprite(x, y, 'dude').setOrigin(0.5, 0.5).setInteractive().setScale(0.25);
    otherPlayer.anims.play(anim);
    otherPlayer.playerId = playerId;
    otherPlayer.tint = tint;
    otherPlayer.on('pointerdown', () => {
        self.cameras.main.startFollow(otherPlayer);
        cameraOnSelf = false;
    });
    self.otherPlayers.add(otherPlayer);
    nameTags[playerId] = self.add.text(x, y - 17, username,
        { fontSize: '24px', fill: '#fff' }).setScale(0.5).setOrigin(0.5, 1);
}

// Load map
const loadNewLevel = (platforms, loadSavedLevel = '') => {
    platforms.clear(true);

    let loadArray = [];
    let saveLevel = '';
    var startingHeight = GAME_HEIGHT - (UNIT_BLOCK * 6);
    var lastX = 400;
    let newX = 400;
    let newScale = 1;

    if (loadSavedLevel.length > 0) {
        loadArray = loadSavedLevel.split('k');
    }

    for (var i = 0; i < 40; i++) {
        if (loadArray.length > 0) {
            const currLoad = loadArray[i].split(',');
            newX = currLoad[0];
            newScale = currLoad[1];
        } else {
            while (Math.abs(newX - lastX) < 100) {
                let posOrNeg = Math.random() < 0.5 ? -1 : 1;

                // Offset by unit block * 2 (half of block width) just in case it's right above it
                newX = lastX + ((Math.floor(Math.random() * (SPRITE_WIDTH / 4 * 4)) + (SPRITE_WIDTH / 4 * 3.5)) * posOrNeg);
                newX = newX < BLOCK_WIDTH ? BLOCK_WIDTH : newX;
                newX = newX > (GAME_WIDTH - BLOCK_WIDTH) ? (GAME_WIDTH - BLOCK_WIDTH) : newX;
            }

            newScale = (Math.random() * 1) + 0.75;
        }

        platforms.create(newX, startingHeight - (i * BLOCK_HEIGHT) + (BLOCK_HEIGHT / 2), 'platform').setScale(newScale, 1).refreshBody(); // 65 distance
        saveLevel += `${newX},${newScale}k`
        lastX = newX;
    }

    // Reload save file
    return saveLevel;
}

var GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function GameScene() {
        Phaser.Scene.call(this, { key: 'GameScene' });
    },
    preload: function () {
        this.load.image('sky', './assets/sky.png');
        this.load.image('ground', './assets/platform.png');
        this.load.image('platform', './assets/short-platform.png');
        this.load.image('star', './assets/star.png');
        this.load.image('dude', './assets/player/sprite-sm.png');

        // Blue Dude
        this.load.spritesheet('dude-idle', './assets/player/idle-sm.png', { frameWidth: 128, frameHeight: 142 });
        this.load.spritesheet('dude-walk', './assets/player/walk-sm.png', { frameWidth: 128, frameHeight: 142 });
        this.load.spritesheet('dude-jump', './assets/player/dude-jump.png', { frameWidth: 256, frameHeight: 256 });
        this.load.spritesheet('dude-run', './assets/character/blue_dude/run.png', { frameWidth: SPRITE_WIDTH, frameHeight: 32 });
        this.load.spritesheet('dude-attack', './assets/character/blue_dude/attack.png', { frameWidth: SPRITE_WIDTH, frameHeight: 32 });
    },
    create: function () {
        var ourUI = this.scene.get('UIScene');

        // SOCKET SETUP
        var self = this;
        this.socket = io();

        // Set up Backdrop
        this.add.image(0, 0, 'sky').setOrigin(0, 0).setScale(GAME_WIDTH / 800, GAME_HEIGHT / 600);
        const ground = this.physics.add.staticSprite(GAME_WIDTH / 2, GAME_HEIGHT, 'ground').setScale(GAME_WIDTH / 400, 6).refreshBody();


        // Set up Platforms
        platforms = this.physics.add.staticGroup();

        loadNewLevel(platforms, defaultLevelLoad);

        // GameState/UI Listeners
        ourUI.events.on('generateNewMap', () => {
            const newLevelData = loadNewLevel(platforms);
            console.log(newLevelData);
            this.socket.emit('generateNewMap', newLevelData);
        });

        ourUI.events.on('updatePauseState', (paused) => {
            gamePaused = paused;
        });

        ourUI.events.on('updateUsername', (username) => {
            this.socket.emit('updateUsername', username);
            nameTags['self'].text = username;
        });

        ourUI.events.on('startGame', () => {
            console.log('THIS CLIENT started the game')
            const STARTING_X = 683;
            const STARTING_Y = 1376;

            player.x = STARTING_X;
            player.y = STARTING_Y;
            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                otherPlayer.x = STARTING_X;
                otherPlayer.y = STARTING_Y;
            });
            this.socket.emit('startGame');
        });

        // Set up stars
        // stars = this.physics.add.group({
        //     key: 'star',
        //     repeat: 11,
        //     setXY: { x: 12, y: 0, stepX: 70 }
        // });

        // stars.children.iterate(child => child.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4)));
        // this.physics.add.collider(stars, platforms);

        cursors = this.input.keyboard.createCursorKeys();
        keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

        // Add animation and own player
        addPlayer(self);
        createPlayerAnims(self);

        this.physics.add.collider(player, ground);
        this.physics.add.collider(player, platforms);
        // this.physics.add.overlap(player, stars, (player, star) => {
        //     setTimeout(() => { // Account for animation delay
        //         let xDiff = Math.abs(player.body.x - star.body.x);
        //         let yDiff = Math.abs(player.body.y - star.body.y);
        //         if (inAction && xDiff < 25 && yDiff < 45) {
        //             // star.disableBody(true, true);
        //             star.setVelocityX(40)
        //             score++;
        //             scoreText.setText(`score: ${score}`);
        //         }
        //     }, 500);
        // });


        // Camera
        this.cameras.main.setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT / 4);
        this.cameras.main.setZoom(2);
        this.cameras.main.setBackgroundColor('#fff');
        this.cameras.main.startFollow(player);

        // Multiplayer init/loop
        this.otherPlayers = this.physics.add.group();
        this.physics.add.collider(this.otherPlayers, ground)
        this.physics.add.collider(this.otherPlayers, platforms)

        this.socket.on('currentPlayers', (players) => {
            console.log(players);
            Object.keys(players).forEach((id) => {
                console.log(id)
                if (players[id].playerId === self.socket.id) {
                    setUpPlayer(player, players[id]);
                    console.log('add me')
                } else {
                    console.log('add other')
                    addOtherPlayers(self, players[id]);
                }
            });
        });

        this.socket.on('newPlayer', (playerInfo) => {
            console.log('add new player')
            addOtherPlayers(self, playerInfo);
        });

        this.socket.on('playerUsernameUpdate', (playerInfo) => {
            nameTags[playerInfo.playerId].text = playerInfo.username;
        })

        this.socket.on('newMapReceived', (mapInfo) => {
            loadNewLevel(platforms, mapInfo)
        });

        this.socket.on('receiveGameStart', () => {
            this.events.emit('receiveGameStart');
        })

        this.socket.on('disconnect', (playerId) => {
            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (playerId === otherPlayer.playerId) {
                    otherPlayer.destroy();
                    nameTags[playerId].destroy();
                }
            });
        });

        let stopMovementTimer;
        this.socket.on('playerMoved', (playerInfo) => {
            const { playerId, x, y, flipX, inAction, currentAnim } = playerInfo;
            let playerToMove;
            if (playerId == selfSocketId) {
                playerToMove = player;
            }

            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                if (playerId === otherPlayer.playerId) {
                    playerToMove = otherPlayer;
                }
            });

            if (!!playerToMove) {
                self.physics.moveTo(playerToMove, x, y, false, 100);
                self.tweens.add({
                    targets: [nameTags[playerToMove.playerId]],
                    x: x,
                    y: y - 15,
                    duration: 100,
                });

                if (stopMovementTimer) { clearTimeout(stopMovementTimer); }

                stopMovementTimer = setTimeout(() => {
                    if (playerToMove) {
                        // Reset stance
                        playerToMove.body.velocity.x = 0;
                        playerToMove.body.velocity.y = 0;
                        if (!inAction) {
                            playerToMove.anims.play('idle');
                        }

                        // Self correction if needed
                        playerToMove.x = x;
                        playerToMove.y = y;
                    }
                    clearTimeout(this);
                }, 125);

                playerToMove.flipX = flipX;
                if (currentAnim) {
                    playerToMove.anims.play(currentAnim.key);
                }
            }
        });

        this.socket.on('teleportAllPlayers', (location) => {
            const { x, y } = location;
            player.x = x;
            player.y = y;

            self.otherPlayers.getChildren().forEach((otherPlayer) => {
                otherPlayer.x = x;
                otherPlayer.y = y;
            })

            for (let tag in nameTags) {
                nameTags[tag].setPosition(x, y);
            }
        });

        this.socket.on('gameStart', () => {
            console.log('GAME START SOCKET RECEIVED')
            this.events.emit('showGameStartCountdown');
        });


        this.events.on('post_update', () => {
            console.log('hi')
        })
    },
    update: function () {
        if (!gamePaused) {
            let updateTime = false;
            let time = new Date().getTime();
            let flipX = player.flipX;

            // Emit player movement
            // Initial
            if (!player.oldPosition) {
                this.socket.emit('updateMovement', {
                    time: time,
                    x: player.x,
                    y: player.y,
                    flipX: flipX,
                    currentAnim: player.anims.currentAnim,
                });
                updateTime = true;
            }
            else if (time - player.oldPosition.time > SOCKET_UPDATE_DELAY &&
                (player.x !== player.oldPosition.x
                    || player.y !== player.oldPosition.y
                    || flipX !== player.oldPosition.flipX
                    || player.anims.currentAnim !== player.oldPosition.currentAnim)) {

                this.socket.emit('updateMovement', {
                    time: time,
                    x: player.x,
                    y: player.y,
                    flipX: player.flipX,
                    inAction: inAction,
                    currentAnim: player.anims.currentAnim != player.oldPosition.currentAnim ? player.anims.currentAnim : undefined
                });
                updateTime = true;

                // Reset to own camera
                if (!cameraOnSelf) {
                    this.cameras.main.startFollow(player);
                    cameraOnSelf = true;
                }
            }

            // save old position data
            player.oldPosition = {
                time: updateTime ? time : player.oldPosition.time,
                x: player.x,
                y: player.y,
                flipX: flipX,
                inAction: inAction,
                currentAnim: player.anims.currentAnim,
            };

            // move nametag
            nameTags['self'].setPosition(player.body.x + player.body.halfWidth, player.body.y);

            player.on('animationcomplete-attack', () => inAction = false); // no longer in action after punching anim done

            // Controller config
            if (this.input.gamepad.total && !lAxis) {
                if (this.input.gamepad.getPad(0).A && this.input.gamepad.getPad(0).B) {
                    setTimeout(() => { CONTROLLER_ENABLED = true; console.log('Controller connected!!') }, 250);
                }
                if (CONTROLLER_ENABLED) {
                    console.log('update loop')
                    pad = this.input.gamepad.getPad(0);
                    lAxis = pad.axes[0];
                    R1 = pad.buttons[7];
                } else {
                    console.log('Press A and B together to connect controller.');
                }
            }

            if (player.body.touching.down) {
                jumping = false;
                doubleJumping = false;

                // Update height
                const newHeightLevel = Math.round((PLAYER_START_HEIGHT - player.y) / (BLOCK_HEIGHT)) + 1;
                if (newHeightLevel != heightLevel) {
                    heightLevel = newHeightLevel;
                    this.events.emit('updateLevel');
                }

                if (cursors.left.isDown || (lAxis && lAxis.value < -0.5)) {
                    player.flipX = false;
                    if (cursors.shift.isDown || (R1 && R1.value > 0.1)) {
                        player.setVelocityX(WALK_SPEED * RUN_MULTIPLIER * -1);
                        player.anims.play('run', true);
                    } else {
                        player.setVelocityX(WALK_SPEED * -1);
                        player.anims.play('walk', true);
                    }
                } else if (cursors.right.isDown || (lAxis && lAxis.value > 0.5)) {
                    player.flipX = true;
                    if (cursors.shift.isDown || (R1 && R1.value > 0.1)) {
                        player.setVelocityX(WALK_SPEED * RUN_MULTIPLIER);
                        player.anims.play('run', true);
                    } else {
                        player.setVelocityX(WALK_SPEED);
                        player.anims.play('walk', true);
                    }
                } else {
                    player.setVelocityX(0);
                    if (!inAction) {
                        player.anims.play('idle', true);
                    }
                }
            } else if (!jumping && !doubleJumping) {
                player.anims.play('idle', true);
            }

            // Actions not bounded by being on the ground
            if ((cursors.up.isDown || cursors.space.isDown || pad.A) && (player.body.touching.down || (DOUBLE_JUMP_ENABLED && !doubleJumping))) {
                if (cursors.left.isDown || (lAxis && lAxis.value < -0.5)) {
                    player.flipX = false;
                    player.setVelocityX(WALK_SPEED * -1);
                    player.anims.play('walk', true);
                } else if (cursors.right.isDown || (lAxis && lAxis.value > 0.5)) {
                    player.flipX = true;
                    player.setVelocityX(WALK_SPEED);
                    player.anims.play('walk', true);
                }

                let currVelX = player.body.velocity.x;
                let velMulti = currVelX > 0 ? -1 : 1;

                player.setVelocityY(JUMP_POWER * -1);
                if (currVelX != 0) { player.setVelocityX(currVelX + (JUMP_SPEED_LOSS * velMulti)); }

                player.anims.play('jump', true);
                player.flipX = currVelX > 0 || player.flipX ? true : false;
                if (jumping) {
                    doubleJumping = true;
                } else {
                    setTimeout(() => jumping = true, 200)
                }
            }

            if ((keyC.isDown || pad.B) && !(cursors.left.isDown || cursors.right.isDown)) {
                player.anims.play('attack', true);
                inAction = true;
            }
        }
    },
});

// UI
var createButton = (scene, text) => {
    const COLOR_LIGHT = 0x7b5e57;
    return scene.rexUI.add.label({
        width: 40,
        height: 40,
        background: scene.rexUI.add.roundRectangle(0, 0, 0, 0, 20, COLOR_LIGHT),
        text: scene.add.text(0, 0, text, {
            fontSize: 18
        }),
        space: {
            top: 10,
            bottom: 10,
            left: 10,
            right: 10
        },
        name: text
    });
}

const COLOR_PRIMARY = 0x4e342e;
const COLOR_LIGHT = 0x7b5e57;
const COLOR_DARK = 0x260e04;

const GetValue = Phaser.Utils.Objects.GetValue;
const createUsernameDialog = (scene, config) => {
    var username = GetValue(config, 'username', '');
    var title = GetValue(config, 'title', '');
    var x = GetValue(config, 'x', 0);
    var y = GetValue(config, 'y', 0);
    var width = GetValue(config, 'width', undefined);
    var height = GetValue(config, 'height', undefined);

    var background = scene.rexUI.add.roundRectangle(0, 0, 10, 10, 10, COLOR_PRIMARY);
    var titleField = scene.add.text(0, 0, title);

    var userNameField = scene.rexUI.add.label({
        orientation: 'x',
        background: scene.rexUI.add.roundRectangle(0, 0, 10, 10, 10).setStrokeStyle(2, COLOR_LIGHT),
        text: scene.rexUI.add.BBCodeText(0, 0, username, { fixedWidth: 150, fixedHeight: 36, valign: 'center' }),
        space: { top: 5, bottom: 5, left: 5, right: 5 }
    })
        .setInteractive()
        .on('pointerdown', () => {
            console.log('clicked')
            var config = {
                onTextChanged: function (textObject, text) {
                    username = text;
                    textObject.text = text;
                },
            }
            scene.rexUI.edit(userNameField.getElement('text'), config);
        });

    var errorMessageText = scene.add.text(0, 0, '', { fill: '#FF0000' });

    var loginButton = scene.rexUI.add.label({
        orientation: 'x',
        background: scene.rexUI.add.roundRectangle(0, 0, 10, 10, 10, COLOR_LIGHT),
        text: scene.add.text(0, 0, 'Begin playing'),
        space: { top: 8, bottom: 8, left: 8, right: 8 }
    })
        .setInteractive()
        .on('pointerdown', () => {
            let validName = true;
            for (let player in nameTags) {
                if (player != 'self' && nameTags[player].text == username) {
                    validName = false;
                    break;
                }
            }

            if (validName) {
                loginDialog.emit('submitUsername', username);
            } else {
                errorMessageText.text = 'Username taken!'
            }
        });

    var loginDialog = scene.rexUI.add.sizer({
        orientation: 'y',
        x: x,
        y: y,
        width: width,
        height: height,
    })
        .addBackground(background)
        .add(titleField, 0, 'center', { top: 10, bottom: 10, left: 10, right: 10 }, false)
        .add(userNameField, 0, 'left', { bottom: 10, left: 10, right: 10 }, false)
        .add(errorMessageText, 0, 'left', { bottom: 10, left: 10, right: 10 }, false)
        .add(loginButton, 0, 'center', { bottom: 10, left: 10, right: 10 }, false)
        .layout();
    return loginDialog;
};

// Simple UI dark overlay
const createDarkOverlay = (self, alpha) => {
    return self.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, GAME_HEIGHT, '#000').setOrigin(0.5, 0.5).setAlpha(alpha)
}

// Game start UI
const createGameStartCountdown = (self) => {
    self.events.emit('updatePauseState', true);

    const headerTextStyle = {
        fontSize: '82px',
        fill: '#fff',
    }

    const countdownDO = createDarkOverlay(self, 0.75);

    let countdown = 3;
    let countdownLabel = self.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 8, 'Ready?', headerTextStyle).setOrigin(0.5, 0.5);

    let startCountdownInterval = setInterval(() => {
        if (countdown > 0) {
            countdownLabel.text = countdown;
            countdown--;
        } else {
            countdownLabel.text = '';
            self.events.emit('updatePauseState', false);
            countdownDO.destroy();
            clearInterval(startCountdownInterval);
        }
    }, 1000);
}

var UIScene = new Phaser.Class({
    Extends: Phaser.Scene,
    initialize: function UIScene() {
        Phaser.Scene.call(this, { key: 'UIScene', active: true });
    },
    preload: function () {
        this.load.scenePlugin({
            key: 'rexuiplugin',
            url: 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexuiplugin.min.js',
            sceneKey: 'rexUI'
        });

        this.load.plugin('rextexteditplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rextexteditplugin.min.js', true)

    },
    create: function () {
        var ourGame = this.scene.get('GameScene');

        // Create UI
        var levelText = this.add.text(GAME_WIDTH - 15, 35, `Level: ${heightLevel}`, { fontSize: '32px', fill: '#000' }).setOrigin(1, 0.5);
        var energyText = this.add.text(GAME_WIDTH - 15, 75, `Energy: ${PLAYER_ENERGY}`, { fontSize: '24px', fill: '#000' }).setOrigin(1, 0.5);
        var speedText = this.add.text(GAME_WIDTH - 15, 105, `Speed: ${WALK_SPEED - DEFAULT_WALK_SPEED}`, { fontSize: '24px', fill: '#000' }).setOrigin(1, 0.5);;
        var jumpText = this.add.text(GAME_WIDTH - 15, 135, `Jump: ${JUMP_POWER - DEFAULT_JUMP_POWER}`, { fontSize: '24px', fill: '#000' }).setOrigin(1, 0.5);;
        var buttons = this.rexUI.add.buttons({
            x: 160, y: 140,
            orientation: 'y',
            anchor: 'top',
            buttons: [
                createButton(this, 'Generate new map'),
                createButton(this, '+1 Energy'),
                createButton(this, 'Start game'),
                createButton(this, `Level Up SPEED (2 energy)`),
                createButton(this, 'Level Up JUMP (2 energy)'),
            ],
            space: { item: 10 },
            expand: false,
        }).layout();
        //.drawBounds(this.add.graphics(), 0xff0000)
        // console.log(buttons.buttons[0])
        // buttons.buttons[0].name = 'SUP DUDE'

        buttons.on('button.click', (button, index, pointer, event) => {
            switch (index) {
                case 0: {
                    this.events.emit('generateNewMap');
                    break;
                }
                case 1: {
                    PLAYER_ENERGY++;
                    energyText.setText(`Energy: ${PLAYER_ENERGY}`);
                    break;
                }
                case 2: {
                    this.events.emit('startGame');
                    createGameStartCountdown(this);
                    break;
                }
                case 3: {
                    if (PLAYER_ENERGY >= 2) {
                        PLAYER_ENERGY -= 2;
                        WALK_SPEED += 25;
                        speedText.setText(`Speed: ${WALK_SPEED - DEFAULT_WALK_SPEED}`);
                        energyText.setText(`Energy: ${PLAYER_ENERGY}`);
                    }
                    break;
                }
                case 4: {
                    if (PLAYER_ENERGY >= 2) {
                        PLAYER_ENERGY -= 2;
                        JUMP_POWER += 10;
                        jumpText.setText(`Jump: ${JUMP_POWER - DEFAULT_JUMP_POWER}`);
                        energyText.setText(`Energy: ${PLAYER_ENERGY}`);
                    }
                    break;
                }
                default: console.log('something went wrong')
            }
        })

        const initialDO = createDarkOverlay(this, 0.75);
        const usernameDialog = createUsernameDialog(this, {
            x: 400,
            y: 300,
            title: 'Choose a username',
            username: 'Player1',
        })
            .on('submitUsername', (username) => {
                usernameDialog.destroy();
                initialDO.destroy();
                this.events.emit('updateUsername', username);
                this.events.emit('updatePauseState', false);
            })
            .popUp(500);

        // UI Listeners
        ourGame.events.on('updateLevel', () => {
            levelText.setText(`Level: ${heightLevel}`);
        });

        ourGame.events.on('receiveGameStart', () => {
            createGameStartCountdown(this);
        });
    }
});


var config = {
    type: Phaser.AUTO,
    parent: 'gameCanvas',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    input: {
        gamepad: true
    },
    autoRound: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1250 },
            debug: false
        }
    },
    dom: {
        createContainer: true
    },
    scene: [GameScene, UIScene]
};

var game = new Phaser.Game(config);