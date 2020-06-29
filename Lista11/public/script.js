// Dados da sessão
var socket = null;
var usuario = {
    id: -1,
    nome: 'desconhecido',
    cor: null,
    icone: null
};
var usuarioConfig = {
    nome: 'desconhecido',
    cor: null,
    icone: null
};
var usuarios = { };

// Tags do chat
const tags = {
    'red': 'color: red',
    'blue': 'color: blue',
    'green': 'color: green',
    'b': 'font-weight: bold',
    's': 'text-decoration: line-through',
    'u': 'text-decoration: underline'
};
const fechamento = '/';

// Elementos da página
const janelaChat = document.getElementById('janela-chat');
const mensagensContainer = document.getElementById('mensagens-container');
const usuariosContainer = document.getElementById('usuarios-container');
const formEntrada = document.getElementById('form-entrada');
const caixaEntrada = document.getElementById('caixa-entrada');
const botaoEntrada = document.getElementById('botao-entrada');

const janelaConfig = document.getElementById('janela-config');
const configNome = document.getElementById('config-nome');
const botoesCorConfig = document.querySelectorAll('[botaoCor]');
const botaoConfirmarConfig = document.getElementById('botao-confirmar-config');

// Comunicação
function conectar() {
    usuarios = { };

    socket = io();
    socket.on('bem vindo', (dados) => {
        for(let u of dados.usuarios) {
            usuarios[u.id] = u;
            criarElementoUsuario(u);
        }

        usuario.id = dados.id;
        socket.emit('conectar', usuario);
    });
    socket.on('conectado', (dados) => {
        if(usuario.id == dados.id) {
            usuario = dados;
        }
        else {
            criarElementoMensagem({
                mensagem: { cru: `${gerarHtmlNomeUsuario(dados)} juntou-se a sala.` }
            });
        }

        usuarios[dados.id] = dados;
        criarElementoUsuario(dados);
        botaoEntrada.removeAttribute('disabled');
    });
    socket.on('mensagem', (dados) => criarElementoMensagem(dados));
    socket.on('mudou perfil', (dados) => {
        if(usuario.id != dados.id) {
            let passado = usuarios[dados.id];

            passado.elemento.remove();
            criarElementoMensagem({
                mensagem: { cru: `${gerarHtmlNomeUsuario(passado)} mudou o nick para ${gerarHtmlNomeUsuario(dados)}.` }
            });
        }
        else
            usuario = dados;

        usuarios[dados.id] = dados;
        criarElementoUsuario(dados);
    });
    socket.on('desconectou', (id) => {
        let dados = usuarios[id];

        if(dados) {
            delete usuarios[id];

            dados.elemento.remove();
            criarElementoMensagem({
                mensagem: { cru: `${gerarHtmlNomeUsuario(dados)} deixou a sala.` }
            });
        }
    });
}

// Eventos
formEntrada.onsubmit = function(event) {
    event.preventDefault();

    if(caixaEntrada.value.length > 0) {
        let dados = {
            remetente: usuario.id,
            mensagem: caixaEntrada.value
        };
        caixaEntrada.value = '';

        socket.emit('enviar mensagem', dados);
        criarElementoMensagem(dados);
    }
};

for(let b of botoesCorConfig) {
    const botao = b;
    b.onclick = function(event) {
        if(b.attributes['checked']) {
            b.removeAttribute('checked');
            usuarioConfig.cor = null;
            return;
        }

        for(_b of botoesCorConfig)
            _b.removeAttribute('checked');
        b.setAttribute('checked', '');

        const cor = getComputedStyle(b).getPropertyValue('--cor-config');
        usuarioConfig.cor = cor;
            
    };
}

botaoConfirmarConfig.onclick = function() {
    usuarioConfig.nome = configNome.value;
    usuarioConfig.icone = null;

    if(usuarioConfig.nome.length < 3)
        return;

    if(usuario.id == -1) {
        usuario = { ...usuario, ...usuarioConfig };
        botaoConfirmarConfig.value = 'Mudar';
        conectar();
    }
    else {

    }

    janelaChat.style.pointerEvents = null;
    janelaConfig.style.display = 'none';
};

// Instanciar elementos
function criarElementoMensagem(dados) {
    const elemento = document.createElement('span');
    elemento.classList.add('fonte-pequena');

    let mensagens = !Array.isArray(dados.mensagem) ? [ dados.mensagem ] : dados.mensagem;
    let mensagem = mensagens.map(msg => typeof msg == 'object' && typeof msg.cru == 'string' ? msg.cru : gerarHtmlMensagem(msg))
                            .join(' ');

    if(dados.remetente && dados.remetente != -1)
        elemento.innerHTML = `${gerarHtmlNomeUsuario(usuarios[dados.remetente])}: ${mensagem}`;
    else
        elemento.innerHTML = mensagem;

    mensagensContainer.append(elemento);

    if(mensagensContainer.children.length > 100)
        mensagensContainer.children[0].remove();
    return elemento;
}

function criarElementoUsuario(dados) {
    const elemento = document.createElement('span');
    elemento.classList.add('fonte-pequena');
    elemento.innerHTML = gerarHtmlNomeUsuario(dados);

    usuariosContainer.append(elemento);

    dados.elemento = elemento;
    return elemento;
}

// Geradores de Html
function gerarHtmlNomeUsuario(dados) {
    return `<span class="fonte-negrito" style="${dados.cor != null ? `color: ${dados.cor}` : ''}">${dados.nome}</span>`;
}

function gerarHtmlMensagem(texto) {
    function lerTag(indiceInicial, profundidade) {
        let abriuEm = indiceInicial;
        let fechouEm = abriuEm;
        let sucesso = false;

        for(; fechouEm < texto.length; fechouEm++) {
            let c = texto.charAt(fechouEm);
            if(c == ']') {
                sucesso = true;
                fechouEm++;
                break;
            }
            else if(fechouEm != abriuEm && c == '[') {
                sucesso = false;
                break;
            }
        }

        let cru = texto.substring(abriuEm, fechouEm);
        let conteudo = cru;
        if(sucesso) {
            let tag = texto.substring(abriuEm + 1, fechouEm - 1);
            if(tags[tag]) {
                conteudo = `<span style="${tags[tag]}">`;
                profundidade++;
            }
            else if(tag == fechamento && profundidade != 0) {
                conteudo = '</span>';
                profundidade--;
            }
        }

        return {
            sucesso,
            conteudo,
            cru,
            abriuEm,
            fechouEm,
            profundidade
        };
    }
    
    // Montar Html
    let r = '<span>';
    let inicio = 0;
    let profundidade = 0;
    for(let i = 0; i < texto.length; i++) {
        let c = texto.charAt(i);
        if(c != '[')
            continue;
        
        // Ler tag
        let tag = lerTag(i, profundidade);
        profundidade = tag.profundidade;

        // Incrementar texto entre tags
        r += texto.substring(inicio, i);
        if(tag.sucesso)
            r += tag.conteudo;
        else
            r += escape(tag.conteudo);

        inicio = tag.fechouEm;
        i = inicio - 1;
    }
    r += texto.substring(inicio, texto.length);

    // Fechar tags não fechadas
    for(; profundidade >= 0; profundidade--)
        r += '</span>';
    return r;
}

// Polyfill
Array.prototype.map||(Array.prototype.map=function(r,t){var n,o,e;if(null==this)throw new TypeError(" this is null or not defined");var i=Object(this),a=i.length>>>0;if("function"!=typeof r)throw new TypeError(r+" is not a function");for(arguments.length>1&&(n=t),o=new Array(a),e=0;e<a;){var p,f;e in i&&(p=i[e],f=r.call(n,p,e,i),o[e]=f),e++}return o});