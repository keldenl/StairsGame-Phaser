console.log(this.window.innerWidth);
console.log();

let GAME_WIDTH = this.window.innerWidth;
let GAME_HEIGHT = this.window.innerHeight;
GAME_HEIGHT = GAME_HEIGHT * 2;

var config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1250 },
            debug: false
        }
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

function create() {
    // Set up Backdrop
    this.add.image(0, 0, 'sky').setOrigin(0, 0).setScale(GAME_WIDTH / 800, GAME_HEIGHT / 600);

    // Set up Platforms
    platforms = this.physics.add.staticGroup();
    platforms.create(GAME_WIDTH / 2, GAME_HEIGHT - 32, 'ground').setScale(GAME_WIDTH / 400, 2).refreshBody();
    var startingHeight = GAME_HEIGHT - 64 - 65;
    var lastX = 400;
    let newX = 400;
    for (var i = 0; i < 22; i++) {
        while(Math.abs(newX - lastX) < 100) {
            let posOrNeg = Math.random() < 0.5 ? -1 : 1;
            newX = lastX + ((Math.floor(Math.random() * 192) + 64) * posOrNeg);
            newX = newX < (64*2) ? (64*2) : newX;
            newX = newX > (GAME_WIDTH - (64*2)) ? (GAME_WIDTH - (64*2)) : newX;
        }


        let newScale = (Math.random() * 1) + 0.5;
        platforms.create(newX, startingHeight - (i * 65), 'platform').setScale(newScale, 1).refreshBody(); // 65 distance
        
        console.log(`#${i+1} - [${newX}, ${newScale}]`)


        // console.log(`#${i+1} - ${newX - lastX}`)
        // console.log(Math.abs(newX - lastX) < 100)
        // if (Math.abs(newX - lastX) < 150) {
        //     let diffX = newX - lastX;
        //     diffX = Math.abs(diffX) < 25 ? 100 : diffX;
        //     platforms.create(newX - (diffX * 3), startingHeight - (i * 65), 'platform').setScale(newScale, 1).refreshBody(); // 65 distance
        // }
        lastX = newX;
    }

    // Set up stars
    stars = this.physics.add.group({
        key: 'star',
        repeat: 11,
        setXY: { x: 12, y: 0, stepX: 70 }
    });

    stars.children.iterate(child => child.setBounceY(Phaser.Math.FloatBetween(0.2, 0.4)));
    this.physics.add.collider(stars, platforms);

    // Player
    player = this.physics.add.sprite(0, GAME_HEIGHT - 128, 'dude').setOrigin(0.5, 0.5);
    player.setBounce(0.15);
    player.setCollideWorldBounds(true);

    this.anims.create({
        key: 'idle',
        // frames: [{ key: 'dude', frame: 4 }],
        frames: this.anims.generateFrameNumbers('dude-idle', { start: 0, end: 3 }),
        frameRate: 5
    })

    this.anims.create({
        key: 'walk',
        frames: this.anims.generateFrameNumbers('dude-walk', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    })

    this.anims.create({
        key: 'jump',
        frames: this.anims.generateFrameNumbers('dude-jump', { start: 0, end: 7 }),
        frameRate: 5
    })

    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('dude-run', { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    })

    this.anims.create({
        key: 'attack',
        frames: this.anims.generateFrameNumbers('dude-attack', { start: 0, end: 5 }),
        frameRate: 10
    })

    cursors = this.input.keyboard.createCursorKeys();
    keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);

    this.physics.add.collider(player, platforms);
    this.physics.add.overlap(player, stars, (player, star) => {
        setTimeout(() => { // Account for animation delay
            let xDiff = Math.abs(player.body.x - star.body.x);
            let yDiff = Math.abs(player.body.y - star.body.y);
            if (inAction && xDiff < 25 && yDiff < 45) {
                star.disableBody(true, true);
                score++;
                scoreText.setText(`score: ${score}`);
            }
        }, 500);
    });

    // UI
    scoreText = this.add.text(150, 100, `score: ${score}`, { fontSize: '32px', fill: '#000' }).setScrollFactor(0);
    
    // Camera
    this.cameras.main.setSize(GAME_WIDTH, GAME_HEIGHT / 2);
    // this.cameras.main.setOrigin(0,0);
    this.cameras.main.setZoom(1);
    this.cameras.main.startFollow(player);
    console.log(GAME_WIDTH * 0.2);
    console.log(GAME_WIDTH * 0.8);
    // this.cameras.main.deadzone = new Phaser.Geom.Rectangle(GAME_WIDTH * 0.1, GAME_HEIGHT * 0.1, GAME_WIDTH * 0.8, GAME_HEIGHT * 0.8);
}

var WALK_SPEED;
var RUN_MULTIPLIER;
var JUMP_POWER;
var JUMP_SPEED_LOSS;
var jumping = false;
var inAction = false;

function update() {
    WALK_SPEED = 250;
    RUN_MULTIPLIER = 1.5;
    JUMP_POWER = 450;
    JUMP_SPEED_LOSS = 50;

    player.on('animationcomplete-attack', () => inAction = false);

    if (player.body.touching.down) {
        jumping = false;
        if (cursors.left.isDown) {
            player.flipX = true;
            if (cursors.shift.isDown) {
                player.setVelocityX(WALK_SPEED * RUN_MULTIPLIER * -1);
                player.anims.play('run', true);
            } else {
                player.setVelocityX(WALK_SPEED * -1);
                player.anims.play('walk', true);
            }
        } else if (cursors.right.isDown) {
            player.flipX = false;
            if (cursors.shift.isDown) {
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

        if ((cursors.up.isDown || cursors.space.isDown) && player.body.touching.down) {
            let currVelX = player.body.velocity.x;
            let velMulti = currVelX > 0 ? -1 : 1;

            player.setVelocityY(JUMP_POWER * -1);
            if (currVelX != 0) { player.setVelocityX(currVelX + (JUMP_SPEED_LOSS * velMulti)); }

            player.anims.play('jump', true);
            player.flipX = currVelX > 0 || !player.flipX ? false : true;
            jumping = true;
        }
    } else if (!jumping) {
        player.anims.play('idle', true);
    }

    // Actions not bounded by being on the ground
    if (keyC.isDown && !(cursors.left.isDown || cursors.right.isDown)) {
        player.anims.play('attack', true);
        inAction = true;
    }
}