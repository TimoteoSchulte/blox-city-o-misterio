// Verifica se todas as tarefas, bueiros e o painel de energia são alcançáveis
// a pé a partir da fonte (busca em grade, com o raio real do jogador).
// Uso: node ferramentas/verificar-mapa.mjs
import { MAPA, TUNEIS, posicoesFonte } from '../shared/mapa.js';
import { colide } from '../shared/colisao.js';
import { REGRAS } from '../shared/config.js';

const P = 10, R = REGRAS.RAIO_JOGADOR;
const W = Math.ceil(MAPA.LARGURA / P), H = Math.ceil(MAPA.ALTURA / P);
const livre = new Uint8Array(W * H), visto = new Uint8Array(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) livre[y * W + x] = colide(x * P, y * P, R) ? 0 : 1;
const ini = posicoesFonte(1)[0];
const fila = [Math.round(ini.y / P) * W + Math.round(ini.x / P)];
visto[fila[0]] = 1;
while (fila.length) {
  const c = fila.pop(); const x = c % W, y = (c / W) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const n = (y + dy) * W + (x + dx);
    if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && livre[n] && !visto[n]) { visto[n] = 1; fila.push(n); }
  }
}
// um ponto é alcançável se alguma célula visitada está dentro do alcance de uso
function alcancavel(px, py, alcance) {
  for (let y = Math.floor((py - alcance) / P); y <= Math.ceil((py + alcance) / P); y++)
    for (let x = Math.floor((px - alcance) / P); x <= Math.ceil((px + alcance) / P); x++)
      if (x >= 0 && y >= 0 && x < W && y < H && visto[y * W + x] && Math.hypot(x * P - px, y * P - py) <= alcance - 5) return true;
  return false;
}
let ruins = 0;
const testar = (nome, x, y) => { if (!alcancavel(x, y, REGRAS.ALCANCE_USAR)) { ruins++; console.log('INALCANÇÁVEL:', nome, x, y); } };
MAPA.estacoes.forEach((e) => testar('tarefa ' + e.id, e.x, e.y));
Object.entries(TUNEIS.nos).forEach(([k, n]) => testar('bueiro ' + k, n.x, n.y));
testar('painel de energia', MAPA.PAINEL_ENERGIA.x, MAPA.PAINEL_ENERGIA.y);
for (const pr of MAPA.predios) {
  // quanto do interior do prédio dá para pisar
  let tot = 0, ok = 0;
  for (let y = Math.ceil(pr.y / P); y < (pr.y + pr.h) / P; y++) for (let x = Math.ceil(pr.x / P); x < (pr.x + pr.w) / P; x++) { if (livre[y * W + x]) { tot++; if (visto[y * W + x]) ok++; } }
  console.log(`${pr.nome.padEnd(16)} área livre alcançável: ${tot ? Math.round((ok / tot) * 100) : 0}%`);
}
console.log(ruins ? `${ruins} ponto(s) inalcançável(is)` : 'Tudo alcançável');
