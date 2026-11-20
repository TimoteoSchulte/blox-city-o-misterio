// Colisão de um círculo (o jogador) contra retângulos e círculos do mapa.
// Usado no cliente (movimento suave) e no servidor (validação).
import { MAPA } from './mapa.js';

// Grade espacial simples para acelerar a busca
const CEL = 200;
const grade = new Map();
function chave(cx, cy) { return cx + ',' + cy; }
function indexar(obj, x, y, w, h) {
  for (let cx = Math.floor(x / CEL); cx <= Math.floor((x + w) / CEL); cx++) {
    for (let cy = Math.floor(y / CEL); cy <= Math.floor((y + h) / CEL); cy++) {
      const k = chave(cx, cy);
      if (!grade.has(k)) grade.set(k, []);
      grade.get(k).push(obj);
    }
  }
}
for (const r of MAPA.obstaculos) indexar({ r }, Math.max(-400, r.x), Math.max(-400, r.y), Math.min(r.w, 5000), Math.min(r.h, 5000));
for (const c of MAPA.circulos) indexar({ c }, c.x - c.r, c.y - c.r, c.r * 2, c.r * 2);

function proximos(x, y, raio) {
  const vistos = new Set();
  const lista = [];
  for (let cx = Math.floor((x - raio) / CEL); cx <= Math.floor((x + raio) / CEL); cx++) {
    for (let cy = Math.floor((y - raio) / CEL); cy <= Math.floor((y + raio) / CEL); cy++) {
      const arr = grade.get(chave(cx, cy));
      if (!arr) continue;
      for (const o of arr) {
        if (!vistos.has(o)) { vistos.add(o); lista.push(o); }
      }
    }
  }
  return lista;
}

function empurrar(px, py, raio, o) {
  if (o.r) {
    const r = o.r;
    const qx = Math.max(r.x, Math.min(px, r.x + r.w));
    const qy = Math.max(r.y, Math.min(py, r.y + r.h));
    const dx = px - qx, dy = py - qy;
    const d2 = dx * dx + dy * dy;
    if (d2 >= raio * raio) return null;
    if (d2 > 0.0001) {
      const d = Math.sqrt(d2);
      return { x: (dx / d) * (raio - d), y: (dy / d) * (raio - d) };
    }
    // centro dentro do retângulo: sai pelo lado mais próximo
    const esq = px - r.x, dir = r.x + r.w - px, cim = py - r.y, bai = r.y + r.h - py;
    const m = Math.min(esq, dir, cim, bai);
    if (m === esq) return { x: -(esq + raio), y: 0 };
    if (m === dir) return { x: dir + raio, y: 0 };
    if (m === cim) return { x: 0, y: -(cim + raio) };
    return { x: 0, y: bai + raio };
  }
  const c = o.c;
  const dx = px - c.x, dy = py - c.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const min = raio + c.r;
  if (d >= min) return null;
  if (d < 0.0001) return { x: min, y: 0 };
  return { x: (dx / d) * (min - d), y: (dy / d) * (min - d) };
}

// Move de (x,y) para (nx,ny) deslizando nas paredes.
export function mover(x, y, nx, ny, raio) {
  let px = nx, py = ny;
  for (let it = 0; it < 4; it++) {
    let mexeu = false;
    for (const o of proximos(px, py, raio + 4)) {
      const e = empurrar(px, py, raio, o);
      if (e) { px += e.x; py += e.y; mexeu = true; }
    }
    if (!mexeu) break;
  }
  return { x: px, y: py };
}

// O ponto está "dentro" de algo sólido (com tolerância)?
export function colide(x, y, raio) {
  for (const o of proximos(x, y, raio + 4)) {
    if (empurrar(x, y, raio, o)) return true;
  }
  return false;
}

// Há parede entre dois pontos? (amostragem simples, usado para validação)
export function caminhoLivre(x1, y1, x2, y2, raio = 4) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const passos = Math.max(1, Math.ceil(d / 8));
  for (let i = 1; i <= passos; i++) {
    const t = i / passos;
    if (colide(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, raio)) return false;
  }
  return true;
}
