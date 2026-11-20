// Estado do cliente + pequeno barramento de eventos + utilidades de DOM.
import { AVATAR_PADRAO } from '/shared/config.js';

export const E = {
  perfil: carregarPerfil(),
  sala: null,        // estado da sala vindo do servidor
  fase: 'menu',      // menu | lobby | jogo
  eu: null,          // {id, alinhamento, profissao, vivo}
  jogadores: new Map(), // id -> {id, nome, avatar, vivo}
  aliados: new Map(),   // id -> 'impostor' | 'neutro'
  tarefas: [],
  progresso: { feitas: 0, total: 0 },
  sabotagem: null,
  priv: { recMatar: 0, recHab: 0, recSab: 0, recEmerg: 0, emergencias: 1 },
  corpos: [],
  tunel: null,
  alertas: [],
  emReuniao: false,
  janela: null, // janela aberta (tarefa, túnel, tablet...)
  tela: 'nome',  // tela atual fora da partida
  dpad: { c: false, b: false, e: false, d: false },
  tp: 1,
  congelado: false,
};

const ouvintes = {};
export function on(ev, fn) { (ouvintes[ev] ||= []).push(fn); }
export function emitir(ev, ...a) { (ouvintes[ev] || []).forEach((f) => f(...a)); }

function carregarPerfil() {
  try {
    const p = JSON.parse(localStorage.getItem('bloxcity_perfil'));
    if (p && p.avatar) return p;
  } catch (e) { /* sem armazenamento */ }
  return { nome: '', avatar: { ...AVATAR_PADRAO } };
}
export function salvarPerfil() {
  try { localStorage.setItem('bloxcity_perfil', JSON.stringify(E.perfil)); } catch (e) { /* ok */ }
}

// ---------- DOM ----------
export const raiz = document.getElementById('ui');

export function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'html') n.innerHTML = v;
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f != null && f !== false) n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return n;
}

let toasts;
export function limparTela() {
  for (const c of [...raiz.children]) if (c !== toasts) c.remove();
}
export function toast(texto, tipo = 'info', ms = 3200) {
  if (!toasts || !toasts.isConnected) {
    toasts = el('div', { class: 'toasts' });
    toasts.style.zIndex = 60;
    toasts.style.position = 'absolute';
    raiz.append(toasts);
  }
  const t = el('div', { class: 'toast ' + tipo }, texto);
  toasts.append(t);
  setTimeout(() => t.remove(), ms);
}

export function nomeDe(id) {
  return E.jogadores.get(id)?.nome || '???';
}
