var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
io.eio.pingTimeout = 60000; // 1 minute
io.eio.pingInterval = 5000;  // 5 seconds

var players = {};
var colors = [];
var map = '';

var playersFinished = [];

const validColor = (color) => {
    for (let c of colors) {
        if (Math.abs(color - c) < 750000) {
            return false;
        }
    }
    return true;
}

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    // get a valid color, then add it to the array of colors
    let c = Math.random() * 0xffffff;
    while (!validColor(c)) {
        c = Math.random() * 0xffffff;
    }
    colors.push(c)

    // need to share this variable w/ game.js, but this is starting position
    const STARTING_X = 683;
    const STARTING_Y = 2912;

    // create a new player and add it to our players object
    players[socket.id] = {
        username: '',
        x: STARTING_X,
        y: STARTING_Y,
        flipX: true,
        anim: 'idle',
        playerId: socket.id,
        tint: c,
    };

    // send the players object to the new player
    socket.emit('currentPlayers', players);

    if (map != '') {
        socket.emit('newMapReceived', map); // update with new map if it's not the default
    }

    socket.broadcast.emit('newPlayer', players[socket.id]); // update all other players of the new player

    socket.on('disconnect', function () {
        console.log('user disconnected');
        delete players[socket.id]; // remove this player from our players object
        playersFinished = playersFinished.filter(id => id !== socket.id)
        io.emit('disconnect', socket.id); // emit a message to all players to remove this player
    });

    socket.on('updateUsername', (username) => {
        players[socket.id].username = username;
        socket.broadcast.emit('playerUsernameUpdate', players[socket.id]);
    })

    // when a player moves, update the player data
    socket.on('updateMovement', (movementData) => {
        players[socket.id].time = movementData.time;
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].flipX = movementData.flipX;
        players[socket.id].inAction = movementData.inAction;
        players[socket.id].currentAnim = movementData.currentAnim;

        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    // when the map is regenerated, update the map data
    socket.on('generateNewMap', (mapData) => {
        map = mapData;
        socket.broadcast.emit('newMapReceived', map);
    });

    // Game State
    socket.on('startGame', () => {
        // Clear finished players
        while (playersFinished.length > 0) {
            playersFinished.pop();
        }

        // Reset all players
        for (let sId in players) {
            players[sId].x = STARTING_X;
            players[sId].y = STARTING_Y;
        }

        io.sockets.emit('teleportAllPlayers', { x: STARTING_X, y: STARTING_Y });
        socket.broadcast.emit('receiveGameStart'); // update all other players of this
    })

    socket.on('playerFinish', (playerId) => {
        playersFinished.push(playerId);
        console.log(playersFinished);
        socket.broadcast.emit('updateFinished', players[playerId].username);
        console.log( Object.keys(players).length);
        if (playersFinished.length == Object.keys(players).length) {
            console.log('GAME ENDED!')
            io.sockets.emit('receiveGameEnd');
        }
    })
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
    console.log(`Listening on ${server.address().port}`);
});