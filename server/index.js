// =============================================================
// BLOX City: O Mistério — servidor
// Serve o jogo (pasta client/ e shared/) e controla as salas online.
//   npm start            -> porta 3100, mínimo de 5 jogadores
//   npm run teste        -> mínimo de 2 jogadores (para testar sozinho com várias abas)
//   PORT=8080 npm start  -> outra porta (hospedagens como Render usam isso)
// =============================================================
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { REGRAS, validarAvatar, validarNome } from '../shared/config.js';
import { Partida } from './Partida.js';
import { abrirTunel, obterLink } from './tunel.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argMin = process.argv.find((a) => a.startsWith('--minimo='));
const MINIMO = argMin ? Math.max(1, parseInt(argMin.split('=')[1], 10) || REGRAS.MIN_JOGADORES) : REGRAS.MIN_JOGADORES;
const PORTA = parseInt(process.env.PORT, 10) || 3100;
// Só para testes de quem roda o servidor: --papeis=impostor:encanador,inocente:eletricista,...
// (na ordem de entrada na sala). O administrador da sala nunca escolhe papéis.
const argPapeis = process.argv.find((a) => a.startsWith('--papeis='));
const PAPEIS_TESTE = argPapeis ? argPapeis.split('=')[1].split(',').map((p) => { const [alinhamento, profissao] = p.split(':'); return { alinhamento, profissao }; }) : null;

const app = express();
// sem cache: toda atualização do jogo chega na hora para todos
const semCache = { etag: false, lastModified: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-store') };
app.use(express.static(path.join(raiz, 'client'), { extensions: ['html'], ...semCache }));
app.use('/shared', express.static(path.join(raiz, 'shared'), semCache));
app.get('/api/link', (req, res) => res.json({ link: obterLink() }));
const servidor = http.createServer(app);
const io = new Server(servidor, { pingInterval: 10000, pingTimeout: 20000 });

// ---------------------------------------------------------- salas
const salas = new Map();
const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

function novoCodigo() {
  let c;
  do {
    c = Array.from({ length: 5 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join('');
  } while (salas.has(c));
  return c;
}

class Sala {
  constructor(codigo) {
    this.codigo = codigo;
    this.adminId = null;
    this.jogadores = new Map(); // id -> {id, nome, avatar}
    this.partida = null;
  }

  get fase() {
    return this.partida && this.partida.fase !== 'fim' ? 'jogo' : 'lobby';
  }

  estado() {
    return {
      codigo: this.codigo,
      admin: this.adminId,
      fase: this.fase,
      minimo: MINIMO,
      maximo: REGRAS.MAX_JOGADORES,
      jogadores: [...this.jogadores.values()],
    };
  }

  transmitir() {
    io.to(this.codigo).emit('sala:estado', this.estado());
  }

  partidaTerminou() {
    setTimeout(() => {
      this.partida = null;
      // quem caiu durante a partida sai da sala de vez
      for (const id of [...this.jogadores.keys()]) if (!io.sockets.sockets.get(id)) this.jogadores.delete(id);
      this.transmitir();
    }, 500);
  }
}

function sairDaSala(socket) {
  const codigo = socket.data.sala;
  if (!codigo) return;
  const sala = salas.get(codigo);
  socket.data.sala = null;
  socket.leave(codigo);
  if (!sala) return;
  sala.jogadores.delete(socket.id);
  if (sala.partida && sala.partida.fase !== 'fim') sala.partida.sair(socket.id);
  if (sala.jogadores.size === 0) {
    sala.partida?.encerrar();
    salas.delete(codigo);
    return;
  }
  if (sala.adminId === socket.id) sala.adminId = sala.jogadores.keys().next().value;
  sala.transmitir();
}

function entrar(socket, sala, dados) {
  sairDaSala(socket);
  sala.jogadores.set(socket.id, { id: socket.id, nome: validarNome(dados?.nome), avatar: validarAvatar(dados?.avatar) });
  if (!sala.adminId) sala.adminId = socket.id;
  socket.data.sala = sala.codigo;
  socket.join(sala.codigo);
  sala.transmitir();
}

// ---------------------------------------------------------- conexões
io.on('connection', (socket) => {
  const sala = () => salas.get(socket.data.sala);
  const partida = () => {
    const s = sala();
    return s && s.partida && s.partida.fase !== 'fim' ? s.partida : null;
  };
  const responder = (cb, dados) => typeof cb === 'function' && cb(dados);

  socket.on('sala:criar', (dados, cb) => {
    const s = new Sala(novoCodigo());
    salas.set(s.codigo, s);
    entrar(socket, s, dados);
    responder(cb, { ok: true, codigo: s.codigo });
  });

  socket.on('sala:entrar', (dados, cb) => {
    const codigo = String(dados?.codigo || '').toUpperCase().trim();
    const s = salas.get(codigo);
    if (!s) return responder(cb, { ok: false, erro: 'Sala não encontrada. Confira o código.' });
    if (s.fase === 'jogo') return responder(cb, { ok: false, erro: 'Essa sala já está no meio de uma partida. Aguarde ela terminar.' });
    if (s.jogadores.size >= REGRAS.MAX_JOGADORES) return responder(cb, { ok: false, erro: 'A sala está cheia (15 jogadores).' });
    entrar(socket, s, dados);
    responder(cb, { ok: true, codigo });
  });

  socket.on('sala:perfil', (dados) => {
    const s = sala();
    const j = s?.jogadores.get(socket.id);
    if (!j || s.fase !== 'lobby') return;
    j.nome = validarNome(dados?.nome);
    j.avatar = validarAvatar(dados?.avatar);
    s.transmitir();
  });

  socket.on('sala:sair', () => sairDaSala(socket));

  socket.on('sala:iniciar', (_, cb) => {
    const s = sala();
    if (!s) return;
    if (s.adminId !== socket.id) return responder(cb, { ok: false, erro: 'Só o administrador da sala pode iniciar.' });
    if (s.fase !== 'lobby') return;
    if (s.jogadores.size < MINIMO) return responder(cb, { ok: false, erro: `São necessários pelo menos ${MINIMO} jogadores.` });
    s.partida = new Partida(s, [...s.jogadores.values()], io, PAPEIS_TESTE);
    s.transmitir();
    s.partida.iniciar();
    responder(cb, { ok: true });
  });

  // ----- partida
  socket.on('jogo:mover', (d) => partida()?.mover(socket.id, d || {}));
  socket.on('jogo:matar', (d) => partida()?.matar(socket.id, d?.alvo));
  socket.on('jogo:relatar', (d) => partida()?.relatar(socket.id, d?.corpo));
  socket.on('jogo:emergencia', () => partida()?.emergencia(socket.id));
  socket.on('jogo:tarefa:abrir', (d, cb) => responder(cb, partida()?.abrirTarefa(socket.id, d?.estacao) || { ok: false }));
  socket.on('jogo:tarefa:concluir', (d, cb) => responder(cb, partida()?.concluirTarefa(socket.id, d?.estacao) || { ok: false }));
  socket.on('jogo:sabotar', (d) => partida()?.sabotar(socket.id, d?.tipo));
  socket.on('jogo:painel:abrir', (_, cb) => responder(cb, partida()?.abrirPainel(socket.id) || { ok: false }));
  socket.on('jogo:consertar', (d, cb) => responder(cb, partida()?.consertar(socket.id, d?.origem) || { ok: false }));
  socket.on('tunel:entrar', (d) => partida()?.entrarTunel(socket.id, d?.no));
  socket.on('tunel:mover', (d) => partida()?.moverTunel(socket.id, d?.para));
  socket.on('tunel:sair', () => partida()?.sairTunel(socket.id));
  socket.on('hab:pericia', (d) => partida()?.pericia(socket.id, d?.corpo));
  socket.on('reuniao:voto', (d) => partida()?.votar(socket.id, d?.alvo));
  socket.on('reuniao:chat', (d) => partida()?.chat(socket.id, d?.texto));

  socket.on('disconnect', () => sairDaSala(socket));
});

servidor.listen(PORTA, () => {
  console.log(`BLOX City: O Mistério rodando em http://localhost:${PORTA}  (mínimo de jogadores: ${MINIMO})`);
  if (PAPEIS_TESTE) console.log('ATENÇÃO: papéis fixos de teste ativados:', PAPEIS_TESTE);
  abrirTunel(PORTA);
});
