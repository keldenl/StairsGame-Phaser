// 1366x768
let GAME_WIDTH = 1366; // this.window.innerWidth;
let GAME_HEIGHT = 768; // this.window.innerHeight;
GAME_HEIGHT = GAME_HEIGHT * 2;

let UNIT_BLOCK = 32;

var config = {
    type: Phaser.AUTO,
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
    dom: {
        createContainer: true
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var SPRITE_WIDTH = 32;

function preload() {
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
}

let platforms;
let player;

let cursors;
let keyC;

let score = 0;
let heightLevel = 0;
const PLAYER_START_HEIGHT = GAME_HEIGHT - 128 - UNIT_BLOCK;

const createPlayerAnims = self => {
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

const addPlayer = (self) => {
    createPlayerAnims(self);

    // Player
    player = self.physics.add.sprite(GAME_WIDTH / 2, PLAYER_START_HEIGHT, 'dude').setOrigin(0.5, 0.5);
    player.setBounce(0.15);
    player.setCollideWorldBounds(true);
}

const addOtherPlayers = (self, playerInfo) => {
    createPlayerAnims(self);

    const otherPlayer = self.physics.add.sprite(GAME_WIDTH / 2, PLAYER_START_HEIGHT, 'star').setOrigin(0.5, 0.5);
    otherPlayer.playerId = playerInfo.playerId;
    console.log(otherPlayer)
    self.otherPlayers.add(otherPlayer);
}

function create() {
    // Set up Backdrop
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setScale(GAME_WIDTH / 800, GAME_HEIGHT / 600);

    // Set up Platforms
    platforms = this.physics.add.staticGroup();
    platforms.create(GAME_WIDTH / 2, GAME_HEIGHT - UNIT_BLOCK, 'ground').setScale(GAME_WIDTH / 400, 6).refreshBody();
    var startingHeight = GAME_HEIGHT - (UNIT_BLOCK * 6);

    const BLOCK_HEIGHT = UNIT_BLOCK * 2;
    const BLOCK_WIDTH = UNIT_BLOCK * 4;

    var lastX = 400;
    let newX = 400;
    let newScale = 1;

    let saveLevel = '';
    const loadLevel = '293,0.7596483420591831k497,1.4865215508098057k656,1.0056958327761887k546,0.6315670136813858k356,0.9632222361988958k551,1.2621491555546303k346,1.2808498705357336k549,1.3226474229876188k423,0.5855101461520695k296,1.1525791516020578k177,1.0436290252632787k294,1.4708382310399626k128,1.456403620857412k322,1.0829972695177925k128,1.229207047397372k288,0.5687526891992616k134,1.3869072993028089k331,1.327228537386511k542,0.7928619626444102k718,1.0917478318466807k545,1.4547928932249239k';
    let loadArray = loadLevel.split('k');
    console.log(loadArray);
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

        console.log(`#${i + 1} - [${newX}, ${newScale}]`)
        saveLevel += `${newX},${newScale}k`

        lastX = newX;
    }
    // Reload save file
    console.log(saveLevel)

    // Set up stars
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });

    stars.children.iterate(child => child.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4)));
    this.physics.add.collider(stars, platforms);

    cursors = this.input.keyboard.createCursorKeys();
    keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.anims.create({
        key: 'idle',
        // frames: [{ key: 'dude', frame: 4 }],
        frames: this.anims.generateFrameNumbers('dude-idle', { start: 0, end: 3 }),
        frameRate: 5
    })

    // SOCKET SETUP
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.physics.add.collider(this.otherPlayers, platforms)

    this.socket.on('currentPlayers', function (players) {
        console.log(players)
        Object.keys(players).forEach(function (id) {
            console.log(id)
            if (players[id].playerId === self.socket.id) {
                // addPlayer(self, players[id]);
                console.log('add me')
            } else {
                console.log('add other')
                // const otherPlayer = this.physics.add.sprite(GAME_WIDTH / 2, PLAYER_START_HEIGHT, 'dude').setOrigin(0.5, 0.5);
                // otherPlayer.playerId = playerInfo.playerId;
                // this.otherPlayers.add(otherPlayer);
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function (playerInfo) {
        console.log('add new player')
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('disconnect', function (playerId) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) {
            if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
            }
        });
    });

    // Add player
    addPlayer(self);

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, stars, (player, star) => {
        setTimeout(() => { // Account for animation delay
            let xDiff = Math.abs(player.body.x - star.body.x);
            let yDiff = Math.abs(player.body.y - star.body.y);
            if (inAction && xDiff < 25 && yDiff < 45) {
                // star.disableBody(true, true);
                star.setVelocityX(40)
                score++;
                scoreText.setText(`score: ${score}`);
            }
        }, 500);
    });

    console.log(player.y)
    console.log(GAME_HEIGHT - 128 - 32)

    // UI
    scoreText = this.add.text(350, 200, `Level: ${heightLevel}`, { fontSize: '16px', fill: '#000' }).setScrollFactor(0);

    // Camera
    this.cameras.main.setViewport(0, 0, GAME_WIDTH, GAME_HEIGHT / 2);
    this.cameras.main.setBackgroundColor('#fff');
    this.cameras.main.setZoom(2);
    this.cameras.main.startFollow(player);
}

var CONTROLLER_ENABLED = false;

var WALK_SPEED;
var RUN_MULTIPLIER;
var JUMP_POWER;
var JUMP_SPEED_LOSS;
var DOUBLE_JUMP_ENABLED = true;
var jumping = false;
var doubleJumping = false;
var inAction = false;

function update() {
    WALK_SPEED = 250;
    RUN_MULTIPLIER = 1.5;
    JUMP_POWER = DOUBLE_JUMP_ENABLED ? 375 : 450;
    JUMP_SPEED_LOSS = 50;

    // emit player movement
    var x = player.x;
    var y = player.y;
    if (player.oldPosition && (x !== player.oldPosition.x || y !== player.oldPosition.y)) {
        console.log('update position!')
        this.socket.emit('playerMovement', { x: player.x, y: player.y });
    }

    // save old position data
    player.oldPosition = {
        x: player.x,
        y: player.y,
    };

    // console.log(player.oldPosition)

    player.on('animationcomplete-attack', () => inAction = false);

    // var pads = this.input.gamepad.gamepads;
    let pad = Phaser.Input.Gamepad.Gamepad;
    let lAxis;
    let R1;
    // var pad = pads[0];
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
            scoreText.setText(`Level: ${heightLevel}`);
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