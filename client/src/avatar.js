// Desenho dos avatares (homem e mulher) em Canvas 2D.
// O mesmo desenho é usado no mundo (texturas do Phaser) e nas telas (retratos).
// Caixa base: 48 x 64, pés em (24, 60).

export const AV_L = 48;
export const AV_A = 64;

function escurecer(hex, f = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const CABELO = { m: '#3b2417', f: '#6a3a1e' };

// opcoes: { vista: 'frente'|'costas'|'lado', olhar: -1|0|1, passo: 0|1|2, morto: false }
export function desenharAvatar(ctx, av, opcoes = {}) {
  const vista = opcoes.vista || 'frente';
  const passo = opcoes.passo || 0;
  const olhar = opcoes.olhar || 0;
  const contorno = '#1d1a2b';
  const cabelo = CABELO[av.genero] || CABELO.m;
  const roupaBraco = av.casaco || av.camiseta;
  const bob = passo ? -1 : 0;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 2;
  ctx.strokeStyle = contorno;

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(24, 60, 13, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bob);

  // pernas (calça) + sapatos
  const pe1 = passo === 1 ? -3 : passo === 2 ? 2 : 0;
  const pe2 = passo === 1 ? 2 : passo === 2 ? -3 : 0;
  ctx.fillStyle = av.calca;
  rr(ctx, 16, 44, 7, 12 + pe1, 2); ctx.fill(); ctx.stroke();
  rr(ctx, 25, 44, 7, 12 + pe2, 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2b2b33';
  rr(ctx, 15, 54 + pe1, 9, 5, 2); ctx.fill(); ctx.stroke();
  rr(ctx, 24, 54 + pe2, 9, 5, 2); ctx.fill(); ctx.stroke();

  // cabelo comprido atrás (mulher)
  if (av.genero === 'f') {
    ctx.fillStyle = cabelo;
    rr(ctx, 10, 12, 28, vista === 'costas' ? 28 : 24, 9); ctx.fill(); ctx.stroke();
  }

  // braços
  const balanco = passo === 1 ? 2 : passo === 2 ? -2 : 0;
  ctx.fillStyle = roupaBraco;
  rr(ctx, 8, 29 + balanco, 7, 13, 3); ctx.fill(); ctx.stroke();
  rr(ctx, 33, 29 - balanco, 7, 13, 3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = av.pele;
  ctx.beginPath(); ctx.arc(11.5, 43 + balanco, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(36.5, 43 - balanco, 3.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // tronco (camiseta) + casaco
  ctx.fillStyle = av.camiseta;
  rr(ctx, 13, 27, 22, 20, 5); ctx.fill(); ctx.stroke();
  if (av.casaco) {
    ctx.fillStyle = av.casaco;
    if (vista === 'costas') {
      rr(ctx, 13, 27, 22, 20, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = escurecer(av.casaco, 0.8);
      ctx.fillRect(15, 28, 18, 4);
    } else {
      rr(ctx, 13, 27, 9, 20, 4); ctx.fill(); ctx.stroke();
      rr(ctx, 26, 27, 9, 20, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = escurecer(av.casaco, 0.7);
      ctx.fillRect(15, 41, 5, 2);
      ctx.fillRect(28, 41, 5, 2);
    }
  } else if (vista !== 'costas') {
    // gola
    ctx.strokeStyle = escurecer(av.camiseta, 0.6);
    ctx.beginPath(); ctx.arc(24, 27, 4, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.strokeStyle = contorno;
  }

  // cabeça
  ctx.fillStyle = av.pele;
  rr(ctx, 12, 5, 24, 24, 10); ctx.fill(); ctx.stroke();

  // cabelo
  ctx.fillStyle = cabelo;
  if (vista === 'costas') {
    rr(ctx, 11, 3, 26, av.genero === 'f' ? 26 : 20, 10); ctx.fill(); ctx.stroke();
    if (av.genero === 'f') {
      ctx.fillStyle = escurecer(cabelo, 0.8);
      ctx.fillRect(22, 10, 4, 14);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(11, 17);
    ctx.quadraticCurveTo(10, 3, 24, 3);
    ctx.quadraticCurveTo(38, 3, 37, 17);
    if (av.genero === 'f') {
      ctx.quadraticCurveTo(33, 9, 24 + olhar * 2, 10);
      ctx.quadraticCurveTo(15, 9, 11, 17);
    } else {
      ctx.lineTo(33, 12);
      ctx.lineTo(29, 13);
      ctx.lineTo(26, 10);
      ctx.lineTo(21, 12);
      ctx.lineTo(16, 11);
      ctx.lineTo(13, 15);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (av.genero === 'f') {
      // presilha
      ctx.fillStyle = av.casaco || av.camiseta;
      ctx.beginPath(); ctx.arc(33, 8, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }

    // rosto
    const ox = olhar * 3;
    if (opcoes.morto) {
      ctx.strokeStyle = contorno;
      ctx.lineWidth = 2;
      for (const ex of [19 + ox, 29 + ox]) {
        ctx.beginPath(); ctx.moveTo(ex - 2.5, 16.5); ctx.lineTo(ex + 2.5, 21.5); ctx.moveTo(ex + 2.5, 16.5); ctx.lineTo(ex - 2.5, 21.5); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(24 + ox, 25.5, 2.2, Math.PI, 0); ctx.stroke();
    } else {
      ctx.fillStyle = '#1d1a2b';
      ctx.beginPath(); ctx.ellipse(19 + ox, 19, 2.2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(29 + ox, 19, 2.2, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(19 + ox, 17, 1.2, 1.2);
      ctx.fillRect(29 + ox, 17, 1.2, 1.2);
      ctx.strokeStyle = escurecer(av.pele, 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(24 + ox, 23.5, 2.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
      if (av.genero === 'f') {
        ctx.fillStyle = 'rgba(255,110,120,0.35)';
        ctx.beginPath(); ctx.arc(16 + ox, 23, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(32 + ox, 23, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.restore();
}

// Canvas pronto com um quadro do avatar (escala opcional)
export function canvasAvatar(av, opcoes = {}, escala = 1) {
  const c = document.createElement('canvas');
  c.width = AV_L * escala;
  c.height = AV_A * escala;
  const ctx = c.getContext('2d');
  ctx.scale(escala, escala);
  desenharAvatar(ctx, av, opcoes);
  return c;
}

// Retrato (rosto + ombros) para telas e votação
export function retrato(av, tamanho = 64, opcoes = {}) {
  const c = document.createElement('canvas');
  c.width = tamanho;
  c.height = tamanho;
  const ctx = c.getContext('2d');
  const esc = tamanho / 40;
  ctx.scale(esc, esc);
  ctx.translate(-4, 0);
  desenharAvatar(ctx, av, { vista: 'frente', ...opcoes });
  c.className = 'retrato';
  return c;
}

// Corpo caído (desenho cômico, sem violência): deitado com estrelinhas
export function canvasCorpo(av) {
  const c = document.createElement('canvas');
  c.width = 72;
  c.height = 56;
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.translate(36, 30);
  ctx.rotate(-Math.PI / 2);
  ctx.translate(-24, -36);
  desenharAvatar(ctx, av, { vista: 'frente', morto: true });
  ctx.restore();
  ctx.fillStyle = '#ffd54f';
  ctx.strokeStyle = '#1d1a2b';
  ctx.lineWidth = 1.2;
  for (const [sx, sy] of [[10, 8], [22, 3], [16, 16]]) estrela(ctx, sx, sy, 4);
  return c;
}

function estrela(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
