// =============================================================
// MINIJOGOS DAS TAREFAS
// Cada minijogo recebe (area, concluir) e devolve uma função de limpeza.
// Para criar uma tarefa nova: adicione o tipo em shared/tarefas.js,
// um ponto no mapa (shared/mapa.js) e uma função aqui em MINIJOGOS.
// =============================================================
import { el } from '../estado.js';

function criarCanvas(w, h) {
  const c = el('canvas', { width: w, height: h });
  c.style.width = '100%';
  c.style.maxWidth = w + 'px';
  c.style.height = 'auto';
  c.style.display = 'block';
  c.style.margin = '0 auto';
  c.style.borderRadius = '14px';
  c.style.touchAction = 'none';
  return c;
}
function posCanvas(c, e) {
  const r = c.getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
}
const sortear = (a, b) => a + Math.random() * (b - a);
const embaralhar = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function barraProgresso() {
  const b = el('div', { class: 'barra', style: { maxWidth: '420px', margin: '10px auto 0' } }, el('div', { style: { width: '0%' } }));
  b.definir = (p) => { b.firstChild.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; };
  return b;
}

// ---------- utilitário: esfregar até limpar ----------
function esfregar(area, concluir, { w, h, fundo, sujeira, raio = 30, cursor = '🧽' }) {
  const caixa = el('div', { class: 'mini-area', style: { maxWidth: w + 'px', margin: '0 auto' } });
  const base = criarCanvas(w, h);
  const suj = criarCanvas(w, h);
  suj.style.position = 'absolute'; suj.style.left = '0'; suj.style.top = '0';
  caixa.append(base, suj);
  const barra = barraProgresso();
  area.append(caixa, barra);
  fundo(base.getContext('2d'));
  const sx = suj.getContext('2d');
  sujeira(sx);
  const contar = () => {
    const d = sx.getImageData(0, 0, w, h).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 16) if (d[i] > 40) n++;
    return n;
  };
  const inicial = Math.max(1, contar());
  let apertado = false, terminou = false;
  suj.style.cursor = 'grab';
  const limpar = (e) => {
    const p = posCanvas(suj, e);
    sx.globalCompositeOperation = 'destination-out';
    sx.beginPath(); sx.arc(p.x, p.y, raio, 0, Math.PI * 2); sx.fill();
    sx.globalCompositeOperation = 'source-over';
  };
  suj.addEventListener('pointerdown', (e) => { apertado = true; suj.setPointerCapture(e.pointerId); limpar(e); });
  suj.addEventListener('pointermove', (e) => { if (apertado) limpar(e); });
  suj.addEventListener('pointerup', () => { apertado = false; });
  const timer = setInterval(() => {
    const resta = contar() / inicial;
    barra.definir(1 - resta);
    if (resta < 0.05 && !terminou) {
      terminou = true;
      sx.clearRect(0, 0, w, h);
      barra.definir(1);
      concluir();
    }
  }, 200);
  const dica = el('div', { class: 'dica', style: { marginTop: '6px' } }, `${cursor} Clique/toque e arraste para esfregar`);
  area.append(dica);
  return () => clearInterval(timer);
}

function manchas(ctx, n, area, cores = ['#6d4c2a', '#8d6e47', '#5d4037']) {
  for (let i = 0; i < n; i++) {
    const x = sortear(area.x, area.x + area.w), y = sortear(area.y, area.y + area.h), r = sortear(14, 30);
    ctx.fillStyle = cores[i % cores.length];
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2, rr2 = r * sortear(0.7, 1.2);
      ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------- 1. Lavar o carro ----------
function lavarCarro(area, concluir) {
  const W = 480, H = 260;
  const corpo = ['#e53935', '#8e24aa', '#1e88e5', '#43a047'][Math.floor(Math.random() * 4)];
  return esfregar(area, concluir, {
    w: W, h: H,
    fundo: (c) => {
      c.fillStyle = '#90a4ae'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#78909c'; for (let x = 0; x < W; x += 40) c.fillRect(x, 200, 20, 60);
      c.fillStyle = corpo; c.strokeStyle = '#1d1a2b'; c.lineWidth = 4;
      rr(c, 40, 110, 400, 80, 26); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(120, 112); c.lineTo(170, 55); c.lineTo(320, 55); c.lineTo(370, 112); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#b3e5fc'; c.beginPath(); c.moveTo(140, 108); c.lineTo(178, 66); c.lineTo(240, 66); c.lineTo(240, 108); c.fill();
      c.beginPath(); c.moveTo(252, 108); c.lineTo(252, 66); c.lineTo(312, 66); c.lineTo(350, 108); c.fill();
      c.fillStyle = '#222'; for (const x of [120, 360]) { c.beginPath(); c.arc(x, 192, 34, 0, Math.PI * 2); c.fill(); c.fillStyle = '#bdbdbd'; c.beginPath(); c.arc(x, 192, 14, 0, Math.PI * 2); c.fill(); c.fillStyle = '#222'; }
      c.fillStyle = '#fff59d'; c.fillRect(420, 130, 18, 14);
    },
    sujeira: (c) => manchas(c, 26, { x: 60, y: 60, w: 360, h: 150 }),
  });
}

// ---------- 2. Lavar a louça ----------
function lavarLouca(area, concluir) {
  const W = 480, H = 200;
  const pratos = [[90, 100], [240, 100], [390, 100]];
  return esfregar(area, concluir, {
    w: W, h: H, raio: 22,
    fundo: (c) => {
      c.fillStyle = '#4fc3f7'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#e1f5fe'; for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(Math.random() * W, Math.random() * H, 3 + Math.random() * 6, 0, Math.PI * 2); c.fill(); }
      for (const [x, y] of pratos) {
        c.fillStyle = '#ffffff'; c.strokeStyle = '#90a4ae'; c.lineWidth = 3;
        c.beginPath(); c.arc(x, y, 64, 0, Math.PI * 2); c.fill(); c.stroke();
        c.beginPath(); c.arc(x, y, 42, 0, Math.PI * 2); c.stroke();
      }
    },
    sujeira: (c) => { for (const [x, y] of pratos) manchas(c, 7, { x: x - 45, y: y - 45, w: 90, h: 90 }, ['#a1887f', '#ff8a65', '#795548']); },
  });
}

// ---------- 3. Conectar os fios ----------
function conectarFios(area, concluir) {
  const cores = embaralhar(['#e53935', '#1e88e5', '#fdd835', '#43a047']);
  const direita = embaralhar([...cores]);
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 440 300');
  Object.assign(svg.style, { width: '100%', maxWidth: '440px', display: 'block', margin: '0 auto', background: '#263238', borderRadius: '14px', touchAction: 'none' });
  const y = (i) => 50 + i * 66;
  const linhas = [];
  const conectado = new Set();
  const mk = (tag, a) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); svg.append(n); return n; };
  cores.forEach((c, i) => { mk('rect', { x: 10, y: y(i) - 16, width: 40, height: 32, rx: 6, fill: c, stroke: '#000', 'stroke-width': 3 }); });
  direita.forEach((c, i) => { mk('rect', { x: 390, y: y(i) - 16, width: 40, height: 32, rx: 6, fill: c, stroke: '#000', 'stroke-width': 3 }); mk('circle', { cx: 380, cy: y(i), r: 9, fill: '#90a4ae', stroke: '#000', 'stroke-width': 2 }); });
  let arrastando = null;
  const pos = (e) => { const r = svg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 440, y: ((e.clientY - r.top) / r.height) * 300 }; };
  svg.addEventListener('pointerdown', (e) => {
    const p = pos(e);
    if (p.x > 90) return;
    const i = Math.round((p.y - 50) / 66);
    if (i < 0 || i > 3 || conectado.has(cores[i])) return;
    svg.setPointerCapture(e.pointerId);
    const ln = mk('line', { x1: 50, y1: y(i), x2: p.x, y2: p.y, stroke: cores[i], 'stroke-width': 12, 'stroke-linecap': 'round' });
    arrastando = { i, ln };
  });
  svg.addEventListener('pointermove', (e) => { if (!arrastando) return; const p = pos(e); arrastando.ln.setAttribute('x2', p.x); arrastando.ln.setAttribute('y2', p.y); });
  svg.addEventListener('pointerup', (e) => {
    if (!arrastando) return;
    const p = pos(e);
    const k = Math.round((p.y - 50) / 66);
    const cor = cores[arrastando.i];
    if (p.x > 340 && k >= 0 && k <= 3 && direita[k] === cor) {
      arrastando.ln.setAttribute('x2', 380); arrastando.ln.setAttribute('y2', y(k));
      conectado.add(cor); linhas.push(arrastando.ln);
      if (conectado.size === 4) concluir();
    } else arrastando.ln.remove();
    arrastando = null;
  });
  area.append(svg);
}

// ---------- 4. Disjuntores (tarefa) e Painel de energia (apagão) ----------
function disjuntores(area, concluir, comAlavanca = false) {
  const n = 8;
  const estado = Array.from({ length: n }, () => Math.random() < 0.5);
  if (estado.every(Boolean)) estado[Math.floor(Math.random() * n)] = false;
  const grade = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 70px)', gap: '12px', justifyContent: 'center', background: '#37474f', padding: '16px', borderRadius: '14px', maxWidth: '360px', margin: '0 auto' } });
  const alavanca = el('button', { class: 'btn', style: { display: comAlavanca ? 'flex' : 'none', margin: '12px auto 0' }, disabled: true }, '⚡ LIGAR A ENERGIA');
  const desenhar = () => {
    grade.innerHTML = '';
    estado.forEach((on, i) => {
      grade.append(el('div', { style: { textAlign: 'center' } },
        el('div', { style: { width: '14px', height: '14px', borderRadius: '50%', margin: '0 auto 6px', background: on ? '#69f0ae' : '#d50000', boxShadow: on ? '0 0 10px #69f0ae' : 'none' } }),
        el('button', {
          style: { width: '54px', height: '80px', borderRadius: '10px', border: '3px solid #000', background: '#cfd8dc', position: 'relative', cursor: 'pointer' },
          onclick: () => { estado[i] = !estado[i]; desenhar(); },
        }, el('div', { style: { position: 'absolute', left: '7px', right: '7px', height: '30px', top: on ? '6px' : '38px', background: on ? '#43a047' : '#616161', borderRadius: '6px', transition: 'top .1s' } }))));
    });
    const tudo = estado.every(Boolean);
    if (comAlavanca) alavanca.disabled = !tudo;
    else if (tudo) concluir();
  };
  alavanca.onclick = () => concluir();
  area.append(grade, alavanca);
  desenhar();
}

// ---------- 5. Calibrar o medidor ----------
function calibrarMedidor(area, concluir) {
  const W = 420, H = 240;
  const c = criarCanvas(W, H);
  const ctx = c.getContext('2d');
  let acertos = 0, ang = 0, vel = 1.6, faixa = sortearFaixa(0.5), parado = false;
  function sortearFaixa(tam) { const ini = sortear(0.15, 0.85 - tam * 0.5); return [ini, ini + tam * 0.5]; }
  const info = el('div', { class: 'viajando' }, 'Acertos: 0 / 3');
  const btn = el('button', { class: 'btn', style: { margin: '8px auto 0', display: 'flex' } }, '⏹ PARAR');
  let raf, t0 = performance.now();
  const loop = (t) => {
    const dt = (t - t0) / 1000; t0 = t;
    if (!parado) ang += vel * dt;
    const p = (Math.sin(ang) + 1) / 2;
    ctx.fillStyle = '#263238'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 26;
    ctx.strokeStyle = '#455a64'; ctx.beginPath(); ctx.arc(210, 210, 160, Math.PI, 0); ctx.stroke();
    ctx.strokeStyle = '#69f0ae'; ctx.beginPath(); ctx.arc(210, 210, 160, Math.PI + faixa[0] * Math.PI, Math.PI + faixa[1] * Math.PI); ctx.stroke();
    const a = Math.PI + p * Math.PI;
    ctx.strokeStyle = '#ffca28'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(210, 210); ctx.lineTo(210 + Math.cos(a) * 170, 210 + Math.sin(a) * 170); ctx.stroke();
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(210, 210, 14, 0, Math.PI * 2); ctx.fill();
    raf = requestAnimationFrame(loop);
    c.p = p;
  };
  raf = requestAnimationFrame(loop);
  btn.onclick = () => {
    if (parado) return;
    const p = c.p;
    if (p >= faixa[0] && p <= faixa[1]) {
      acertos++;
      info.textContent = `Acertos: ${acertos} / 3`;
      if (acertos >= 3) { parado = true; concluir(); return; }
      vel += 0.6; faixa = sortearFaixa(0.5 - acertos * 0.1);
    } else {
      info.textContent = `Errou! Acertos: ${acertos} / 3`;
    }
  };
  area.append(c, info, btn);
  return () => cancelAnimationFrame(raf);
}

// ---------- 6. Desentupir o vaso ----------
function desentupirVaso(area, concluir) {
  const W = 300, H = 300;
  const c = criarCanvas(W, H);
  const ctx = c.getContext('2d');
  let entupido = 1, puxada = 0, fim = false;
  const barra = barraProgresso();
  const btn = el('button', { class: 'btn', style: { margin: '10px auto 0', display: 'flex' } }, '🪠 BOMBEAR (Espaço)');
  const bombear = () => {
    if (fim) return;
    entupido = Math.max(0, entupido - 0.085);
    puxada = 1;
    if (entupido <= 0) { fim = true; concluir(); }
  };
  btn.onclick = bombear;
  c.addEventListener('pointerdown', bombear);
  const tecla = (e) => { if (e.code === 'Space') { e.preventDefault(); e.stopPropagation(); bombear(); } };
  window.addEventListener('keydown', tecla, true);
  let raf, t0 = performance.now();
  const loop = (t) => {
    const dt = (t - t0) / 1000; t0 = t;
    if (!fim) entupido = Math.min(1, entupido + dt * 0.035);
    puxada = Math.max(0, puxada - dt * 5);
    barra.definir(1 - entupido);
    ctx.fillStyle = '#dcedf3'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#78909c'; ctx.lineWidth = 4;
    rr(ctx, 90, 20, 120, 50, 10); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(150, 175, 100, 110, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const agua = fim ? '#4fc3f7' : `rgb(${Math.round(79 + entupido * 60)},${Math.round(195 - entupido * 90)},${Math.round(247 - entupido * 170)})`;
    ctx.fillStyle = agua; ctx.beginPath(); ctx.ellipse(150, 185, 70 + entupido * 12, 80 + entupido * 12, 0, 0, Math.PI * 2); ctx.fill();
    if (fim) { ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 3; for (let r = 10; r < 60; r += 16) { ctx.beginPath(); ctx.arc(150, 185, r + (t / 40) % 16, 0, Math.PI * 2); ctx.stroke(); } }
    else {
      const py = 140 + puxada * 30;
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(144, py - 120, 12, 120);
      ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.ellipse(150, py + 10, 40 - puxada * 6, 22 + puxada * 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  area.append(c, barra, btn);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', tecla, true); };
}

// ---------- utilitário: arrastar e soltar ----------
function arrastavel(item, caixa, aoSoltar) {
  let dx = 0, dy = 0, ativo = false;
  item.style.touchAction = 'none';
  item.style.cursor = 'grab';
  item.addEventListener('pointerdown', (e) => {
    if (item.dataset.fixo) return;
    ativo = true; item.setPointerCapture(e.pointerId);
    const r = item.getBoundingClientRect();
    dx = e.clientX - r.left; dy = e.clientY - r.top;
    item.style.zIndex = 5;
  });
  item.addEventListener('pointermove', (e) => {
    if (!ativo) return;
    const cr = caixa.getBoundingClientRect();
    item.style.left = e.clientX - cr.left - dx + 'px';
    item.style.top = e.clientY - cr.top - dy + 'px';
  });
  item.addEventListener('pointerup', () => { if (!ativo) return; ativo = false; item.style.zIndex = 1; aoSoltar(); });
}
function centro(n, caixa) {
  const r = n.getBoundingClientRect(), c = caixa.getBoundingClientRect();
  return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 };
}

// ---------- 7. Arrumar a cama ----------
function arrumarCama(area, concluir) {
  const caixa = el('div', { class: 'mini-area', style: { width: '440px', maxWidth: '100%', height: '280px', margin: '0 auto', background: '#c8975f', borderRadius: '14px', overflow: 'hidden' } });
  const cama = el('div', { style: { position: 'absolute', left: '140px', top: '20px', width: '160px', height: '240px', background: '#6d4c41', borderRadius: '12px', border: '3px solid #2a2438' } });
  const lenco = el('div', { style: { position: 'absolute', left: '150px', top: '30px', width: '140px', height: '220px', background: '#fafafa', borderRadius: '10px' } });
  const alvoT = el('div', { style: { position: 'absolute', left: '170px', top: '38px', width: '100px', height: '44px', border: '3px dashed #9e9e9e', borderRadius: '14px' } });
  const alvoC = el('div', { style: { position: 'absolute', left: '150px', top: '110px', width: '140px', height: '140px', border: '3px dashed #9e9e9e', borderRadius: '10px' } });
  const trav = el('div', { style: { position: 'absolute', left: '20px', top: '200px', width: '100px', height: '44px', background: '#fff', border: '3px solid #b0bec5', borderRadius: '14px' } });
  const cob = el('div', { style: { position: 'absolute', left: '310px', top: '40px', width: '140px', height: '140px', background: '#5c6bc0', border: '3px solid #283593', borderRadius: '10px', transform: 'rotate(12deg)' } });
  caixa.append(cama, lenco, alvoT, alvoC, trav, cob);
  area.append(caixa);
  let ok = 0;
  const encaixar = (item, alvo) => () => {
    const a = centro(item, caixa), b = centro(alvo, caixa);
    if (Math.hypot(a.x - b.x, a.y - b.y) < 40) {
      item.style.left = alvo.style.left; item.style.top = alvo.style.top; item.style.transform = 'none';
      item.dataset.fixo = '1'; alvo.style.display = 'none';
      if (++ok === 2) concluir();
    }
  };
  arrastavel(trav, caixa, encaixar(trav, alvoT));
  arrastavel(cob, caixa, encaixar(cob, alvoC));
}

// ---------- 8. Regar as plantas ----------
function regarPlantas(area, concluir) {
  let nivel = 0, segurando = false, regadas = 0, fim = false;
  const faixa = [62, 82];
  const W = 420, H = 230;
  const c = criarCanvas(W, H);
  const ctx = c.getContext('2d');
  const info = el('div', { class: 'viajando' }, 'Plantas regadas: 0 / 3');
  const btn = el('button', { class: 'btn', style: { margin: '8px auto 0', display: 'flex' } }, '💧 SEGURE PARA ENCHER');
  const soltar = () => {
    if (!segurando || fim) return;
    segurando = false;
    if (nivel >= faixa[0] && nivel <= faixa[1]) {
      regadas++; info.textContent = `Plantas regadas: ${regadas} / 3`;
      if (regadas >= 3) { fim = true; concluir(); }
    } else info.textContent = nivel < faixa[0] ? 'Pouca água! Tente de novo.' : 'Transbordou! Tente de novo.';
    nivel = 0;
  };
  btn.addEventListener('pointerdown', (e) => { segurando = true; btn.setPointerCapture(e.pointerId); });
  btn.addEventListener('pointerup', soltar);
  btn.addEventListener('pointercancel', soltar);
  let raf, t0 = performance.now();
  const loop = (t) => {
    const dt = (t - t0) / 1000; t0 = t;
    if (segurando) nivel = Math.min(100, nivel + dt * 55);
    ctx.fillStyle = '#e8f5e9'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3; i++) {
      const x = 250 + i * 60, alt = i < regadas ? 70 : 30;
      ctx.fillStyle = '#8d4b2a'; rr(ctx, x - 22, 170, 44, 40, 6); ctx.fill();
      ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x, 170 - alt); ctx.stroke();
      ctx.fillStyle = i < regadas ? '#ff4081' : '#66bb6a'; ctx.beginPath(); ctx.arc(x, 170 - alt, i < regadas ? 14 : 8, 0, Math.PI * 2); ctx.fill();
    }
    // regador (nível)
    ctx.fillStyle = '#90a4ae'; rr(ctx, 40, 40, 110, 170, 14); ctx.fill();
    ctx.fillStyle = '#4fc3f7'; const hAgua = (nivel / 100) * 160; ctx.fillRect(45, 205 - hAgua, 100, hAgua);
    ctx.fillStyle = 'rgba(105,240,174,0.35)'; const y1 = 205 - (faixa[1] / 100) * 160, y2 = 205 - (faixa[0] / 100) * 160; ctx.fillRect(40, y1, 110, y2 - y1);
    ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 3; ctx.strokeRect(40, y1, 110, y2 - y1);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  area.append(c, info, btn);
  return () => cancelAnimationFrame(raf);
}

// ---------- 9. Sintonizar a TV ----------
function consertarTv(area, concluir) {
  const W = 400, H = 240;
  const c = criarCanvas(W, H);
  const ctx = c.getContext('2d');
  const alvo = Math.floor(sortear(20, 160));
  const slider = el('input', { type: 'range', min: 0, max: 180, value: (alvo + 90) % 180, style: { width: '100%', maxWidth: '400px', display: 'block', margin: '10px auto' } });
  const info = el('div', { class: 'viajando' }, 'Gire a antena');
  let firme = 0, fim = false, raf, t0 = performance.now();
  const loop = (t) => {
    const dt = (t - t0) / 1000; t0 = t;
    const diff = Math.abs(Number(slider.value) - alvo);
    const nitidez = Math.max(0, 1 - diff / 50);
    // imagem: casinha ao sol
    ctx.fillStyle = '#81d4fa'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fdd835'; ctx.beginPath(); ctx.arc(320, 60, 34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#66bb6a'; ctx.fillRect(0, 180, W, 60);
    ctx.fillStyle = '#ef5350'; ctx.beginPath(); ctx.moveTo(110, 110); ctx.lineTo(180, 60); ctx.lineTo(250, 110); ctx.fill();
    ctx.fillStyle = '#fff3e0'; ctx.fillRect(125, 110, 110, 75);
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(170, 140, 24, 45);
    // chuvisco
    const ruido = 1 - nitidez;
    if (ruido > 0.02) {
      const img = ctx.getImageData(0, 0, W, H);
      for (let i = 0; i < img.data.length; i += 4) {
        if (Math.random() < ruido) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
      }
      ctx.putImageData(img, 0, 0);
    }
    ctx.strokeStyle = '#212121'; ctx.lineWidth = 14; ctx.strokeRect(0, 0, W, H);
    if (!fim) {
      if (nitidez > 0.9) { firme += dt; info.textContent = 'Segure assim...'; } else { firme = 0; info.textContent = nitidez > 0.6 ? 'Quase lá!' : 'Gire a antena'; }
      if (firme > 0.8) { fim = true; concluir(); }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  area.append(c, el('div', { class: 'dica' }, '📡 Antena'), slider, info);
  return () => cancelAnimationFrame(raf);
}

// ---------- 10. Repor as prateleiras ----------
function reporPrateleiras(area, concluir) {
  const produtos = embaralhar(['🍎', '🥛', '🍞', '🧃', '🧀']).slice(0, 4);
  const caixa = el('div', { class: 'mini-area', style: { width: '440px', maxWidth: '100%', height: '290px', margin: '0 auto', background: '#f1e6cc', borderRadius: '14px' } });
  const vagas = embaralhar([...produtos]);
  const alvos = vagas.map((p, i) => {
    const a = el('div', { style: { position: 'absolute', left: 30 + i * 100 + 'px', top: '30px', width: '80px', height: '80px', border: '3px dashed #8d6e63', borderRadius: '12px', fontSize: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.35 } }, p);
    a.produto = p;
    caixa.append(a);
    return a;
  });
  caixa.append(el('div', { style: { position: 'absolute', left: '10px', right: '10px', top: '116px', height: '10px', background: '#6d4c41', borderRadius: '4px' } }));
  let ok = 0;
  produtos.forEach((p, i) => {
    const item = el('div', { style: { position: 'absolute', left: 30 + i * 100 + 'px', top: '190px', width: '80px', height: '80px', fontSize: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '12px', border: '3px solid #bcaaa4' } }, p);
    caixa.append(item);
    arrastavel(item, caixa, () => {
      const a = alvos.find((k) => k.produto === p);
      const pc = centro(item, caixa), ac = centro(a, caixa);
      if (Math.hypot(pc.x - ac.x, pc.y - ac.y) < 45) {
        item.style.left = a.style.left; item.style.top = a.style.top; item.dataset.fixo = '1'; a.style.opacity = 0;
        if (++ok === produtos.length) concluir();
      }
    });
  });
  area.append(caixa);
}

// ---------- 11. Fechar o caixa ----------
function caixaRegistradora(area, concluir) {
  const codigo = String(Math.floor(sortear(10000, 99999)));
  let digitado = '';
  const visor = el('div', { style: { background: '#1b5e20', color: '#b9f6ca', fontSize: '34px', fontWeight: 800, letterSpacing: '8px', padding: '6px 14px', borderRadius: '10px', minWidth: '200px', textAlign: 'center', fontFamily: 'monospace' } }, '_____');
  const nota = el('div', { style: { background: '#fff', color: '#333', padding: '10px 16px', borderRadius: '6px', transform: 'rotate(-3deg)', fontFamily: 'monospace', fontSize: '18px', boxShadow: '0 4px 0 #0003' } }, 'NOTA FISCAL', el('br'), 'CÓDIGO: ', el('b', { style: { fontSize: '24px' } }, codigo));
  const teclado = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gap: '8px' } });
  const atualizar = () => { visor.textContent = digitado.padEnd(5, '_'); };
  const apertar = (k) => {
    if (k === '⌫') digitado = digitado.slice(0, -1);
    else if (k === 'OK') {
      if (digitado === codigo) { concluir(); return; }
      visor.style.background = '#b71c1c'; setTimeout(() => (visor.style.background = '#1b5e20'), 400); digitado = '';
    } else if (digitado.length < 5) digitado += k;
    atualizar();
  };
  for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']) {
    teclado.append(el('button', { class: 'btn ' + (k === 'OK' ? '' : 'sec'), style: { padding: '8px', fontSize: '22px' }, onclick: () => apertar(k) }, k));
  }
  const tecla = (e) => {
    if (/^[0-9]$/.test(e.key)) { e.stopPropagation(); apertar(e.key); }
    else if (e.key === 'Backspace') { e.stopPropagation(); apertar('⌫'); }
    else if (e.key === 'Enter') { e.stopPropagation(); apertar('OK'); }
  };
  window.addEventListener('keydown', tecla, true);
  area.append(el('div', { class: 'linha centro', style: { gap: '20px', alignItems: 'flex-start' } }, el('div', {}, nota), el('div', {}, visor, el('div', { class: 'espaco' }), teclado)));
  return () => window.removeEventListener('keydown', tecla, true);
}

// ---------- 12. Trocar o pneu (Mecânico) ----------
function trocarPneu(area, concluir) {
  const W = 300, H = 300;
  const c = criarCanvas(W, H);
  const ctx = c.getContext('2d');
  let etapa = 'soltar'; // soltar -> trocar -> apertar
  let voltas = [0, 0, 0, 0];
  let novo = false;
  const parafusos = [[150, 95], [205, 150], [150, 205], [95, 150]];
  const info = el('div', { class: 'viajando' }, 'Clique nos parafusos para soltar (3 voltas cada)');
  const btn = el('button', { class: 'btn', style: { margin: '8px auto 0', display: 'none' } }, '🔄 Trocar o pneu');
  const desenhar = () => {
    ctx.fillStyle = '#575c68'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = novo ? '#212121' : '#3e2723'; ctx.beginPath(); ctx.arc(150, 150, 130, 0, Math.PI * 2); ctx.fill();
    if (!novo) { ctx.fillStyle = '#575c68'; ctx.beginPath(); ctx.moveTo(20, 200); ctx.lineTo(60, 230); ctx.lineTo(30, 260); ctx.fill(); }
    ctx.strokeStyle = '#424242'; ctx.lineWidth = 6; for (let a = 0; a < 12; a++) { ctx.beginPath(); ctx.arc(150, 150, 118, a * 0.52, a * 0.52 + 0.3); ctx.stroke(); }
    ctx.fillStyle = '#bdbdbd'; ctx.beginPath(); ctx.arc(150, 150, 85, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#757575'; ctx.lineWidth = 4; ctx.stroke();
    parafusos.forEach(([x, y], i) => {
      const v = voltas[i];
      ctx.fillStyle = etapa === 'soltar' ? (v >= 3 ? '#66bb6a' : '#ffca28') : (v >= 3 ? '#66bb6a' : '#ff7043');
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(x, y); ctx.rotate(v * 1.2); ctx.fillStyle = '#000'; ctx.fillRect(-9, -2, 18, 4); ctx.restore();
    });
  };
  c.addEventListener('pointerdown', (e) => {
    if (etapa === 'trocar') return;
    const p = posCanvas(c, e);
    parafusos.forEach(([x, y], i) => {
      if (Math.hypot(p.x - x, p.y - y) < 26 && voltas[i] < 3) voltas[i]++;
    });
    if (voltas.every((v) => v >= 3)) {
      if (etapa === 'soltar') { etapa = 'trocar'; info.textContent = 'Parafusos soltos! Agora troque o pneu.'; btn.style.display = 'flex'; }
      else if (etapa === 'apertar') { info.textContent = 'Pneu trocado!'; concluir(); }
    }
    desenhar();
  });
  btn.onclick = () => { novo = true; etapa = 'apertar'; voltas = [0, 0, 0, 0]; btn.style.display = 'none'; info.textContent = 'Agora aperte os parafusos (3 voltas cada)'; desenhar(); };
  desenhar();
  area.append(c, info, btn);
}

export const MINIJOGOS = {
  lavar_carro: lavarCarro,
  lavar_louca: lavarLouca,
  conectar_fios: conectarFios,
  religar_disjuntores: (a, c) => disjuntores(a, c, false),
  energia: (a, c) => disjuntores(a, c, true),
  calibrar_medidor: calibrarMedidor,
  desentupir_vaso: desentupirVaso,
  arrumar_cama: arrumarCama,
  regar_plantas: regarPlantas,
  consertar_tv: consertarTv,
  repor_prateleiras: reporPrateleiras,
  caixa_registradora: caixaRegistradora,
  trocar_pneu: trocarPneu,
};
