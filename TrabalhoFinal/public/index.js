import createGame from './game.js';
import createKeyboardListener from './keyboard-listener.js';
import renderScreen from './render-screen.js';

const connectScreen = document.getElementById('connect');
const gameScreen = document.getElementById('game');
const screen = document.getElementById('screen');
const form = document.getElementById('form');
const formName = document.getElementById('name');
const formColor = document.getElementById('color');
const scoreboard = document.getElementById('scoreboard');

const allScreens = [
    connectScreen,
    gameScreen
];

// ---------------
// Connect
// ---------------

form.onsubmit = function(event) {
    event.preventDefault();

    const name = formName.value;
    const color = formColor.value;

    if(name == null || name.length < 3) {
        alert('Nome inválido.');
        return;
    }

    const user = {
        name,
        color
    };
    connectToGame(user);
    showScreen(gameScreen);
};

function showScreen(screen) {
    for(var s of allScreens)
        s.style.display = 'none';
    screen.style.display = null;
}

// ---------------
// Game
// ---------------

function connectToGame(userData) {
    const game = createGame();
    const keyboardListener = createKeyboardListener(document);
    
    const socket = io();
    
    var playerId = null;
    var isConnected = false;
    
    socket.on('connect', () => {        
        playerId = socket.id;
        isConnected = false;

        renderScreen(screen, game, requestAnimationFrame, playerId);

        socket.emit('join-player', userData);
        
        console.log(`Player connected on Client with id: ${playerId}`);
    });
    
    socket.on('setup', (state) => {
        game.setState(state);
    
        keyboardListener.registerPlayerId(playerId);
        keyboardListener.subscribe(game.movePlayer);
        keyboardListener.subscribe((command) => {
            socket.emit('move-player', command);
        });
    });
    
    socket.on('add-player', (command) => {
        game.addPlayer(command);

        updateScoreboard(game);
    });
    
    socket.on('remove-player', (command) => {
        game.removePlayer(command);

        updateScoreboard(game);
    });
    
    socket.on('move-player', (command) => {    
        const playerId = socket.id;
    
        if(playerId !== command.playerId) {
            game.movePlayer(command);
        }
    });
    
    socket.on('add-fruit', (command) => {
        game.addFruit(command);
    });
    
    socket.on('remove-fruit', (command) => {
        game.removeFruit(command);
    });

    socket.on('player-score', (command) => {
        const player = game.state.players[command.playerId];
        if(player == null)
            return;
        
        updateScoreboard(game);
    });
}

function getPlayerScoreboard(player, position) {
    return `
        <span class="scoreboard-player">
            ${position}º (${player.score}pts) 
            <div class="player-color" style="background-color: ${player.color};"></div> 
            ${player.name}
        </span>`;
}

function updateScoreboard(game) {
    const players = [];
    for(var playerA of Object.values(game.state.players)) {
        var position = -1;
        var index = 0;
        for(var playerB of players) {
            if(playerA.score > playerB.score) {
                position = index;
                break;
            }

            index++;
        }

        if(position == -1 && players.length < 10)
            position = players.length;

        if(position != -1) {
            players.splice(position, 0, playerA);

            if(players.length > 10)
                players.splice(10, 1);
        }
    }

    var html = '<span style="font-size: large; font-weight: bold; padding-bottom: 8px;">Placar</span>\n';
    var position = 1;
    for(var player of players) 
        html += `${getPlayerScoreboard(player, position++)}\n`;
    scoreboard.innerHTML = html;
}
