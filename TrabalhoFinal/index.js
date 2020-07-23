import express from 'express';
import http from 'http';
import createGame from './public/game.js';
import socketio from 'socket.io';

const app = express();
const server = http.createServer(app);
const sockets = socketio(server);

app.use(express.static('public'));

const game = createGame();
game.start();

game.subscribe((command) => {
    sockets.emit(command.type, command);
});

sockets.on('connection', (socket) => {
    const playerId = socket.id;
    console.log(`> Player connected: ${playerId}`);

    socket.on('join-player', (command) => {
        console.log(`> Player joined: ${command.name} (${playerId})`);

        game.addPlayer({ 
            playerId,
            name: command.name,
            color: command.color
        });
    
        socket.emit('setup', game.state);
    });

    socket.on('move-player', (command) => {
        command.playerId = playerId;
        command.type = 'move-player';
        
        game.movePlayer(command);
    });

    socket.on('disconnect', () => {
        console.log(`> Player disconnected: ${game.state.players[playerId].name} (${playerId})`);
        game.removePlayer({ playerId: playerId });
    });
});

server.listen(3000, () => {
    console.log(`> Server listening on port: 3000`);
});
