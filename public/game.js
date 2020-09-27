let GAME_WIDTH = 1366;
let GAME_HEIGHT = 768;
GAME_HEIGHT = GAME_HEIGHT * 2;

let UNIT_BLOCK = 32;
var SPRITE_WIDTH = 32;

let platforms;
let player;

let cursors;
let keyC;

let score = 0;
let heightLevel = 0;
const PLAYER_START_HEIGHT = GAME_HEIGHT - 128 - UNIT_BLOCK;

let cameraOnSelf = true;

// Game environment setup
const BLOCK_HEIGHT = UNIT_BLOCK * 2;
const BLOCK_WIDTH = UNIT_BLOCK * 4;




const defaultLevelLoad = '293,0.7596483420591831k497,1.4865215508098057k656,1.0056958327761887k546,0.6315670136813858k356,0.9632222361988958k551,1.2621491555546303k346,1.2808498705357336k549,1.3226474229876188k423,0.5855101461520695k296,1.1525791516020578k177,1.0436290252632787k294,1.4708382310399626k128,1.456403620857412k322,1.0829972695177925k128,1.229207047397372k288,0.5687526891992616k134,1.3869072993028089k331,1.327228537386511k542,0.7928619626444102k718,1.0917478318466807k545,1.4547928932249239k';

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

    for (var i = 0; i < 21; i++) {
        if (loadArray.length > 0) {
            const currLoad = loadArray[i].split(',');
            newX = currLoad[0];
            newScale = currLoad[1];
        } else {
            while (Math.abs(newX - lastX) < 100) {
                let posOrNeg = Math.random() < 0.5 ? -1 : 1;

                // Offset by unit block * 2 (half of block width) just in case it's right above it
                newX = lastX + ((Math.floor(Math.random() * (UNIT_BLOCK * 6)) + (UNIT_BLOCK * 2)) * posOrNeg);
                newX = newX < BLOCK_WIDTH ? BLOCK_WIDTH : newX;
                newX = newX > (GAME_WIDTH - BLOCK_WIDTH) ? (GAME_WIDTH - BLOCK_WIDTH) : newX;
            }

            newScale = (Math.random() * 1) + 0.5;
        }


        platforms.create(newX, startingHeight - (i * BLOCK_HEIGHT), 'platform').setScale(newScale, 1).refreshBody(); // 65 distance

        // console.log(`#${i + 1} - [${newX}, ${newScale}]`)
        saveLevel += `${newX},${newScale}k`

        lastX = newX;
    }
    // Reload save file
    return saveLevel;
}

// Player Variables
var CONTROLLER_ENABLED = false;
var SOCKET_UPDATE_DELAY = 100;

var WALK_SPEED;
var RUN_MULTIPLIER;
var JUMP_POWER;
var JUMP_SPEED_LOSS;
var DOUBLE_JUMP_ENABLED = true;
var jumping = false;
var doubleJumping = false;
var inAction = false;

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
        frames: self.anims.generateFrameNumbers('dude-walk', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    })

    self.anims.create({
        key: 'jump',
        frames: self.anims.generateFrameNumbers('dude-jump', { start: 0, end: 7 }),
        frameRate: 5
    })

    self.anims.create({
        key: 'run',
        frames: self.anims.generateFrameNumbers('dude-run', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    })

    self.anims.create({
        key: 'attack',
        frames: self.anims.generateFrameNumbers('dude-attack', { start: 0, end: 5 }),
        frameRate: 10
    })
}

// Player setup
const addPlayer = (self) => {
    player = self.physics.add.sprite(GAME_WIDTH / 2, PLAYER_START_HEIGHT, 'dude').setOrigin(0.5, 0.5);
    player.setBounce(0.15);
    player.setCollideWorldBounds(true);
}

const setUpPlayer = (player, playerInfo) => {
    const { x, y, tint } = playerInfo;
    player.x = x;
    player.y = y;
    player.tint = tint;
}

const addOtherPlayers = (self, playerInfo) => {
    const { x, y, playerId, anim, tint } = playerInfo;

    const otherPlayer = self.physics.add.sprite(x, y, 'dude').setOrigin(0.5, 0.5).setInteractive();
    otherPlayer.anims.play(anim);
    otherPlayer.playerId = playerId;
    otherPlayer.tint = tint;
    otherPlayer.on('pointerdown', () => {
        self.cameras.main.startFollow(otherPlayer);
        cameraOnSelf = false;
    });
    self.otherPlayers.add(otherPlayer);
}

// let ground;
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

        // Blue Dude
        this.load.spritesheet('dude-idle', './assets/character/blue_dude/idle.png', { frameWidth: SPRITE_WIDTH, frameHeight: 32 });
        this.load.spritesheet('dude-walk', './assets/character/blue_dude/walk.png', { frameWidth: SPRITE_WIDTH, frameHeight: 32 });
        this.load.spritesheet('dude-jump', './assets/character/blue_dude/jump.png', { frameWidth: SPRITE_WIDTH, frameHeight: 32 });
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
        const ground = this.physics.add.staticSprite(GAME_WIDTH / 2, GAME_HEIGHT - UNIT_BLOCK, 'ground').setScale(GAME_WIDTH / 400, 6).refreshBody();


        // Set up Platforms
        platforms = this.physics.add.staticGroup();

        loadNewLevel(platforms, defaultLevelLoad);

        // UI Listeners
        ourUI.events.on('generateNewMap', () => {
            const newLevelData = loadNewLevel(platforms);
            console.log(newLevelData);
            this.socket.emit('generateNewMap', newLevelData);
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
        this.cameras.main.setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT / 2);
        this.cameras.main.setBackgroundColor('#fff');
        this.cameras.main.setZoom(2);
        this.cameras.main.startFollow(player);

        // Multiplayer init/loop
        this.otherPlayers = this.physics.add.group();
        this.physics.add.collider(this.otherPlayers, ground)
        this.physics.add.collider(this.otherPlayers, platforms)

        this.socket.on('currentPlayers', function (players) {
            console.log(players)
            Object.keys(players).forEach(function (id) {
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

        this.socket.on('newPlayer', function (playerInfo) {
            console.log('add new player')
            addOtherPlayers(self, playerInfo);
        });

        this.socket.on('newMapReceived', (mapInfo) => {
            console.log('new map time!')
            console.log(mapInfo);
            loadNewLevel(platforms, mapInfo)
        });

        this.socket.on('disconnect', function (playerId) {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (playerId === otherPlayer.playerId) {
                    otherPlayer.destroy();
                }
            });
        });

        let stopMovementTimer;

        this.socket.on('playerMoved', function (playerInfo) {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
                if (playerInfo.playerId === otherPlayer.playerId) {
                    self.physics.moveTo(otherPlayer, playerInfo.x, playerInfo.y, false, 100);

                    if (stopMovementTimer) { clearTimeout(stopMovementTimer) }

                    stopMovementTimer = setTimeout(() => {
                        // Reset stance
                        otherPlayer.body.velocity.x = 0;
                        otherPlayer.body.velocity.y = 0;
                        otherPlayer.anims.play('idle');

                        // Self correction if needed
                        otherPlayer.x = playerInfo.x;
                        otherPlayer.y = playerInfo.y;
                        clearTimeout(this);
                    }, 125);


                    otherPlayer.flipX = playerInfo.flipX;
                    if (playerInfo.currentAnim) {
                        if (playerInfo.inAction) {
                            otherPlayer.anims.play('attack');
                        } else {
                            otherPlayer.anims.play(playerInfo.currentAnim.key);
                        }
                    }
                }
            });
        });
    },
    update: function () {
        WALK_SPEED = 250;
        RUN_MULTIPLIER = 1.5;
        JUMP_POWER = DOUBLE_JUMP_ENABLED ? 375 : 450;
        JUMP_SPEED_LOSS = 50;

        // emit player movement
        var x = player.x;
        var y = player.y;
        var flipX = player.flipX;
        var time = new Date().getTime();
        var updateTime = false;

        // Initial
        if (!player.oldPosition) {
            this.socket.emit('playerMovement', {
                time: time,
                x: player.x,
                y: player.y,
                flipX: player.flipX,
                currentAnim: player.anims.currentAnim,
            });
            updateTime = true;
        }
        else if (time - player.oldPosition.time > SOCKET_UPDATE_DELAY && (inAction || x !== player.oldPosition.x || y !== player.oldPosition.y || flipX !== player.oldPosition.flipX)) {
            this.socket.emit('playerMovement', {
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
            flipX: player.flipX,
            inAction: inAction,
            currentAnim: player.anims.currentAnim,
        };

        // console.log(time - player.oldPosition.time)
        // console.log(player.anims.currentAnim)

        player.on('animationcomplete-attack', () => inAction = false);

        // var pads = this.input.gamepad.gamepads;
        let pad = Phaser.Input.Gamepad.Gamepad;
        let lAxis;
        let R1;
        // var pad = pads[0];
        // Controller config
        if (this.input.gamepad.total) {
            if (this.input.gamepad.getPad(0).A && this.input.gamepad.getPad(0).B) {
                setTimeout(() => { CONTROLLER_ENABLED = true; console.log('Controller connected!!') }, 250);
            }
            if (CONTROLLER_ENABLED) {
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
            const newHeightLevel = Math.round((PLAYER_START_HEIGHT - player.y) / (UNIT_BLOCK * 2));
            if (newHeightLevel != heightLevel) {
                heightLevel = newHeightLevel;
                this.events.emit('updateLevel');
            }

            if (cursors.left.isDown || (lAxis && lAxis.value < -0.5)) {
                player.flipX = true;
                if (cursors.shift.isDown || (R1 && R1.value > 0.1)) {
                    player.setVelocityX(WALK_SPEED * RUN_MULTIPLIER * -1);
                    player.anims.play('run', true);
                } else {
                    player.setVelocityX(WALK_SPEED * -1);
                    player.anims.play('walk', true);
                }
            } else if (cursors.right.isDown || (lAxis && lAxis.value > 0.5)) {
                player.flipX = false;
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
                player.flipX = true;
                player.setVelocityX(WALK_SPEED * -1);
                player.anims.play('walk', true);
            } else if (cursors.right.isDown || (lAxis && lAxis.value > 0.5)) {
                player.flipX = false;
                player.setVelocityX(WALK_SPEED);
                player.anims.play('walk', true);
            }

            let currVelX = player.body.velocity.x;
            let velMulti = currVelX > 0 ? -1 : 1;

            player.setVelocityY(JUMP_POWER * -1);
            if (currVelX != 0) { player.setVelocityX(currVelX + (JUMP_SPEED_LOSS * velMulti)); }

            player.anims.play('jump', true);
            player.flipX = currVelX > 0 || !player.flipX ? false : true;
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
            left: 10,
            right: 10,
        },
        // align: 'left',
        // anchor: 'left',
        name: text
    });
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
    },
    create: function () {
        var ourGame = this.scene.get('GameScene');

        // Create UI
        var levelText = this.add.text(15, 15, `Level: ${heightLevel}`, { fontSize: '32px', fill: '#000' });
        var buttons = this.rexUI.add.buttons({
            x: 110, y: 80,
            orientation: 'y',
            buttons: [
                createButton(this, 'Generate new map'),
            ],
        }).layout();
        //.drawBounds(this.add.graphics(), 0xff0000)

        buttons.on('button.click', (button, index, pointer, event) => {
            switch (index) {
                case 0: {
                    this.events.emit('generateNewMap');
                    break;
                }
                default: console.log('something went wrong')
            }
        })


        // UI Listeners
        ourGame.events.on('updateLevel', () => {
            levelText.setText(`Level: ${heightLevel}`);
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
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1250 },
            debug: false
        }
    },
    scene: [GameScene, UIScene]
};

var game = new Phaser.Game(config);