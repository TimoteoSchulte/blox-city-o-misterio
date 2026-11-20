// HUD da partida: tarefas, progresso, botões de ação, setinhas (toque) e teclado.
import { ALINHAMENTOS, PROFISSOES } from '/shared/papeis.js';
import { SABOTAGENS, TIPOS_TAREFA } from '/shared/tarefas.js';
import { E, el, raiz, toast, on } from '../estado.js';
import { socket } from '../rede.js';
import {
  abrirTarefa, abrirPainelEnergia, abrirTablet, abrirAlertas, abrirSabotagem, abrirMapa, fecharJanela, janelaAtual,
} from './paineis.js';

const ehToque = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).get('toque') === '1';
let H = null; // elementos do HUD
let acoes = {};
let mundo = null;

export function definirMundo(m) { mundo = m; }

export function montarHud() {
  document.querySelector('.hud')?.remove();
  const al = ALINHAMENTOS[E.eu.alinhamento];
  const prof = PROFISSOES[E.eu.profissao];

  const tarefas = el('div', { class: 'painel-tarefas' + (ehToque && innerWidth < 900 ? ' fechado' : '') });
  const chip = el('div', { class: 'chip-papel' },
    el('div', { class: 'chip', style: { color: al.cor } }, al.nome + (al.subtitulo ? ` (${al.subtitulo.replace('Aliado dos ', '→ ')})` : '')),
    el('div', { class: 'chip' }, `${prof.icone} ${prof.nome}`),
    el('button', { class: 'btn-peq', title: 'Mapa (M)', onclick: () => mapa() }, '🗺️'),
    el('button', { class: 'btn-peq', title: 'Mostrar/ocultar setinhas', onclick: () => H.dpad.classList.toggle('visivel') }, '🎮'));
  const banner = el('div', { class: 'banner-sab', style: { display: 'none' } });

  const botao = (classe, ic, rotulo, tecla, fn) => {
    const b = el('button', { class: 'acao ' + classe, onclick: fn },
      el('span', { class: 'tecla' }, tecla), el('span', { class: 'ic' }, ic), el('span', { class: 'rot' }, rotulo), el('span', { class: 'rec' }));
    return b;
  };
  const bSab = botao('sabotar', '😈', 'SABOTAR', 'X', () => sabotar());
  const bHab = botao('hab', prof.icone, nomeHabilidade(), 'T', () => habilidade());
  const bMatar = botao('matar', '🔪', 'ELIMINAR', 'Q', () => matar());
  const bRelatar = botao('relatar', '📢', 'RELATAR', 'R', () => relatar());
  const bUsar = botao('usar', '✋', 'USAR', 'E', () => usar());
  if (!al.podeSabotar) bSab.classList.add('escondida');
  if (!['pericia', 'tablet', 'alarmes'].includes(prof.habilidade)) bHab.classList.add('escondida');
  if (!al.podeMatar) bMatar.classList.add('escondida');
  const grade = el('div', { class: 'acoes' }, bSab, bHab, el('span'), bMatar, bRelatar, bUsar);

  const dpad = criarDpad();
  if (ehToque) dpad.classList.add('visivel');

  const hud = el('div', { class: 'hud' }, tarefas, chip, banner, grade, dpad);
  raiz.prepend(hud);
  H = { hud, tarefas, banner, bSab, bHab, bMatar, bRelatar, bUsar, dpad };
  atualizarTarefas();
  atualizarSabotagem();
}

export function removerHud() {
  H?.hud.remove();
  H = null;
}

function nomeHabilidade() {
  const h = PROFISSOES[E.eu.profissao].habilidade;
  return { pericia: 'PERÍCIA', tablet: 'TABLET', alarmes: 'ALERTAS' }[h] || '';
}

export function atualizarTarefas() {
  if (!H) return;
  const { feitas, total } = E.progresso;
  const falsas = E.tarefas.some((t) => t.falsa);
  H.tarefas.innerHTML = '';
  H.tarefas.append(
    el('div', { class: 'tit', onclick: () => H.tarefas.classList.toggle('fechado') }, el('span', {}, '📋 Tarefas'), el('span', {}, '▾')),
    el('div', { style: { fontSize: '13px', color: 'var(--suave)' } }, `Tarefas da cidade: ${feitas}/${total}`),
    el('div', { class: 'barra' }, el('div', { style: { width: total ? (feitas / total) * 100 + '%' : '0%' } })),
    el('div', { class: 'itens' },
      falsas ? el('div', { class: 'item', style: { color: '#ff8a80' } }, 'Tarefas falsas: finja que está fazendo!') : null,
      E.tarefas.map((t) => el('div', { class: 'item' + (t.feita ? ' feita' : '') }, `${TIPOS_TAREFA[t.tipo].nome} `, el('small', {}, `(${t.local})`)))),
  );
  mundo?.atualizarMarcas();
}

export function atualizarSabotagem() {
  if (!H) return;
  if (E.sabotagem) {
    H.banner.style.display = 'block';
    H.banner.textContent = '⚠ ' + SABOTAGENS[E.sabotagem].aviso + (E.eu.profissao === 'eletricista' ? ' (ou use seu tablet)' : '');
  } else H.banner.style.display = 'none';
}

// recargas e estados dos botões (chamado com frequência)
export function atualizarBotoes() {
  if (!H) return;
  const p = E.priv;
  const vivo = E.eu.vivo;
  const rec = (b, s) => {
    b.classList.toggle('recarga', s > 0);
    b.querySelector('.rec').textContent = s > 0 ? s : '';
  };
  // usar
  const u = acoes.usar;
  H.bUsar.querySelector('.ic').textContent = u ? u.ic : '✋';
  H.bUsar.querySelector('.rot').textContent = u ? u.rotulo : 'USAR';
  H.bUsar.classList.toggle('off', !u);
  // matar
  rec(H.bMatar, p.recMatar);
  H.bMatar.classList.toggle('off', !acoes.matar || p.recMatar > 0 || !vivo);
  if (!vivo) H.bMatar.classList.add('escondida');
  // relatar
  H.bRelatar.classList.toggle('off', !acoes.corpo || !vivo);
  if (!vivo) H.bRelatar.classList.add('escondida');
  // sabotar
  rec(H.bSab, E.sabotagem ? 0 : p.recSab);
  H.bSab.classList.toggle('off', !!E.sabotagem || p.recSab > 0);
  // habilidade
  const h = PROFISSOES[E.eu.profissao].habilidade;
  if (h === 'pericia') { rec(H.bHab, p.recHab); H.bHab.classList.toggle('off', !acoes.corpo || p.recHab > 0 || !vivo); }
  if (h === 'tablet') { rec(H.bHab, p.recHab); H.bHab.classList.toggle('off', !vivo); }
  if (h === 'alarmes') { H.bHab.classList.toggle('off', !vivo); }
  if (!vivo) H.bHab.classList.add('escondida');
}

on('acoes', (a) => { acoes = a; atualizarBotoes(); });

// ---------------------------------------------------------- ações
function bloqueado() {
  return !H || E.emReuniao || E.congelado || (E.janela && E.janela !== 'mapa');
}

function usar() {
  if (bloqueado() || E.tunel) return;
  const u = acoes.usar;
  if (!u) return;
  fecharJanela('mapa');
  if (u.tipo === 'tarefa') {
    if (u.falsa) { toast('Você está fingindo fazer esta tarefa... 🤫', 'info', 2000); return; }
    abrirTarefa(u.id);
  } else if (u.tipo === 'painel') abrirPainelEnergia();
  else if (u.tipo === 'bueiro') socket.emit('tunel:entrar', { no: u.no });
  else if (u.tipo === 'emergencia') {
    if (E.priv.emergencias <= 0) return toast('Você já usou sua reunião de emergência.', 'erro');
    if (E.priv.recEmerg > 0) return toast(`Aguarde ${E.priv.recEmerg}s para chamar uma reunião.`, 'erro');
    socket.emit('jogo:emergencia');
  }
}

function matar() {
  if (bloqueado() || !acoes.matar || E.priv.recMatar > 0) return;
  socket.emit('jogo:matar', { alvo: acoes.matar });
}

function relatar() {
  if (bloqueado() || !acoes.corpo) return;
  socket.emit('jogo:relatar', { corpo: acoes.corpo });
}

function sabotar() {
  if (bloqueado() || !ALINHAMENTOS[E.eu.alinhamento].podeSabotar) return;
  abrirSabotagem();
}

function habilidade() {
  if (bloqueado() || !E.eu.vivo) return;
  const h = PROFISSOES[E.eu.profissao].habilidade;
  if (h === 'pericia') {
    if (E.priv.recHab > 0) return toast(`Perícia recarregando: ${E.priv.recHab}s`, 'erro');
    if (!acoes.corpo) return toast('Fique perto de um corpo para usar a Perícia.', 'erro');
    socket.emit('hab:pericia', { corpo: acoes.corpo });
  } else if (h === 'tablet') abrirTablet();
  else if (h === 'alarmes') abrirAlertas();
}

function mapa() {
  if (janelaAtual() === 'mapa') return fecharJanela('mapa');
  if (E.janela || E.emReuniao) return;
  abrirMapa(() => mundo?.eu);
}

// ---------------------------------------------------------- teclado
window.addEventListener('keydown', (e) => {
  if (E.fase !== 'jogo' || e.repeat) return;
  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { if (E.janela && E.janela !== 'tunel') fecharJanela(); return; }
  if (k === 'e' || k === ' ') { e.preventDefault(); usar(); }
  else if (k === 'q') matar();
  else if (k === 'r') relatar();
  else if (k === 'x') sabotar();
  else if (k === 't') habilidade();
  else if (k === 'm') mapa();
});

// ---------------------------------------------------------- setinhas
function criarDpad() {
  const dirs = { c: '▲', b: '▼', e: '◀', d: '▶' };
  const btns = {};
  const caixa = el('div', { class: 'dpad' }, el('div', { class: 'meio' }));
  for (const [k, s] of Object.entries(dirs)) { btns[k] = el('button', { class: k, tabindex: -1 }, s); caixa.append(btns[k]); }
  const ativos = new Map(); // pointerId -> {x,y}
  const recalcular = () => {
    const r = caixa.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = { c: false, b: false, e: false, d: false };
    for (const p of ativos.values()) {
      const dx = p.x - cx, dy = p.y - cy;
      if (Math.hypot(dx, dy) < 14) continue;
      const ang = Math.atan2(dy, dx); // 8 direções
      const oit = Math.round(ang / (Math.PI / 4));
      if ([-1, 0, 1].includes(oit)) d.d = true;
      if ([3, 4, -4, -3].includes(oit)) d.e = true;
      if ([1, 2, 3].includes(oit)) d.b = true;
      if ([-1, -2, -3].includes(oit)) d.c = true;
    }
    Object.assign(E.dpad, d);
    for (const k of Object.keys(dirs)) btns[k].classList.toggle('ativo', d[k]);
  };
  caixa.addEventListener('pointerdown', (e) => { e.preventDefault(); caixa.setPointerCapture(e.pointerId); ativos.set(e.pointerId, { x: e.clientX, y: e.clientY }); recalcular(); });
  caixa.addEventListener('pointermove', (e) => { if (ativos.has(e.pointerId)) { ativos.set(e.pointerId, { x: e.clientX, y: e.clientY }); recalcular(); } });
  const fim = (e) => { ativos.delete(e.pointerId); recalcular(); };
  caixa.addEventListener('pointerup', fim);
  caixa.addEventListener('pointercancel', fim);
  return caixa;
}
