// Desenho do mapa de BLOX City com Phaser.Graphics (arte 100% original, feita por código).
import { MAPA, TUNEIS } from '/shared/mapa.js';

export const PROF = { chao: 0, moveis: 2, carros: 3, jogadores: 1000, copas: 5000, telhados: 6000, escuro: 9000, rotulos: 9500 };
const cor = (s) => parseInt(s.replace('#', ''), 16);

// aleatório com semente (mesmo desenho para todos)
function rng(semente) {
  let s = semente;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const PISOS = {
  metal: { base: '#8f9aa6', linha: '#7b8691', grade: 40 },
  controle: { base: '#a9b7c2', linha: '#93a2ae', grade: 30 },
  loja: { base: '#f1e6cc', linha: '#e2d3b0', xadrez: 40 },
  estoque: { base: '#c2b08f', linha: '#ad9b7a', grade: 50 },
  lava: { base: '#8fa3ae', linha: '#7e939e', grade: 60 },
  escritorio: { base: '#d3c4b8', linha: '#c0b0a3', grade: 30 },
  estacionamento: { base: '#575c68', linha: '#575c68', grade: 0 },
  madeira: { base: '#c8975f', linha: '#b07f4a', tabua: 22 },
  madeira2: { base: '#b98352', linha: '#a06e40', tabua: 26 },
  azulejo: { base: '#dcedf3', linha: '#b9d3dc', grade: 22 },
  ceramica: { base: '#eee0c6', linha: '#dcc9a8', xadrez: 32 },
};

function piso(g, p) {
  const d = PISOS[p.piso] || PISOS.metal;
  g.fillStyle(cor(d.base), 1);
  g.fillRect(p.x, p.y, p.w, p.h);
  g.lineStyle(1, cor(d.linha), 1);
  if (d.grade) {
    for (let x = p.x + d.grade; x < p.x + p.w; x += d.grade) g.lineBetween(x, p.y, x, p.y + p.h);
    for (let y = p.y + d.grade; y < p.y + p.h; y += d.grade) g.lineBetween(p.x, y, p.x + p.w, y);
  }
  if (d.xadrez) {
    g.fillStyle(cor(d.linha), 1);
    for (let x = p.x, i = 0; x < p.x + p.w; x += d.xadrez, i++) {
      for (let y = p.y, k = 0; y < p.y + p.h; y += d.xadrez, k++) {
        if ((i + k) % 2) g.fillRect(x, y, Math.min(d.xadrez, p.x + p.w - x), Math.min(d.xadrez, p.y + p.h - y));
      }
    }
  }
  if (d.tabua) {
    for (let y = p.y + d.tabua; y < p.y + p.h; y += d.tabua) g.lineBetween(p.x, y, p.x + p.w, y);
    let k = 0;
    for (let y = p.y; y < p.y + p.h; y += d.tabua, k++) {
      for (let x = p.x + ((k * 37) % 90) + 30; x < p.x + p.w; x += 110) g.lineBetween(x, y, x, Math.min(y + d.tabua, p.y + p.h));
    }
  }
}

function desenharMovel(g, m) {
  const { x, y, w, h } = m;
  const borda = (c = 0x2a2438) => g.lineStyle(2, c, 1);
  switch (m.tipo) {
    case 'cama':
      g.fillStyle(0x6d4c41, 1); g.fillRoundedRect(x, y, w, h, 6); borda(); g.strokeRoundedRect(x, y, w, h, 6);
      g.fillStyle(0xfafafa, 1); g.fillRoundedRect(x + 5, y + 5, w - 10, h - 10, 5);
      g.fillStyle(0x5c6bc0, 1); g.fillRoundedRect(x + 5, y + h * 0.42, w - 10, h * 0.55, 5);
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(x + 12, y + 10, w - 24, 22, 8); borda(0xb0bec5); g.strokeRoundedRect(x + 12, y + 10, w - 24, 22, 8);
      break;
    case 'guarda_roupa': case 'escrivaninha':
      g.fillStyle(0x8d6e63, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      g.lineStyle(2, 0x5d4037, 1); g.lineBetween(x + w / 2, y + 3, x + w / 2, y + h - 3);
      g.fillStyle(0xffd54f, 1); g.fillCircle(x + w / 2 - 6, y + h / 2, 2.5); g.fillCircle(x + w / 2 + 6, y + h / 2, 2.5);
      break;
    case 'sofa':
      g.fillStyle(0xd84315, 1); g.fillRoundedRect(x, y, w, h, 10); borda(); g.strokeRoundedRect(x, y, w, h, 10);
      g.fillStyle(0xff7043, 1);
      if (h > w) { g.fillRoundedRect(x + 10, y + 8, w - 14, h / 2 - 10, 6); g.fillRoundedRect(x + 10, y + h / 2 + 2, w - 14, h / 2 - 10, 6); }
      else { g.fillRoundedRect(x + 8, y + 10, w / 2 - 10, h - 14, 6); g.fillRoundedRect(x + w / 2 + 2, y + 10, w / 2 - 10, h - 14, 6); }
      break;
    case 'tv':
      g.fillStyle(0x212121, 1); g.fillRoundedRect(x, y, w, h, 4); borda(0x000000); g.strokeRoundedRect(x, y, w, h, 4);
      g.fillStyle(0x37474f, 1); g.fillRect(x + 3, y + 3, w - 6, h - 6);
      break;
    case 'tapete':
      g.fillStyle(0x7e57c2, 0.55); g.fillRoundedRect(x, y, w, h, 12);
      g.lineStyle(3, 0xffd54f, 0.6); g.strokeRoundedRect(x + 6, y + 6, w - 12, h - 12, 8);
      break;
    case 'planta':
      g.fillStyle(0x8d4b2a, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2.4);
      g.fillStyle(0x2e7d32, 1); g.fillCircle(x + w / 2 - 5, y + h / 2 - 4, 9); g.fillCircle(x + w / 2 + 6, y + h / 2 - 2, 8); g.fillCircle(x + w / 2, y + h / 2 + 5, 8);
      break;
    case 'vaso':
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(x + 6, y, w - 12, 14, 4); borda(0x78909c); g.strokeRoundedRect(x + 6, y, w - 12, 14, 4);
      g.fillStyle(0xffffff, 1); g.fillEllipse(x + w / 2, y + 30, w - 6, 30); g.strokeEllipse(x + w / 2, y + 30, w - 6, 30);
      g.fillStyle(0x81d4fa, 1); g.fillEllipse(x + w / 2, y + 31, w - 18, 18);
      break;
    case 'pia':
      g.fillStyle(0xeceff1, 1); g.fillRoundedRect(x, y, w, h, 6); borda(0x78909c); g.strokeRoundedRect(x, y, w, h, 6);
      g.fillStyle(0xb3e5fc, 1); g.fillEllipse(x + w / 2, y + h / 2 + 2, w * 0.6, h * 0.55);
      g.fillStyle(0x90a4ae, 1); g.fillRect(x + w / 2 - 2, y + 2, 4, 8);
      break;
    case 'box': case 'banheira':
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(x, y, w, h, 10); borda(0x78909c); g.strokeRoundedRect(x, y, w, h, 10);
      g.fillStyle(0xb3e5fc, 1); g.fillRoundedRect(x + 6, y + 6, w - 12, h - 12, 8);
      break;
    case 'bancada':
      g.fillStyle(0xbcaaa4, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      g.fillStyle(0x424242, 1);
      if (h > w) { g.fillCircle(x + w / 2, y + 30, 7); g.fillCircle(x + w / 2, y + 50, 7); g.fillStyle(0xb3e5fc, 1); g.fillRect(x + 5, y + h - 50, w - 10, 30); }
      else { g.fillCircle(x + 30, y + h / 2, 7); g.fillCircle(x + 50, y + h / 2, 7); g.fillStyle(0xb3e5fc, 1); g.fillRect(x + w - 60, y + 5, 40, h - 10); }
      break;
    case 'geladeira': case 'geladeira_loja':
      g.fillStyle(m.tipo === 'geladeira' ? 0xeceff1 : 0x80deea, 1); g.fillRoundedRect(x, y, w, h, 5); borda(0x546e7a); g.strokeRoundedRect(x, y, w, h, 5);
      g.lineStyle(2, 0x90a4ae, 1); if (h > w) g.lineBetween(x + 3, y + h * 0.35, x + w - 3, y + h * 0.35); else g.lineBetween(x + w * 0.35, y + 3, x + w * 0.35, y + h - 3);
      break;
    case 'mesa':
      g.fillStyle(0xa1887f, 1); g.fillRoundedRect(x, y, w, h, 8); borda(); g.strokeRoundedRect(x, y, w, h, 8);
      g.fillStyle(0xffffff, 1); g.fillCircle(x + w * 0.3, y + h / 2, 7); g.fillCircle(x + w * 0.7, y + h / 2, 7);
      break;
    case 'banco':
      g.fillStyle(0x8d6e63, 1); g.fillRoundedRect(x, y, w, h, 5); borda(); g.strokeRoundedRect(x, y, w, h, 5);
      g.lineStyle(2, 0x6d4c41, 1);
      if (w > h) { g.lineBetween(x + 4, y + h / 2, x + w - 4, y + h / 2); } else { g.lineBetween(x + w / 2, y + 4, x + w / 2, y + h - 4); }
      break;
    case 'gerador':
      g.fillStyle(0x546e7a, 1); g.fillRoundedRect(x, y, w, h, 10); borda(0x263238); g.strokeRoundedRect(x, y, w, h, 10);
      g.fillStyle(0xffca28, 1); g.fillRect(x + 12, y + 12, 26, 26);
      g.fillStyle(0x263238, 1); g.fillTriangle(x + 25, y + 15, x + 18, y + 27, x + 28, y + 27);
      g.fillStyle(0x78909c, 1); g.fillCircle(x + w - 34, y + h / 2, 26);
      g.lineStyle(3, 0x37474f, 1); g.strokeCircle(x + w - 34, y + h / 2, 18);
      break;
    case 'transformador':
      g.fillStyle(0x607d8b, 1); g.fillRect(x, y, w, h); borda(0x263238); g.strokeRect(x, y, w, h);
      g.lineStyle(3, 0x455a64, 1);
      for (let i = 1; i < 6; i++) g.lineBetween(x + (w / 6) * i, y + 6, x + (w / 6) * i, y + h - 6);
      g.fillStyle(0xff7043, 1); g.fillCircle(x + 15, y + 15, 6);
      break;
    case 'torre_cabos':
      g.fillStyle(0x37474f, 1); g.fillRect(x, y, w, h);
      g.lineStyle(2, 0xffca28, 1); g.lineBetween(x, y, x + w, y + h); g.lineBetween(x + w, y, x, y + h); g.strokeRect(x, y, w, h);
      break;
    case 'painel_controle':
      g.fillStyle(0x263238, 1); g.fillRect(x, y, w, h);
      for (let i = 0; i < 9; i++) { g.fillStyle([0x66bb6a, 0xffca28, 0xef5350][i % 3], 1); g.fillCircle(x + 12 + i * 19, y + h / 2, 4); }
      break;
    case 'prateleira':
      g.fillStyle(0xd7ccc8, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      for (let i = 0; i < w / 22; i++) { g.fillStyle([0xef5350, 0x42a5f5, 0x66bb6a, 0xffca28, 0xab47bc][i % 5], 1); g.fillRect(x + 4 + i * 22, y + 5, 16, h - 10); }
      break;
    case 'balcao':
      g.fillStyle(0x6d4c41, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      g.fillStyle(0x263238, 1); g.fillRect(x + w - 50, y + 8, 38, 30); g.fillStyle(0x66bb6a, 1); g.fillRect(x + w - 46, y + 12, 30, 10);
      break;
    case 'caixas':
      g.fillStyle(0xc69c6d, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      g.lineStyle(2, 0x8d6e63, 1); g.lineBetween(x, y + h / 2, x + w, y + h / 2); g.lineBetween(x + w / 2, y, x + w / 2, y + h);
      break;
    case 'balde':
      g.fillStyle(0x29b6f6, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2); borda(); g.strokeCircle(x + w / 2, y + h / 2, w / 2);
      break;
    case 'mangueira':
      g.lineStyle(4, 0x43a047, 1); g.strokeCircle(x + w / 2, y + h / 2, w / 2); g.strokeCircle(x + w / 2, y + h / 2, w / 3.5);
      break;
    case 'lixeira':
      g.fillStyle(0x2e7d32, 1); g.fillRoundedRect(x, y, w, h, 5); borda(); g.strokeRoundedRect(x, y, w, h, 5);
      g.lineStyle(2, 0x1b5e20, 1); g.lineBetween(x + 4, y + h / 2, x + w - 4, y + h / 2);
      break;
    case 'escorregador':
      g.fillStyle(0xef5350, 1); g.fillRoundedRect(x, y, w, h, 8); borda(); g.strokeRoundedRect(x, y, w, h, 8);
      g.fillStyle(0xffeb3b, 1); g.fillRect(x + 10, y + 10, w - 20, h - 20);
      break;
    case 'balanco':
      g.lineStyle(5, 0x1565c0, 1); g.strokeRect(x, y, w, h);
      g.fillStyle(0xffca28, 1); g.fillRect(x + 20, y + h / 2 - 5, 24, 10); g.fillRect(x + w - 44, y + h / 2 - 5, 24, 10);
      break;
    case 'gangorra':
      g.fillStyle(0x8e24aa, 1); g.fillRoundedRect(x, y, w, h, 8); borda(); g.strokeRoundedRect(x, y, w, h, 8);
      g.fillStyle(0x4a148c, 1); g.fillCircle(x + w / 2, y + h / 2, 8);
      break;
    case 'faixa_perigo':
      g.fillStyle(0xffca28, 0.9); g.fillRect(x, y, w, h);
      g.fillStyle(0x212121, 0.9);
      for (let i = 0; i < w; i += 20) g.fillTriangle(x + i, y + h, x + i + 10, y, x + i + 18, y);
      break;
    case 'cabos_chao':
      // cabos grossos correndo pelo chão, dos geradores até a sala de controle
      g.lineStyle(6, 0x212121, 0.9);
      g.beginPath(); g.moveTo(x, y + 20); g.lineTo(x + w * 0.5, y + 20); g.lineTo(x + w * 0.5, y + h * 0.4); g.lineTo(x + w, y + h * 0.4); g.strokePath();
      g.lineStyle(5, 0xc62828, 0.9);
      g.beginPath(); g.moveTo(x, y + h - 30); g.lineTo(x + w * 0.4, y + h - 30); g.lineTo(x + w * 0.4, y - 40); g.lineTo(x + w, y - 40); g.strokePath();
      g.lineStyle(4, 0xfdd835, 0.9);
      g.beginPath(); g.moveTo(x, y + h * 0.6); g.lineTo(x + w * 0.65, y + h * 0.6); g.lineTo(x + w * 0.65, y + h); g.strokePath();
      break;
    case 'mesa_monitores':
      g.fillStyle(0x455a64, 1); g.fillRoundedRect(x, y, w, h, 6); borda(0x263238); g.strokeRoundedRect(x, y, w, h, 6);
      for (let i = 0; i < 3; i++) {
        g.fillStyle(0x212121, 1); g.fillRect(x + 10 + i * 46, y + 6, 38, 24);
        g.fillStyle([0x4fc3f7, 0x66bb6a, 0xffca28][i], 1); g.fillRect(x + 13 + i * 46, y + 9, 32, 18);
      }
      g.fillStyle(0x90a4ae, 1); g.fillRect(x + 40, y + h - 14, 70, 8);
      break;
    case 'cadeira':
      g.fillStyle(0x37474f, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2); borda(); g.strokeCircle(x + w / 2, y + h / 2, w / 2);
      g.fillStyle(0x546e7a, 1); g.fillCircle(x + w / 2, y + h / 2, w / 3.2);
      break;
    case 'quadro_aviso':
      g.fillStyle(0xffca28, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      g.fillStyle(0x212121, 1); g.fillTriangle(x + w / 2, y + 8, x + 4, y + 30, x + w - 4, y + 30);
      g.fillStyle(0xffca28, 1); g.fillRect(x + w / 2 - 1.5, y + 15, 3, 9);
      break;
    case 'bobina':
      g.fillStyle(0x8d6e63, 1); g.fillCircle(x + w / 2, y + h / 2, w / 2); borda(); g.strokeCircle(x + w / 2, y + h / 2, w / 2);
      g.lineStyle(4, 0xef6c00, 1); for (let r = w / 2 - 6; r > 10; r -= 6) g.strokeCircle(x + w / 2, y + h / 2, r);
      g.fillStyle(0x5d4037, 1); g.fillCircle(x + w / 2, y + h / 2, 8);
      break;
    case 'prateleira_ferramentas':
      g.fillStyle(0x6d4c41, 1); g.fillRect(x, y, w, h); borda(); g.strokeRect(x, y, w, h);
      for (let i = 0; i < 4; i++) { g.fillStyle([0xe53935, 0x90a4ae, 0x1e88e5, 0xfdd835][i], 1); g.fillRect(x + 4, y + 8 + i * 20, w - 8, 10); }
      break;
    default:
      g.fillStyle(0x9e9e9e, 1); g.fillRect(x, y, w, h);
  }
}

export function desenharCarro(g, c) {
  const vert = c.h > c.w;
  const { x, y, w, h } = c;
  const base = cor(c.cor);
  g.fillStyle(0x000000, 0.25); g.fillRoundedRect(x + 4, y + 6, w, h, 16);
  // rodas
  g.fillStyle(0x1b1b1b, 1);
  if (vert) {
    for (const ry of [y + 22, y + h - 46]) { g.fillRoundedRect(x - 5, ry, 10, 24, 3); g.fillRoundedRect(x + w - 5, ry, 10, 24, 3); }
  } else {
    for (const rx of [x + 22, x + w - 46]) { g.fillRoundedRect(rx, y - 5, 24, 10, 3); g.fillRoundedRect(rx, y + h - 5, 24, 10, 3); }
  }
  g.fillStyle(base, 1); g.fillRoundedRect(x, y, w, h, 16);
  g.lineStyle(3, 0x1d1a2b, 1); g.strokeRoundedRect(x, y, w, h, 16);
  g.fillStyle(0x1d2a3a, 1);
  if (vert) {
    g.fillRoundedRect(x + 10, y + 26, w - 20, 26, 6);
    g.fillRoundedRect(x + 12, y + h - 44, w - 24, 20, 6);
    g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(x + 12, y + 56, w - 24, h - 104, 8);
    g.fillStyle(0xfff59d, 1); g.fillCircle(x + 16, y + 8, 5); g.fillCircle(x + w - 16, y + 8, 5);
  } else {
    g.fillRoundedRect(x + w - 52, y + 10, 26, h - 20, 6);
    g.fillRoundedRect(x + 24, y + 12, 20, h - 24, 6);
    g.fillStyle(0xffffff, 0.25); g.fillRoundedRect(x + 48, y + 12, w - 104, h - 24, 8);
    g.fillStyle(0xfff59d, 1); g.fillCircle(x + w - 8, y + 16, 5); g.fillCircle(x + w - 8, y + h - 16, 5);
  }
  if (c.sujo) {
    const r = rng(c.x * 7 + c.y);
    g.fillStyle(0x6d4c2a, 0.75);
    for (let i = 0; i < 9; i++) g.fillCircle(x + 10 + r() * (w - 20), y + 10 + r() * (h - 20), 5 + r() * 9);
  }
  if (c.furado) {
    g.fillStyle(0xff5252, 1); g.fillTriangle(x + w + 8, y + h - 60, x + w + 22, y + h - 34, x + w - 6, y + h - 34);
    g.fillStyle(0xffffff, 1); g.fillRect(x + w + 7, y + h - 54, 2, 12);
  }
}

function arvoreCopa(g, d) {
  g.fillStyle(0x000000, 0.18); g.fillCircle(d.x + 6, d.y + 8, d.r);
  g.fillStyle(0x2e7d32, 1); g.fillCircle(d.x, d.y, d.r);
  g.fillStyle(0x43a047, 1); g.fillCircle(d.x - d.r * 0.3, d.y - d.r * 0.3, d.r * 0.62);
  g.fillStyle(0x66bb6a, 1); g.fillCircle(d.x - d.r * 0.4, d.y - d.r * 0.45, d.r * 0.3);
  g.lineStyle(2, 0x1b5e20, 1); g.strokeCircle(d.x, d.y, d.r);
}

export function desenharMapa(cena) {
  const g = cena.add.graphics().setDepth(PROF.chao);
  const r = rng(42);

  // grama
  g.fillStyle(0x6fbf63, 1); g.fillRect(0, 0, MAPA.LARGURA, MAPA.ALTURA);
  g.fillStyle(0x5fae55, 1);
  for (let i = 0; i < 1400; i++) g.fillCircle(r() * MAPA.LARGURA, r() * MAPA.ALTURA, 2 + r() * 3);
  // cerca na borda
  g.lineStyle(6, 0x8d6e63, 1); g.strokeRect(36, 36, MAPA.LARGURA - 72, MAPA.ALTURA - 72);
  g.lineStyle(2, 0xd7ccc8, 1); g.strokeRect(40, 40, MAPA.LARGURA - 80, MAPA.ALTURA - 80);

  // quarteirões: calçada em volta + grama dentro
  for (const q of MAPA.QUARTEIROES) {
    g.fillStyle(0xcfc6b6, 1); g.fillRect(q.x, q.y, q.w, q.h);
    g.lineStyle(1, 0xb9b0a0, 1);
    for (let x = q.x; x < q.x + q.w; x += 36) { g.lineBetween(x, q.y, x, q.y + 36); g.lineBetween(x, q.y + q.h - 36, x, q.y + q.h); }
    for (let y = q.y; y < q.y + q.h; y += 36) { g.lineBetween(q.x, y, q.x + 36, y); g.lineBetween(q.x + q.w - 36, y, q.x + q.w, y); }
    g.fillStyle(0x7ccb6d, 1); g.fillRect(q.x + 36, q.y + 36, q.w - 72, q.h - 72);
    g.fillStyle(0x6dbb60, 1);
    for (let i = 0; i < 250; i++) g.fillCircle(q.x + 40 + r() * (q.w - 80), q.y + 40 + r() * (q.h - 80), 2 + r() * 2);
  }
  // calçadas ligando prédios (caminhos internos)
  g.fillStyle(0xd9d0c0, 1);
  g.fillRect(356, 862, 1308, 38); g.fillRect(356, 1520, 1308, 40);
  g.fillRect(1936, 862, 1308, 38); g.fillRect(1936, 1520, 1308, 40);
  g.fillRect(1080, 356, 80, 506); g.fillRect(1060, 1560, 100, 484);
  g.fillRect(2700, 356, 80, 506); g.fillRect(2700, 1560, 80, 484);

  // ruas
  for (const rua of MAPA.RUAS) {
    g.fillStyle(0x474c58, 1); g.fillRect(rua.x, rua.y, rua.w, rua.h);
  }
  for (const rua of MAPA.RUAS) {
    const avenida = rua.nome === 'Avenida Central';
    g.fillStyle(avenida ? 0xffd23f : 0xf5f5f5, 0.9);
    if (rua.sentido === 'h') {
      const cy = rua.y + rua.h / 2;
      for (let x = rua.x + 200; x < rua.x + rua.w - 200; x += 70) g.fillRect(x, cy - 3, 38, 6);
    } else {
      const cx = rua.x + rua.w / 2;
      if (avenida) { g.fillRect(cx - 6, rua.y, 4, rua.h); g.fillRect(cx + 2, rua.y, 4, rua.h); }
      else for (let y = rua.y + 200; y < rua.y + rua.h - 200; y += 70) g.fillRect(cx - 3, y, 6, 38);
    }
    g.lineStyle(4, 0x9e9e9e, 1); g.strokeRect(rua.x, rua.y, rua.w, rua.h);
  }
  // faixas de pedestre
  g.fillStyle(0xffffff, 0.92);
  for (const f of MAPA.FAIXAS) {
    if (f.sentido === 'h') for (let x = f.x + 8; x < f.x + f.w - 8; x += 24) g.fillRect(x, f.y, 14, f.h);
    else if (f.sentido === 'v2') for (let x = f.x + 8; x < f.x + f.w - 8; x += 24) g.fillRect(x, f.y, 14, f.h);
    else for (let y = f.y + 8; y < f.y + f.h - 8; y += 24) g.fillRect(f.x, y, f.w, 14);
  }

  // parques (grama mais viva) + areia + lago + canteiros
  for (const p of MAPA.PARQUES) {
    g.fillStyle(0x86d478, 1); g.fillRoundedRect(p.x, p.y, p.w, p.h, 30);
    g.lineStyle(4, 0x5fae55, 1); g.strokeRoundedRect(p.x, p.y, p.w, p.h, 30);
  }
  for (const d of MAPA.decor) {
    if (d.tipo === 'areia') { g.fillStyle(0xf2d98d, 1); g.fillRoundedRect(d.x, d.y, d.w, d.h, 24); g.lineStyle(4, 0xd6b65d, 1); g.strokeRoundedRect(d.x, d.y, d.w, d.h, 24); }
    if (d.tipo === 'lago') {
      g.fillStyle(0xd6c49a, 1); g.fillCircle(d.x, d.y, d.r + 28);
      g.fillStyle(0x3fa9e0, 1); g.fillCircle(d.x, d.y, d.r);
      g.fillStyle(0x7fd0f5, 1); g.fillCircle(d.x - 30, d.y - 30, d.r * 0.35);
      g.fillStyle(0x66bb6a, 1); g.fillCircle(d.x + 50, d.y + 40, 14); g.fillCircle(d.x - 60, d.y + 50, 10);
    }
    if (d.tipo === 'canteiro') {
      g.fillStyle(0x6d4c41, 1); g.fillRoundedRect(d.x, d.y, d.w, d.h, 10);
      for (let i = 0; i < 8; i++) { g.fillStyle([0xff5252, 0xffeb3b, 0xe040fb, 0xff9800][i % 4], 1); g.fillCircle(d.x + 14 + i * 19, d.y + 15 + (i % 2) * 18, 6); }
    }
  }

  // praça central
  const P = MAPA.PRACA;
  g.fillStyle(0xe3d3b0, 1); g.fillRoundedRect(P.x, P.y, P.w, P.h, 40);
  g.lineStyle(1, 0xcdbb94, 1);
  for (let x = P.x + 40; x < P.x + P.w; x += 40) g.lineBetween(x, P.y + 4, x, P.y + P.h - 4);
  for (let y = P.y + 40; y < P.y + P.h; y += 40) g.lineBetween(P.x + 4, y, P.x + P.w - 4, y);
  g.lineStyle(5, 0xb8a47a, 1); g.strokeRoundedRect(P.x, P.y, P.w, P.h, 40);
  g.fillStyle(0xd2bf95, 1); g.fillCircle(MAPA.FONTE.x, MAPA.FONTE.y, MAPA.FONTE.r + 70);
  g.fillStyle(0xe8dbbd, 1); g.fillCircle(MAPA.FONTE.x, MAPA.FONTE.y, MAPA.FONTE.r + 55);

  // pisos internos
  for (const p of MAPA.pisos) piso(g, p);
  // nomes dos cômodos pintados no chão (aparecem quando o telhado some)
  for (const p of MAPA.pisos) {
    if (!p.rotulo) continue;
    cena.add.text(p.x + p.w / 2, p.y + p.h - 22, p.rotulo, {
      fontFamily: '"Baloo 2", sans-serif', fontSize: '18px', fontStyle: '800', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.55).setDepth(PROF.carros + 1);
  }
  // estacionamento: vagas
  g.lineStyle(4, 0xffffff, 0.85);
  for (let x = 1985; x <= 2700; x += 120) { g.lineBetween(x, 1585, x, 1765); g.lineBetween(x + 60, 1845, x + 60, 2025); }
  // capachos nas portas das casas
  for (const pr of MAPA.predios) {
    if (!pr.porta) continue;
    const pt = pr.porta;
    g.fillStyle(0x8d6e63, 1);
    if (pt.lado === 's') g.fillRect(pr.x + pt.de + 8, pr.y + pr.h + 8, pt.ate - pt.de - 16, 16);
    if (pt.lado === 'n') g.fillRect(pr.x + pt.de + 8, pr.y - 24, pt.ate - pt.de - 16, 16);
    if (pt.lado === 'o') g.fillRect(pr.x - 24, pr.y + pt.de + 8, 16, pt.ate - pt.de - 16);
  }

  // bueiros
  for (const n of Object.values(TUNEIS.nos)) {
    g.fillStyle(0x2f333b, 1); g.fillCircle(n.x, n.y, 20);
    g.lineStyle(3, 0x6b717c, 1); g.strokeCircle(n.x, n.y, 20);
    g.lineStyle(2, 0x575c66, 1);
    for (let k = -12; k <= 12; k += 6) { g.lineBetween(n.x - 16, n.y + k, n.x + 16, n.y + k); }
  }

  // paredes
  const gp = cena.add.graphics().setDepth(PROF.moveis - 1);
  for (const o of MAPA.obstaculos) {
    if (o.tipo !== 'parede') continue;
    gp.fillStyle(0x3b3650, 1); gp.fillRect(o.x, o.y, o.w, o.h);
    gp.fillStyle(0x5d5778, 1); gp.fillRect(o.x, o.y, o.w, Math.min(5, o.h));
  }

  // móveis
  const gm = cena.add.graphics().setDepth(PROF.moveis);
  for (const m of MAPA.moveis) desenharMovel(gm, m);
  // painel de energia (destaque)
  gm.fillStyle(0xffca28, 1); gm.fillRoundedRect(MAPA.PAINEL_ENERGIA.x - 26, 368, 52, 30, 6);
  gm.fillStyle(0x263238, 1); gm.fillTriangle(MAPA.PAINEL_ENERGIA.x + 2, 372, MAPA.PAINEL_ENERGIA.x - 8, 386, MAPA.PAINEL_ENERGIA.x + 4, 386);
  gm.fillTriangle(MAPA.PAINEL_ENERGIA.x - 2, 394, MAPA.PAINEL_ENERGIA.x + 8, 380, MAPA.PAINEL_ENERGIA.x - 4, 380);

  // carros
  const gc = cena.add.graphics().setDepth(PROF.carros);
  for (const c of MAPA.carros) desenharCarro(gc, c);

  // postes
  for (const d of MAPA.decor) {
    if (d.tipo !== 'poste') continue;
    gc.fillStyle(0x37474f, 1); gc.fillCircle(d.x, d.y, 7);
    gc.fillStyle(0xfff59d, 1); gc.fillCircle(d.x, d.y, 4);
  }

  // fonte
  const F = MAPA.FONTE;
  const gf = cena.add.graphics().setDepth(PROF.carros);
  gf.fillStyle(0x9e8f73, 1); gf.fillCircle(F.x, F.y, F.r + 14);
  gf.fillStyle(0xcfc2a5, 1); gf.fillCircle(F.x, F.y, F.r + 8);
  gf.fillStyle(0x2f9fe0, 1); gf.fillCircle(F.x, F.y, F.r);
  gf.fillStyle(0x58b8ef, 1); gf.fillCircle(F.x, F.y, F.r - 20);
  gf.lineStyle(3, 0x1d1a2b, 1); gf.strokeCircle(F.x, F.y, F.r + 14);
  // estátua: um bloco dourado com uma lupa (símbolo da cidade)
  gf.fillStyle(0x8d7b5a, 1); gf.fillCircle(F.x, F.y, 30);
  gf.fillStyle(0xffc93c, 1); gf.fillRoundedRect(F.x - 20, F.y - 26, 40, 40, 6);
  gf.fillStyle(0xe0a800, 1); gf.fillRect(F.x - 20, F.y + 4, 40, 10);
  gf.lineStyle(3, 0x1d1a2b, 1); gf.strokeRoundedRect(F.x - 20, F.y - 26, 40, 40, 6);
  gf.lineStyle(4, 0x1d1a2b, 1); gf.strokeCircle(F.x - 2, F.y - 8, 8); gf.lineBetween(F.x + 4, F.y - 2, F.x + 12, F.y + 6);
  // ondinhas animadas
  const ondas = [];
  for (let i = 0; i < 3; i++) {
    const o = cena.add.circle(F.x, F.y, 40, 0xffffff, 0).setStrokeStyle(3, 0xe1f5fe, 0.8).setDepth(PROF.carros + 1);
    cena.tweens.add({ targets: o, radius: F.r - 6, alpha: { from: 0.9, to: 0 }, duration: 2400, repeat: -1, delay: i * 800 });
    ondas.push(o);
  }

  // copas das árvores (acima dos jogadores)
  const gcopa = cena.add.graphics().setDepth(PROF.copas);
  for (const d of MAPA.decor) if (d.tipo === 'arvore') arvoreCopa(gcopa, d);

  // telhados (somem quando o jogador entra no prédio)
  const telhados = [];
  for (const pr of MAPA.predios) {
    const gt = cena.add.graphics().setDepth(PROF.telhados);
    const c = cor(pr.telhado);
    gt.fillStyle(0x000000, 0.25); gt.fillRect(pr.x + 8, pr.y + 10, pr.w, pr.h);
    gt.fillStyle(c, 1); gt.fillRect(pr.x - 6, pr.y - 6, pr.w + 12, pr.h + 12);
    gt.lineStyle(2, 0x000000, 0.15);
    if (pr.casa) {
      // telhado de duas águas
      const meio = pr.y + pr.h / 2;
      for (let y = pr.y + 4; y < pr.y + pr.h; y += 18) gt.lineBetween(pr.x - 6, y, pr.x + pr.w + 6, y);
      gt.lineStyle(6, 0x000000, 0.25); gt.lineBetween(pr.x - 6, meio, pr.x + pr.w + 6, meio);
      gt.fillStyle(0x8d6e63, 1); gt.fillRect(pr.x + pr.w - 90, pr.y + 40, 34, 44);
    } else {
      for (let x = pr.x; x < pr.x + pr.w; x += 40) gt.lineBetween(x, pr.y - 6, x, pr.y + pr.h + 6);
      gt.fillStyle(0x000000, 0.15); gt.fillRect(pr.x + 40, pr.y + 40, 70, 50); gt.fillRect(pr.x + pr.w - 120, pr.y + pr.h - 100, 60, 50);
    }
    gt.lineStyle(4, 0x1d1a2b, 1); gt.strokeRect(pr.x - 6, pr.y - 6, pr.w + 12, pr.h + 12);
    const txt = cena.add.text(pr.x + pr.w / 2, pr.y + pr.h / 2, pr.nome.toUpperCase(), {
      fontFamily: '"Baloo 2", sans-serif', fontSize: pr.casa ? '30px' : '40px', fontStyle: '800', color: '#ffffff',
      backgroundColor: '#1d1a2bcc', padding: { x: 14, y: 4 },
    }).setOrigin(0.5).setDepth(PROF.telhados + 1);
    telhados.push({ predio: pr, g: gt, txt, alvo: 1 });
  }

  // placas de rua
  const placa = (x, y, t) => cena.add.text(x, y, t, { fontFamily: '"Baloo 2", sans-serif', fontSize: '22px', fontStyle: '800', color: '#ffffff', backgroundColor: '#2e7d32', padding: { x: 10, y: 2 } }).setOrigin(0.5).setDepth(PROF.carros + 2);
  placa(MAPA.FONTE.x, MAPA.PRACA.y + 26, 'CENTRO DA CIDADE');
  placa(930, 940, 'PARQUE OESTE');
  placa(2700, 940, 'PARQUE LESTE');
  placa(2180, 1805, 'ESTACIONAMENTO');

  return { telhados, ondas };
}
