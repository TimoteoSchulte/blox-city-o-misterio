// =============================================================
// MAPA DE BLOX CITY (dados compartilhados entre servidor e cliente)
//
// Visão geral (3600 x 2400 px):
//   - Anel de ruas em volta da cidade + Avenida Central (vertical).
//   - Quarteirão OESTE: Usina Elétrica, Casa Amarela, Parque Oeste,
//     Lava-rápido e Casa Rosa.
//   - Quarteirão LESTE: Loja, Casa Azul, Parque Leste, Estacionamento
//     e Casa Verde.
//   - Centro da Cidade (praça com a fonte) no meio da avenida.
//
// Tudo que colide está em `obstaculos` (retângulos) e `circulos`.
// O resto é visual (pisos, ruas, decoração) e é desenhado pelo cliente.
// =============================================================

export const LARGURA = 3600;
export const ALTURA = 2400;
const T = 14; // espessura das paredes

const obstaculos = []; // {x,y,w,h,tipo?}
const circulos = [];   // {x,y,r,tipo?}
const decor = [];      // visuais sem colisão
const moveis = [];     // móveis (alguns colidem)
const predios = [];    // prédios com telhado
const estacoes = [];   // pontos de tarefa
const carros = [];     // veículos (colidem e servem ao Mecânico)
const pisos = [];      // pisos internos (cômodos)

// ---------- utilidades de construção ----------
function ret(x, y, w, h, tipo = 'parede') {
  obstaculos.push({ x, y, w, h, tipo });
}

// Parede horizontal de x1 a x2 na altura y, com vãos [a,b] (coordenadas absolutas)
function paredeH(x1, x2, y, vaos = []) {
  let ini = x1;
  const ord = [...vaos].sort((a, b) => a[0] - b[0]);
  for (const [a, b] of ord) {
    if (a > ini) ret(ini - T / 2, y - T / 2, a - ini + T / 2, T);
    ini = b;
  }
  if (x2 > ini) ret(ini, y - T / 2, x2 - ini + T / 2, T);
}

function paredeV(x, y1, y2, vaos = []) {
  let ini = y1;
  const ord = [...vaos].sort((a, b) => a[0] - b[0]);
  for (const [a, b] of ord) {
    if (a > ini) ret(x - T / 2, ini - T / 2, T, a - ini + T / 2);
    ini = b;
  }
  if (y2 > ini) ret(x - T / 2, ini, T, y2 - ini + T / 2);
}

function movel(tipo, x, y, w, h, colide = true, extra = {}) {
  moveis.push({ tipo, x, y, w, h, ...extra });
  if (colide) ret(x, y, w, h, 'movel');
}

function estacao(id, tipo, x, y, local) {
  estacoes.push({ id, tipo, x, y, local });
}

function carro(x, y, w, h, cor, extra = {}) {
  const c = { id: 'carro' + carros.length, x, y, w, h, cor, ...extra };
  carros.push(c);
  ret(x, y, w, h, 'carro');
  return c;
}

function arvore(x, y, r = 34) {
  circulos.push({ x, y, r: 16, tipo: 'arvore' });
  decor.push({ tipo: 'arvore', x, y, r });
}

// ---------- limites do mapa ----------
const BORDA = 40;
ret(-300, -300, LARGURA + 600, 300 + BORDA, 'limite');
ret(-300, ALTURA - BORDA, LARGURA + 600, 300 + BORDA, 'limite');
ret(-300, 0, 300 + BORDA, ALTURA, 'limite');
ret(LARGURA - BORDA, 0, 300 + BORDA, ALTURA, 'limite');

// ---------- ruas e calçadas (visual) ----------
// Ruas: anel externo + Avenida Central
export const RUAS = [
  { x: 140, y: 140, w: 3320, h: 180, sentido: 'h', nome: 'Rua Norte' },
  { x: 140, y: 2080, w: 3320, h: 180, sentido: 'h', nome: 'Rua Sul' },
  { x: 140, y: 140, w: 180, h: 2120, sentido: 'v', nome: 'Rua Oeste' },
  { x: 3280, y: 140, w: 180, h: 2120, sentido: 'v', nome: 'Rua Leste' },
  { x: 1700, y: 140, w: 200, h: 760, sentido: 'v', nome: 'Avenida Central' },
  { x: 1700, y: 1500, w: 200, h: 760, sentido: 'v', nome: 'Avenida Central' },
];

export const QUARTEIROES = [
  { x: 320, y: 320, w: 1380, h: 1760, nome: 'Quarteirão Oeste' },
  { x: 1900, y: 320, w: 1380, h: 1760, nome: 'Quarteirão Leste' },
];

// Faixas de pedestre (visual): {x,y,w,h,sentido}
export const FAIXAS = [
  { x: 1700, y: 330, w: 200, h: 40, sentido: 'h' },
  { x: 1700, y: 2030, w: 200, h: 40, sentido: 'h' },
  { x: 1650, y: 140, w: 40, h: 180, sentido: 'v' },
  { x: 1910, y: 140, w: 40, h: 180, sentido: 'v' },
  { x: 1650, y: 2080, w: 40, h: 180, sentido: 'v' },
  { x: 1910, y: 2080, w: 40, h: 180, sentido: 'v' },
  { x: 140, y: 1180, w: 180, h: 40, sentido: 'v2' },
  { x: 3280, y: 1180, w: 180, h: 40, sentido: 'v2' },
  { x: 330, y: 140, w: 40, h: 180, sentido: 'v' },
  { x: 3230, y: 140, w: 40, h: 180, sentido: 'v' },
];

// ---------- CENTRO DA CIDADE (praça + fonte) ----------
export const PRACA = { x: 1520, y: 900, w: 560, h: 600 };
export const FONTE = { x: 1800, y: 1200, r: 125 };
circulos.push({ x: FONTE.x, y: FONTE.y, r: FONTE.r + 12, tipo: 'fonte' });
// bancos da praça
for (const [bx, by] of [[1560, 960], [1960, 960], [1560, 1410], [1960, 1410]]) {
  movel('banco', bx, by, 80, 26);
}
arvore(1590, 1040, 30);
arvore(2010, 1360, 30);

// Posições ao redor da fonte (início da partida e reuniões)
export function posicoesFonte(qtd) {
  const lista = [];
  for (let i = 0; i < qtd; i++) {
    const ang = (i / Math.max(1, qtd)) * Math.PI * 2 - Math.PI / 2;
    lista.push({ x: Math.round(FONTE.x + Math.cos(ang) * 205), y: Math.round(FONTE.y + Math.sin(ang) * 205) });
  }
  return lista;
}

// ---------- USINA ELÉTRICA ----------
{
  // Três cômodos: Sala dos Geradores (oeste), Sala de Controle (nordeste)
  // e Depósito de Cabos (sudeste). Entradas: porta sul (geradores) e porta leste (depósito).
  const x = 360, y = 360, w = 720, h = 500;
  paredeH(x, x + w, y);
  paredeH(x, x + w, y + h, [[520, 630]]);          // porta principal (sul)
  paredeV(x, y, y + h);
  paredeV(x + w, y, y + h, [[650, 740]]);          // porta lateral (leste)
  paredeV(700, y, y + h, [[430, 515], [740, 825]]); // geradores <-> controle / depósito
  paredeH(700, x + w, 600, [[850, 940]]);          // controle <-> depósito
  pisos.push({ x, y, w: 340, h, piso: 'metal', rotulo: 'SALA DOS GERADORES' });
  pisos.push({ x: 700, y, w: 380, h: 240, piso: 'controle', rotulo: 'SALA DE CONTROLE' });
  pisos.push({ x: 700, y: 600, w: 380, h: 260, piso: 'estoque', rotulo: 'DEPÓSITO DE CABOS' });
  predios.push({ id: 'usina', nome: 'Usina Elétrica', x, y, w, h, telhado: '#5d6b7a', placa: '#ffd54f' });
  // Sala dos Geradores
  movel('gerador', 380, 430, 125, 90);
  movel('gerador', 380, 625, 125, 90);
  movel('transformador', 565, 600, 110, 100);
  movel('faixa_perigo', 372, 525, 140, 18, false);
  movel('faixa_perigo', 372, 720, 140, 18, false);
  movel('cabos_chao', 505, 470, 190, 280, false);
  // Sala de Controle
  movel('painel_controle', 730, 372, 330, 22);
  movel('mesa_monitores', 790, 470, 150, 50);
  movel('cadeira', 845, 528, 30, 30, false);
  movel('quadro_aviso', 1050, 400, 22, 50, false);
  // Depósito de Cabos
  movel('bobina', 730, 630, 64, 64);
  movel('bobina', 805, 630, 64, 64);
  movel('caixas', 960, 625, 100, 55);
  movel('caixas', 720, 790, 110, 55);
  movel('prateleira_ferramentas', 1050, 760, 22, 90);
  estacao('usina_fios', 'conectar_fios', 600, 400, 'Usina Elétrica');
  estacao('usina_disjuntores', 'religar_disjuntores', 960, 830, 'Usina Elétrica');
  estacao('usina_medidor', 'calibrar_medidor', 1050, 520, 'Usina Elétrica');
}
// Painel de energia (conserto manual do apagão) — na Sala de Controle
export const PAINEL_ENERGIA = { id: 'painel_energia', x: 960, y: 410, local: 'Usina Elétrica' };

// ---------- LOJA ----------
{
  const x = 1960, y = 360, w = 740, h = 500;
  paredeH(x, x + w, y);
  paredeH(x, x + w, y + h, [[2250, 2410]]);
  paredeV(x, y, y + h);
  paredeV(x + w, y, y + h);
  paredeV(2460, y, 580, [[450, 530]]);
  paredeH(2460, x + w, 580);
  pisos.push({ x, y, w, h, piso: 'loja' });
  pisos.push({ x: 2460, y, w: 240, h: 220, piso: 'estoque' });
  predios.push({ id: 'loja', nome: 'Loja', x, y, w, h, telhado: '#c0392b', placa: '#ffffff' });
  movel('prateleira', 2010, 450, 340, 36);
  movel('prateleira', 2010, 560, 340, 36);
  movel('prateleira', 2010, 680, 340, 36);
  movel('balcao', 2500, 680, 160, 50);
  movel('caixas', 2560, 400, 110, 60);
  movel('caixas', 2490, 380, 50, 50);
  estacao('loja_prateleiras', 'repor_prateleiras', 2180, 636, 'Loja');
  estacao('loja_caixa', 'caixa_registradora', 2580, 760, 'Loja');
  estacao('loja_estoque', 'conectar_fios', 2620, 520, 'Loja');
}

// ---------- LAVA-RÁPIDO ----------
{
  const x = 360, y = 1560, w = 700, h = 480;
  // lado norte aberto (entrada dos carros)
  paredeH(x, x + w, y + h);
  paredeV(x, y, y + h);
  paredeV(x + w, y, y + h);
  paredeV(600, 1640, 1940);
  // escritório
  paredeH(840, x + w, 1820, [[900, 980]]);
  paredeV(840, 1820, y + h);
  pisos.push({ x, y, w, h, piso: 'lava' });
  pisos.push({ x: 840, y: 1820, w: 220, h: 220, piso: 'escritorio' });
  predios.push({ id: 'lava', nome: 'Lava-rápido', x, y, w, h, telhado: '#1e88e5', placa: '#ffffff', aberto: 'n' });
  carro(442, 1680, 90, 160, '#e53935', { sujo: true });
  carro(675, 1680, 90, 160, '#8e24aa', { sujo: true });
  movel('mangueira', 375, 1600, 30, 30, false);
  movel('balde', 560, 1990, 30, 30);
  movel('mesa', 900, 1920, 90, 50);
  estacao('lava_box1', 'lavar_carro', 487, 1872, 'Lava-rápido');
  estacao('lava_box2', 'lavar_carro', 720, 1872, 'Lava-rápido');
  estacao('lava_escritorio', 'caixa_registradora', 1010, 1960, 'Lava-rápido');
}

// ---------- ESTACIONAMENTO ----------
{
  pisos.push({ x: 1960, y: 1560, w: 740, h: 480, piso: 'estacionamento' });
  const cores = ['#43a047', '#fdd835', '#90a4ae', '#fb8c00', '#3949ab', '#d81b60', '#6d4c41', '#00897b'];
  [2000, 2120, 2240, 2480, 2600].forEach((cx, i) => carro(cx, 1600, 90, 150, cores[i]));
  carro(2360, 1600, 90, 150, '#78909c', { furado: true });
  [2060, 2300, 2540].forEach((cx, i) => carro(cx, 1860, 90, 150, cores[5 + i]));
  estacao('estac_pneu', 'trocar_pneu', 2405, 1792, 'Estacionamento');
}

// ---------- CASAS (4 plantas diferentes) ----------
// Coordenadas locais: 0..460 x 0..420
const CASA_W = 460, CASA_H = 420;
const PLANTAS = {
  // Casa 1: porta ao sul. Quarto+Sala à esquerda, Banheiro+Cozinha à direita
  p1: {
    porta: { lado: 's', de: 80, ate: 160 },
    comodos: [
      { nome: 'Quarto', x: 0, y: 0, w: 230, h: 200, piso: 'madeira' },
      { nome: 'Sala', x: 0, y: 200, w: 230, h: 220, piso: 'madeira2' },
      { nome: 'Banheiro', x: 230, y: 0, w: 230, h: 150, piso: 'azulejo' },
      { nome: 'Cozinha', x: 230, y: 150, w: 230, h: 270, piso: 'ceramica' },
    ],
    paredes: [
      ['h', 0, 230, 200, [[140, 210]]],
      ['v', 230, 0, 420, [[50, 120], [260, 340]]],
      ['h', 230, 460, 150, []],
    ],
    moveis: [
      ['cama', 20, 20, 90, 130], ['guarda_roupa', 150, 15, 70, 34], ['tapete', 60, 260, 110, 90, false],
      ['sofa', 15, 250, 46, 120], ['tv', 60, 209, 70, 18], ['planta', 190, 385, 26, 26, false],
      ['pia', 260, 15, 60, 34], ['vaso', 400, 18, 40, 46], ['box', 245, 85, 70, 55],
      ['bancada', 420, 170, 30, 200], ['mesa', 290, 250, 70, 50], ['geladeira', 250, 365, 56, 45],
    ],
    tarefas: [['arrumar_cama', 132, 90], ['lavar_louca', 398, 250], ['desentupir_vaso', 420, 96]],
  },
  // Casa 2: porta ao norte. Sala+Banheiro em cima, Cozinha+Quarto embaixo
  p4: {
    porta: { lado: 'n', de: 100, ate: 180 },
    comodos: [
      { nome: 'Sala', x: 0, y: 0, w: 300, h: 220, piso: 'madeira2' },
      { nome: 'Banheiro', x: 300, y: 0, w: 160, h: 220, piso: 'azulejo' },
      { nome: 'Cozinha', x: 0, y: 220, w: 200, h: 200, piso: 'ceramica' },
      { nome: 'Quarto', x: 200, y: 220, w: 260, h: 200, piso: 'madeira' },
    ],
    paredes: [
      ['h', 0, 460, 220, [[60, 130], [220, 290]]],
      ['v', 300, 0, 220, [[100, 190]]],
      ['v', 200, 220, 420, []],
    ],
    moveis: [
      ['sofa', 15, 60, 46, 130], ['tv', 264, 20, 26, 76], ['planta', 225, 160, 30, 30, false], ['tapete', 90, 80, 120, 90, false],
      ['vaso', 405, 18, 40, 46], ['banheira', 360, 160, 85, 50], ['pia', 315, 15, 50, 32],
      ['bancada', 15, 240, 30, 160], ['geladeira', 140, 368, 50, 42], ['mesa', 110, 300, 60, 50],
      ['cama', 365, 285, 85, 120], ['guarda_roupa', 215, 365, 60, 42],
    ],
    tarefas: [['regar_plantas', 232, 135], ['lavar_louca', 66, 300], ['desentupir_vaso', 425, 96]],
  },
  // Casa 3: porta ao sul (à direita). Banheiro+Quarto em cima, Cozinha+Sala embaixo
  p2: {
    porta: { lado: 's', de: 330, ate: 410 },
    comodos: [
      { nome: 'Banheiro', x: 0, y: 0, w: 160, h: 190, piso: 'azulejo' },
      { nome: 'Quarto', x: 160, y: 0, w: 300, h: 190, piso: 'madeira' },
      { nome: 'Cozinha', x: 0, y: 190, w: 250, h: 230, piso: 'ceramica' },
      { nome: 'Sala', x: 250, y: 190, w: 210, h: 230, piso: 'madeira2' },
    ],
    paredes: [
      ['h', 0, 460, 190, [[60, 130], [300, 370]]],
      ['v', 160, 0, 190, []],
      ['v', 250, 190, 420, [[270, 340]]],
    ],
    moveis: [
      ['vaso', 20, 18, 40, 46], ['pia', 95, 15, 50, 32], ['box', 105, 60, 45, 45],
      ['cama', 360, 18, 85, 130], ['escrivaninha', 180, 15, 90, 38], ['tapete', 220, 80, 110, 70, false],
      ['bancada', 15, 260, 30, 140], ['geladeira', 60, 368, 56, 42], ['mesa', 130, 290, 70, 60],
      ['sofa', 410, 225, 40, 120], ['tv', 262, 215, 22, 70], ['planta', 420, 380, 26, 26, false],
    ],
    tarefas: [['desentupir_vaso', 40, 96], ['arrumar_cama', 338, 85], ['consertar_tv', 302, 252]],
  },
  // Casa 4: porta a oeste. Sala ocupa a lateral; Quarto/Banheiro/Cozinha empilhados
  p3: {
    porta: { lado: 'o', de: 170, ate: 250 },
    comodos: [
      { nome: 'Sala', x: 0, y: 0, w: 200, h: 420, piso: 'madeira2' },
      { nome: 'Quarto', x: 200, y: 0, w: 260, h: 170, piso: 'madeira' },
      { nome: 'Banheiro', x: 200, y: 170, w: 260, h: 110, piso: 'azulejo' },
      { nome: 'Cozinha', x: 200, y: 280, w: 260, h: 140, piso: 'ceramica' },
    ],
    paredes: [
      ['v', 200, 0, 420, [[60, 130], [300, 370]]],
      ['h', 200, 460, 170, [[290, 360]]],
      ['h', 200, 460, 280, []],
    ],
    moveis: [
      ['sofa', 60, 15, 120, 44], ['tv', 60, 385, 110, 22], ['planta', 18, 300, 28, 28, false], ['tapete', 50, 120, 110, 140, false],
      ['cama', 370, 15, 80, 120], ['guarda_roupa', 215, 15, 70, 36],
      ['vaso', 215, 205, 40, 46], ['pia', 395, 180, 50, 30],
      ['bancada', 215, 383, 230, 28], ['geladeira', 405, 290, 44, 50], ['mesa', 270, 300, 60, 40],
    ],
    tarefas: [['regar_plantas', 45, 335], ['consertar_tv', 115, 352], ['desentupir_vaso', 278, 235]],
  },
};

function construirCasa(id, nome, ox, oy, plantaId, telhado) {
  const p = PLANTAS[plantaId];
  const W = CASA_W, H = CASA_H;
  const vao = (lado) => (p.porta.lado === lado ? [[p.porta.de + (lado === 'n' || lado === 's' ? ox : oy), p.porta.ate + (lado === 'n' || lado === 's' ? ox : oy)]] : []);
  paredeH(ox, ox + W, oy, vao('n'));
  paredeH(ox, ox + W, oy + H, vao('s'));
  paredeV(ox, oy, oy + H, vao('o'));
  paredeV(ox + W, oy, oy + H, vao('l'));
  for (const [dir, a, b, c, vaos] of p.paredes) {
    if (dir === 'h') paredeH(ox + a, ox + b, oy + c, vaos.map(([u, v]) => [ox + u, ox + v]));
    else paredeV(ox + a, oy + b, oy + c, vaos.map(([u, v]) => [oy + u, oy + v]));
  }
  for (const c of p.comodos) pisos.push({ x: ox + c.x, y: oy + c.y, w: c.w, h: c.h, piso: c.piso, comodo: c.nome });
  for (const [tipo, x, y, w, h, colide = true] of p.moveis) movel(tipo, ox + x, oy + y, w, h, colide);
  p.tarefas.forEach(([tipo, x, y], i) => estacao(`${id}_${tipo}`, tipo, ox + x, oy + y, nome));
  predios.push({ id, nome, x: ox, y: oy, w: W, h: H, telhado, placa: '#ffffff', casa: true, porta: p.porta });
}

construirCasa('casa_amarela', 'Casa Amarela', 1160, 360, 'p1', '#f9a825');
construirCasa('casa_rosa', 'Casa Rosa', 1160, 1620, 'p4', '#ec407a');
construirCasa('casa_azul', 'Casa Azul', 2780, 360, 'p2', '#1565c0');
construirCasa('casa_verde', 'Casa Verde', 2780, 1620, 'p3', '#2e7d32');

// ---------- PARQUES ----------
export const PARQUES = [
  { x: 360, y: 900, w: 1140, h: 620, nome: 'Parque Oeste' },
  { x: 2100, y: 900, w: 1140, h: 620, nome: 'Parque Leste' },
];
// Parque Oeste: lago, árvores, canteiro
circulos.push({ x: 720, y: 1210, r: 120, tipo: 'lago' });
decor.push({ tipo: 'lago', x: 720, y: 1210, r: 120 });
decor.push({ tipo: 'canteiro', x: 1000, y: 960, w: 160, h: 50 });
estacao('parque_oeste_jardim', 'regar_plantas', 1080, 1030, 'Parque Oeste');
for (const [ax, ay] of [[430, 960], [430, 1450], [560, 1000], [900, 1420], [1100, 1180], [1300, 1000], [1380, 1400], [1240, 1300], [500, 1300], [960, 1140]]) arvore(ax, ay);
movel('banco', 860, 1000, 80, 26);
movel('banco', 1150, 1460, 80, 26);
movel('banco', 560, 1440, 26, 80);
// Parque Leste: parquinho, árvores, canteiro
decor.push({ tipo: 'areia', x: 2560, y: 1060, w: 360, h: 280 });
movel('escorregador', 2600, 1100, 50, 120);
movel('balanco', 2760, 1110, 120, 40);
movel('gangorra', 2760, 1250, 110, 24);
decor.push({ tipo: 'canteiro', x: 2380, y: 960, w: 160, h: 50 });
estacao('parque_leste_jardim', 'regar_plantas', 2460, 1030, 'Parque Leste');
for (const [ax, ay] of [[2170, 960], [2200, 1440], [2350, 1200], [2460, 1420], [3060, 960], [3180, 1180], [3100, 1440], [2980, 1300], [2200, 1180]]) arvore(ax, ay);
movel('banco', 3000, 1000, 80, 26);
movel('banco', 2300, 1300, 26, 80);

// ---------- CARROS NAS RUAS ----------
for (const [cx, cy, cor] of [[600, 150, '#ef6c00'], [1350, 230, '#5e35b1'], [2300, 150, '#00838f'], [3000, 230, '#c62828'],
  [800, 2170, '#2e7d32'], [2200, 2090, '#f9a825'], [2900, 2170, '#455a64']]) {
  carro(cx, cy, 160, 84, cor);
}
for (const [cx, cy, cor] of [[150, 1000, '#d81b60'], [3370, 700, '#1565c0'], [3290, 1700, '#6d4c41'], [1705, 500, '#7cb342'], [1810, 1850, '#e53935']]) {
  carro(cx, cy, 84, 160, cor);
}

// ---------- ÁRVORES NA BORDA ----------
for (let x = 120; x < LARGURA - 80; x += 190) {
  arvore(x, 85, 32);
  arvore(x + 90, ALTURA - 85, 32);
}
for (let y = 300; y < ALTURA - 250; y += 210) {
  arvore(85, y, 32);
  arvore(LARGURA - 85, y + 100, 32);
}
// postes e lixeiras (decoração)
for (const [px, py] of [[340, 880], [1680, 880], [1920, 880], [3260, 880], [340, 1540], [1680, 1540], [1920, 1540], [3260, 1540]]) {
  decor.push({ tipo: 'poste', x: px, y: py });
}
for (const [lx, ly] of [[1500, 870], [2100, 1530], [1150, 880], [2760, 1540]]) {
  movel('lixeira', lx, ly, 26, 26);
}

// ---------- REDE DE TÚNEIS (bueiros) ----------
// Cada nó tem um bueiro na superfície. As conexões NÃO são todas entre si:
// o jogador precisa navegar pela rede de verdade.
export const TUNEIS = {
  nos: {
    A1: { nome: 'Usina Elétrica', x: 1120, y: 620, ui: { x: 140, y: 60 } },
    A2: { nome: 'Casa Amarela', x: 1420, y: 845, ui: { x: 300, y: 70 } },
    A3: { nome: 'Parque Oeste', x: 980, y: 1340, ui: { x: 110, y: 200 } },
    A4: { nome: 'Lava-rápido', x: 1110, y: 1690, ui: { x: 150, y: 330 } },
    C1: { nome: 'Praça Norte', x: 1800, y: 845, ui: { x: 440, y: 120 } },
    C2: { nome: 'Avenida Sul', x: 1800, y: 2170, ui: { x: 440, y: 360 } },
    B1: { nome: 'Loja', x: 2740, y: 620, ui: { x: 590, y: 60 } },
    B2: { nome: 'Casa Azul', x: 3000, y: 848, ui: { x: 760, y: 90 } },
    B3: { nome: 'Estacionamento', x: 2330, y: 1540, ui: { x: 600, y: 300 } },
    B4: { nome: 'Casa Verde', x: 2740, y: 1800, ui: { x: 770, y: 330 } },
  },
  conexoes: [
    ['A1', 'A2'], ['A1', 'A3'], ['A2', 'C1'], ['A3', 'A4'], ['A4', 'C2'],
    ['C1', 'C2'], ['C1', 'B1'], ['B1', 'B2'], ['B2', 'B4'], ['B4', 'B3'], ['B3', 'C2'],
  ],
};

export function vizinhosTunel(no) {
  const v = [];
  for (const [a, b] of TUNEIS.conexoes) {
    if (a === no) v.push(b);
    else if (b === no) v.push(a);
  }
  return v;
}

// ---------- ÁREAS NOMEADAS (para alertas e pistas) ----------
const AREAS = [
  ...predios.map((p) => ({ nome: p.nome, x: p.x, y: p.y, w: p.w, h: p.h })),
  { nome: 'Estacionamento', x: 1960, y: 1560, w: 740, h: 480 },
  { nome: 'Centro da Cidade', x: PRACA.x, y: PRACA.y, w: PRACA.w, h: PRACA.h },
  ...PARQUES,
  ...RUAS,
];

export function nomeLocal(x, y) {
  for (const a of AREAS) {
    if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h) return a.nome;
  }
  return 'Calçadas de BLOX City';
}

export function predioEm(x, y) {
  for (const p of predios) {
    if (x > p.x && x < p.x + p.w && y > p.y && y < p.y + p.h) return p;
  }
  return null;
}

export const MAPA = {
  LARGURA, ALTURA, obstaculos, circulos, decor, moveis, predios, estacoes, carros, pisos,
  RUAS, QUARTEIROES, FAIXAS, PRACA, FONTE, PARQUES, TUNEIS, PAINEL_ENERGIA,
};
