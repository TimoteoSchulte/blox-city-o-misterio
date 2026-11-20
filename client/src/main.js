// =============================================================
// BLOX City: O Mistério — ponto de partida do cliente
// Liga a rede (Socket.IO) às telas, ao HUD e ao mundo (Phaser).
// Atalhos no endereço: ?toque=1 mostra os controles de toque no PC.
// =============================================================
/* global Phaser */
import { E, on, limparTela, toast } from './estado.js';
import { socket } from './rede.js';
import { telaNome, telaMenu, telaLobby } from './ui/telas.js';
import { montarHud, removerHud, atualizarTarefas, atualizarSabotagem, atualizarBotoes, definirMundo } from './ui/hud.js';
import { Mundo } from './mundo/Mundo.js';
import * as P from './ui/paineis.js';
import * as Reu from './ui/reuniao.js';
import { revelarPapel, telaMorte, telaVitoria } from './ui/revelacao.js';

let mundo = null;
let inicioPendente = null;
on('mundo:pronto', (m) => {
  mundo = m;
  window.__blox = { mundo: m, E }; // ajuda para depuração no console
  definirMundo(m);
  if (inicioPendente) { comecarPartida(inicioPendente); inicioPendente = null; }
});

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#1b1830',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  render: { antialias: true },
  scene: [Mundo],
});

telaNome();

// ---------------------------------------------------------- sala
socket.on('sala:estado', (s) => {
  E.sala = s;
  if (E.fase === 'jogo' || E.fase === 'fim') return;
  if (s.fase === 'lobby' && (E.tela === 'lobby' || E.tela === 'menu')) {
    telaLobby();
  }
});

let conectouAntes = false;
socket.on('connect', () => {
  if (conectouAntes && E.fase !== 'menu') {
    toast('Reconectado. Entre na sala novamente.', 'alerta', 5000);
    sairDaPartida();
    E.sala = null;
    history.replaceState(null, '', location.pathname);
    telaMenu();
  }
  conectouAntes = true;
});
socket.on('disconnect', () => toast('Conexão com o servidor perdida...', 'erro', 5000));

// ---------------------------------------------------------- partida
function comecarPartida(d) {
  E.fase = 'jogo';
  E.tela = 'jogo';
  document.body.classList.add('em-jogo');
  E.eu = { ...d.eu, vivo: true };
  E.tp = d.eu.tp;
  E.jogadores = new Map(d.jogadores.map((j) => [j.id, { ...j }]));
  E.aliados = new Map(d.aliados.map((a) => [a.id, a.tipo]));
  E.tarefas = d.tarefas;
  E.sabotagem = null;
  E.corpos = [];
  E.alertas = [];
  E.tunel = null;
  E.emReuniao = false;
  E.congelado = false;
  E.janela = null;
  limparTela();
  mundo.iniciarPartida(d);
  montarHud();
  revelarPapel();
}

socket.on('jogo:inicio', (d) => { if (mundo) comecarPartida(d); else inicioPendente = d; });
socket.on('jogo:snap', (d) => mundo?.snapshot(d));
socket.on('jogo:eu', (d) => {
  if (E.fase !== 'jogo') return;
  Object.assign(E.priv, d);
  E.eu.vivo = d.vivo;
  if (d.sabotagem !== E.sabotagem) { E.sabotagem = d.sabotagem; atualizarSabotagem(); }
  atualizarBotoes();
});
const corrigir = (d) => { if (mundo && d.tp >= (E.tp || 0)) mundo.teleporte(d); };
socket.on('jogo:corrigir', corrigir);
socket.on('jogo:teleporte', corrigir);
socket.on('jogo:tarefas', (t) => { E.tarefas = t; atualizarTarefas(); });
socket.on('jogo:progresso', (p) => { E.progresso = p; atualizarTarefas(); });
socket.on('jogo:corpos', (c) => { E.corpos = c; mundo?.definirCorpos(c); });
socket.on('jogo:sabotagem', (d) => {
  E.sabotagem = d.ativa;
  atualizarSabotagem();
  if (d.ativa) toast('⚡ APAGÃO! A energia da cidade caiu!', 'erro', 4000);
  else { toast('💡 A energia foi restaurada!', 'ok'); P.fecharJanela('painel'); }
});
socket.on('jogo:aviso', (d) => toast(d.texto, d.tipo === 'erro' ? 'erro' : 'info', 4000));
socket.on('jogo:morreu', (d) => {
  E.eu.vivo = false;
  if (P.janelaAtual() !== 'mapa') P.fecharJanela();
  telaMorte(d.assassino);
});
socket.on('jogo:eliminou', () => toast('Eliminação feita. Saia daí! 🏃', 'alerta', 2500));
socket.on('jogo:efeito', (d) => mundo?.efeito(d));
socket.on('jogo:saiu', (d) => {
  const j = E.jogadores.get(d.id);
  if (j) { j.vivo = false; j.desconectado = true; }
  if (E.fase === 'jogo') toast(`${d.nome} saiu da partida.`, 'alerta');
});

// túneis
socket.on('tunel:estado', (d) => P.atualizarTunel(d));
socket.on('tunel:viajando', (d) => P.tunelViajando(d));
socket.on('tunel:saiu', () => P.sairTunel());

// habilidades
socket.on('mecanico:alerta', (d) => {
  E.alertas.push({ ...d, recebido: Date.now() });
  if (E.alertas.length > 40) E.alertas.shift();
  toast('🔧 ' + d.texto, 'alerta', 4500);
});
socket.on('pericia:resultado', (d) => P.mostrarPericia(d));

// reunião
socket.on('reuniao:inicio', (d) => {
  P.fecharJanela();
  E.tunel = null;
  mundo?.definirCorpos([]);
  Reu.iniciarReuniao(d);
});
socket.on('reuniao:fase', (d) => Reu.faseReuniao(d));
socket.on('reuniao:votou', (d) => Reu.alguemVotou(d));
socket.on('reuniao:chat', (m) => Reu.chatReuniao(m));
socket.on('reuniao:resultado', (d) => Reu.resultadoReuniao(d, mundo));
socket.on('jogo:retomar', (d) => {
  for (const j of d.jogadores) {
    const info = E.jogadores.get(j.id);
    if (info) info.vivo = j.vivo;
  }
  Reu.encerrarReuniao();
});

// fim
function sairDaPartida() {
  Reu.encerrarReuniao();
  P.fecharJanela();
  removerHud();
  mundo?.encerrarPartida();
  document.body.classList.remove('em-jogo');
}
socket.on('jogo:fim', (d) => {
  sairDaPartida();
  E.fase = 'fim';
  limparTela();
  telaVitoria(d, () => { E.fase = 'lobby'; telaLobby(); });
});
