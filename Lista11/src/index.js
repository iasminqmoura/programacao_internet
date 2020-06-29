const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const caminhoPublic = path.join(__dirname, '../public/');
const portaServidor = 3000;

app.use(express.static(caminhoPublic));
app.get('/', (req, res) => {
    res.sendFile(caminhoPublic + 'index.html');
});

io.on('connection', novoCliente);

http.listen(portaServidor, () => {
    console.log(`Servidor aberto na porta: ${portaServidor}.`);
});

let idAtual = 0;
let todosClientes = [ ];
function novoCliente(socket) {
    const cliente = {
        socket,
        conectado: false,

        dados: {
            id: idAtual++,
            nome: 'desconhecido',
            cor: null,
            icone: null
        }
    };

    // Eventos
    socket.on('conectar', (dados) => {
        if(cliente.conectado)
            return;

        cliente.conectado = true;
        
        let nomeRepetido = todosClientes.filter(c => c.dados.nome == dados.nome);
        if(nomeRepetido.length > 0)
            cliente.dados.nome = `${dados.nome} (${nomeRepetido.length})`;
        else
            cliente.dados.nome = dados.nome;

        cliente.dados.cor = dados.cor;
        cliente.dados.icone = dados.icone;

        todosClientes.push(cliente);
        io.emit('conectado', cliente.dados);
    });

    socket.on('enviar mensagem', (dados) => {
        if(!cliente.conectado)
            return;

        socket.broadcast.emit('mensagem', {
            ...dados,
            remetente: cliente.dados.id
        });
    });

    socket.on('mudar perfil', (dados) => {
        if(!cliente.conectado)
            return;
        
        let nomeRepetido = todosClientes.filter(c => c.nome == dados.nome);
        if(nomeRepetido.length > 0)
            cliente.dados.nome = `${dados.nome} (${nomeRepetido.length})`;
        else
            cliente.dados.nome = dados.nome;

        cliente.dados.cor = dados.cor;
        cliente.dados.icone = dados.icone;

        io.emit('mudou perfil', cliente.dados);
    });

    socket.on('disconnect', () => {
        if(!cliente.conectado)
            return;

        cliente.conectado = false;
        todosClientes.splice(todosClientes.indexOf(cliente), 1);

        socket.broadcast.emit('desconectou', cliente.dados.id);
    });

    // Avisar
    socket.emit('bem vindo', {
        id: cliente.dados.id,
        usuarios: todosClientes.map(c => c.dados)
    });
}