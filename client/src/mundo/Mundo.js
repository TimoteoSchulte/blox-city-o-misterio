// =============================================================
// Cena do mundo (Phaser): mapa, personagens, movimento, visão,
// telhados, corpos, efeitos e detecção de interações.
// =============================================================
/* global Phaser */
import { MAPA, TUNEIS, predioEm } from '/shared/mapa.js';
import { REGRAS } from '/shared/config.js';
import { ALINHAMENTOS, podeUsarTuneis } from '/shared/papeis.js';
import { mover } from '/shared/colisao.js';
import { E, emitir } from '../estado.js';
import { socket } from '../rede.js';
import { desenharMapa, PROF } from './desenho.js';
import { desenharAvatar, AV_L, AV_A, canvasCorpo } from '../avatar.js';

const VISTAS = ['frente', 'costas', 'ladoE', 'ladoD'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const ESTACOES = new Map(MAPA.estacoes.map((e) => [e.id, e]));

function hashAvatar(av) {
  const s = JSON.stringify(av);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export class Mundo extends Phaser.Scene {
  constructor() {
    super('Mundo');
  }

  create() {
    this.desenho = desenharMapa(this);
    this.cameras.main.setBounds(0, 0, MAPA.LARGURA, MAPA.ALTURA);
    this.cameras.main.setBackgroundColor('#1b1830');
    this.sprites = new Map();
    this.corposSpr = new Map();
    this.marcas = [];
    this.ativo = false;
    this.ultimoEnvio = 0;
    this.acoes = {};
    this.criarEscuro();
    this.teclas = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false);
    this.input.keyboard.disableGlobalCapture();
    this.scale.on('resize', () => this.ajustarZoom());
    this.ajustarZoom();
    // visão geral do mapa enquanto não há partida
    this.cameras.main.centerOn(MAPA.FONTE.x, MAPA.FONTE.y);
    this.cameras.main.setZoom(0.45);
    emitir('mundo:pronto', this);
  }

  ajustarZoom() {
    if (!this.ativo) return;
    const w = this.scale.width, h = this.scale.height;
    this.cameras.main.setZoom(Phaser.Math.Clamp(Math.min(w / 1250, h / 700), 0.55, 1.4));
  }

  criarEscuro() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#05040c';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.globalCompositeOperation = 'destination-out';
    const gr = ctx.createRadialGradient(512, 512, 0, 512, 512, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.75, 'rgba(0,0,0,0.92)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.beginPath(); ctx.arc(512, 512, 64, 0, Math.PI * 2); ctx.fill();
    this.textures.addCanvas('escuro', c);
    this.escuro = this.add.image(0, 0, 'escuro').setDepth(PROF.escuro).setVisible(false);
  }

  // ---------------------------------------------------------- texturas
  texturaAvatar(av) {
    const h = hashAvatar(av);
    if (!this.textures.exists(`av_${h}_frente_0`)) {
      for (let v = 0; v < 4; v++) {
        for (let p = 0; p < 3; p++) {
          const c = document.createElement('canvas');
          c.width = AV_L; c.height = AV_A;
          const vista = VISTAS[v];
          desenharAvatar(c.getContext('2d'), av, {
            vista: vista === 'costas' ? 'costas' : 'frente',
            olhar: vista === 'ladoE' ? -1 : vista === 'ladoD' ? 1 : 0,
            passo: p,
          });
          this.textures.addCanvas(`av_${h}_${vista}_${p}`, c);
        }
      }
    }
    return h;
  }

  texturaCorpo(av) {
    const k = 'corpo_' + hashAvatar(av);
    if (!this.textures.exists(k)) this.textures.addCanvas(k, canvasCorpo(av));
    return k;
  }

  criarSprite(id) {
    const info = E.jogadores.get(id);
    if (!info) return null;
    const h = this.texturaAvatar(info.avatar);
    const spr = this.add.image(0, 0, `av_${h}_frente_0`).setOrigin(0.5, 60 / 64);
    const eu = id === E.eu?.id;
    let cor = '#ffffff';
    const aliado = E.aliados.get(id);
    if (aliado === 'impostor') cor = '#ff6b6b';
    if (aliado === 'neutro') cor = '#c9a7ff';
    const nome = this.add.text(0, 0, info.nome, {
      fontFamily: '"Baloo 2", sans-serif', fontSize: '15px', fontStyle: '800', color: cor, stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 1);
    const s = { id, spr, nome, h, x: 0, y: 0, alvo: null, vista: 0, andando: false, quadro: 0, tq: 0, eu, vivo: true, visto: 0 };
    this.sprites.set(id, s);
    return s;
  }

  // ---------------------------------------------------------- partida
  iniciarPartida(dados) {
    for (const s of this.sprites.values()) { s.spr.destroy(); s.nome.destroy(); }
    this.sprites.clear();
    this.limparCorpos();
    for (const m of this.marcas) m.destroy();
    this.marcas = [];
    this.eu = { x: dados.eu.x, y: dados.eu.y, vista: 0 };
    for (const p of dados.posicoes) {
      const s = this.criarSprite(p.id);
      if (s) { s.x = p.x; s.y = p.y; s.alvo = { x: p.x, y: p.y }; }
    }
    this.euSpr = this.sprites.get(E.eu.id);
    this.cameras.main.startFollow(this.euSpr.spr, true, 0.18, 0.18);
    this.ativo = true;
    this.ajustarZoom();
    this.criarMarcasTarefas();
  }

  encerrarPartida() {
    this.ativo = false;
    this.escuro.setVisible(false);
    this.cameras.main.stopFollow();
  }

  criarMarcasTarefas() {
    for (const m of this.marcas) m.destroy();
    this.marcas = [];
    for (const t of E.tarefas) {
      const est = ESTACOES.get(t.id);
      if (!est) continue;
      const m = this.add.text(est.x, est.y - 34, '!', {
        fontFamily: '"Baloo 2", sans-serif', fontSize: '30px', fontStyle: '800', color: '#ffd23f', stroke: '#1d1a2b', strokeThickness: 6,
      }).setOrigin(0.5).setDepth(PROF.jogadores + est.y + 40);
      m.tarefaId = t.id;
      this.tweens.add({ targets: m, y: est.y - 44, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.marcas.push(m);
    }
    this.atualizarMarcas();
  }

  atualizarMarcas() {
    for (const m of this.marcas) {
      const t = E.tarefas.find((k) => k.id === m.tarefaId);
      m.setVisible(!!t && !t.feita);
    }
  }

  // ---------------------------------------------------------- rede
  snapshot(d) {
    if (!this.ativo) return;
    const vistos = new Set();
    for (const [id, x, y, vista, andando, vivo] of d.j) {
      vistos.add(id);
      if (id === E.eu.id) continue;
      let s = this.sprites.get(id) || this.criarSprite(id);
      if (!s) continue;
      if (!s.spr.visible && s.alvo == null) { s.x = x; s.y = y; }
      if (s.alvo && Math.hypot(s.alvo.x - x, s.alvo.y - y) > 300) { s.x = x; s.y = y; }
      s.alvo = { x, y };
      s.vista = vista;
      s.andando = !!andando;
      s.vivo = !!vivo;
      s.visto = 1;
    }
    for (const s of this.sprites.values()) if (!s.eu && !vistos.has(s.id)) s.visto = 0;
  }

  teleporte(d) {
    this.eu.x = d.x;
    this.eu.y = d.y;
    E.tp = d.tp;
    if (this.euSpr) { this.euSpr.spr.setPosition(d.x, d.y); }
    this.cameras.main.centerOn(d.x, d.y);
  }

  definirCorpos(lista) {
    this.limparCorpos();
    for (const c of lista) {
      const info = E.jogadores.get(c.vitima);
      if (!info) continue;
      const img = this.add.image(c.x, c.y - 10, this.texturaCorpo(info.avatar)).setDepth(PROF.jogadores + c.y - 20);
      this.corposSpr.set(c.id, img);
    }
  }

  limparCorpos() {
    for (const img of this.corposSpr.values()) img.destroy();
    this.corposSpr.clear();
  }

  efeito(d) {
    if (!this.ativo) return;
    if (d.tipo === 'bueiro') {
      if (E.eu.vivo && dist(this.eu, d) > this.visaoAtual() + 40) return;
      for (let i = 0; i < 2; i++) {
        const c = this.add.circle(d.x, d.y, 10, 0x9e9e9e, 0.6).setDepth(PROF.jogadores + d.y + 5);
        this.tweens.add({ targets: c, radius: 46, alpha: 0, duration: 650, delay: i * 180, onComplete: () => c.destroy() });
      }
    }
  }

  visaoAtual() {
    const al = ALINHAMENTOS[E.eu.alinhamento];
    if (E.sabotagem === 'apagao' && !al.podeSabotar) return REGRAS.VISAO_APAGAO;
    return REGRAS.VISAO;
  }

  // ---------------------------------------------------------- loop
  update(time, delta) {
    if (!this.ativo || !this.euSpr) return;
    const dt = Math.min(delta / 1000, 0.05);
    const vivo = E.eu.vivo;

    // entrada (teclado WASD/setas + setinhas da tela)
    let vx = 0, vy = 0;
    const pode = !E.janela && !E.emReuniao && !E.tunel && !E.congelado;
    if (pode) {
      const k = this.teclas;
      if (k.A.isDown || k.LEFT.isDown || E.dpad.e) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown || E.dpad.d) vx += 1;
      if (k.W.isDown || k.UP.isDown || E.dpad.c) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown || E.dpad.b) vy += 1;
    }
    const andando = vx !== 0 || vy !== 0;
    if (andando) {
      const n = Math.hypot(vx, vy);
      vx /= n; vy /= n;
      const vel = REGRAS.VELOCIDADE * (vivo ? 1 : 1.15);
      const nx = this.eu.x + vx * vel * dt, ny = this.eu.y + vy * vel * dt;
      if (vivo) {
        const p = mover(this.eu.x, this.eu.y, nx, ny, REGRAS.RAIO_JOGADOR);
        this.eu.x = p.x; this.eu.y = p.y;
      } else {
        this.eu.x = Phaser.Math.Clamp(nx, 50, MAPA.LARGURA - 50);
        this.eu.y = Phaser.Math.Clamp(ny, 50, MAPA.ALTURA - 50);
      }
      this.eu.vista = Math.abs(vy) > Math.abs(vx) ? (vy < 0 ? 1 : 0) : (vx < 0 ? 2 : 3);
    }
    const s = this.euSpr;
    s.x = this.eu.x; s.y = this.eu.y; s.vista = this.eu.vista; s.andando = andando; s.vivo = vivo;

    // envio da posição (20x/s)
    if (time - this.ultimoEnvio > 50 && (andando || time - this.ultimoEnvio > 300)) {
      this.ultimoEnvio = time;
      socket.emit('jogo:mover', { x: Math.round(this.eu.x * 10) / 10, y: Math.round(this.eu.y * 10) / 10, dir: this.eu.vista, andando, tp: E.tp });
    }

    // interpolação dos outros
    const f = Math.min(1, dt * 12);
    for (const o of this.sprites.values()) {
      if (o.eu || !o.alvo) continue;
      o.x += (o.alvo.x - o.x) * f;
      o.y += (o.alvo.y - o.y) * f;
    }

    // telhados
    const meuPredio = predioEm(this.eu.x, this.eu.y);
    for (const t of this.desenho.telhados) {
      t.alvo = t.predio === meuPredio && !E.tunel ? 0 : 1;
      const a = t.g.alpha + (t.alvo - t.g.alpha) * Math.min(1, dt * 8);
      t.g.setAlpha(a); t.txt.setAlpha(a);
    }

    // visão
    const visao = this.visaoAtual();
    const verTudo = !vivo;
    if (verTudo || this.ejetando) this.escuro.setVisible(false);
    else {
      this.escuro.setVisible(true).setPosition(this.eu.x, this.eu.y - 20).setScale(visao / 64);
      this.escuro.setAlpha(E.tunel ? 0.97 : E.sabotagem === 'apagao' ? 0.94 : 0.62);
    }

    // desenha personagens
    for (const o of this.sprites.values()) {
      const visivel = o.eu ? !E.tunel : o.visto && (verTudo || dist(o, this.eu) <= visao + 30);
      o.spr.setVisible(!!visivel); o.nome.setVisible(!!visivel);
      if (!visivel) continue;
      o.tq += dt;
      if (o.andando) { if (o.tq > 0.14) { o.tq = 0; o.quadro = o.quadro === 1 ? 2 : 1; } } else o.quadro = 0;
      o.spr.setTexture(`av_${o.h}_${VISTAS[o.vista] || 'frente'}_${o.quadro}`);
      const flutua = o.vivo ? 0 : Math.sin(time / 300 + o.x) * 4 - 6;
      o.spr.setPosition(o.x, o.y + flutua).setDepth(PROF.jogadores + o.y).setAlpha(o.vivo ? 1 : 0.45);
      o.nome.setPosition(o.x, o.y - 62 + flutua).setDepth(PROF.jogadores + o.y + 1).setAlpha(o.vivo ? 1 : 0.6);
    }
    for (const [, img] of this.corposSpr) img.setVisible(verTudo || dist(img, this.eu) <= visao + 30);

    // interações (10x/s)
    if (!this.ultAcoes || time - this.ultAcoes > 100) {
      this.ultAcoes = time;
      this.acoes = this.calcularAcoes();
      emitir('acoes', this.acoes);
    }
  }

  calcularAcoes() {
    const eu = this.eu;
    const vivo = E.eu.vivo;
    const al = ALINHAMENTOS[E.eu.alinhamento];
    const r = { usar: null, matar: null, corpo: null };
    if (E.emReuniao || E.congelado) return r;
    if (E.tunel) return r;

    // USAR (prioridade: painel de energia > tarefa > bueiro > emergência)
    if (vivo && E.sabotagem === 'apagao' && dist(eu, MAPA.PAINEL_ENERGIA) <= REGRAS.ALCANCE_USAR) r.usar = { tipo: 'painel', rotulo: 'ENERGIA', ic: '⚡' };
    if (!r.usar) {
      let melhor = null;
      for (const t of E.tarefas) {
        if (t.feita) continue;
        const est = ESTACOES.get(t.id);
        const d = est ? dist(eu, est) : 1e9;
        if (d <= REGRAS.ALCANCE_USAR && (!melhor || d < melhor.d)) melhor = { d, t };
      }
      if (melhor && (vivo || !melhor.t.falsa)) r.usar = { tipo: 'tarefa', id: melhor.t.id, falsa: melhor.t.falsa, rotulo: 'USAR', ic: '✋' };
    }
    if (!r.usar && vivo && podeUsarTuneis(E.eu.alinhamento, E.eu.profissao)) {
      for (const [no, n] of Object.entries(TUNEIS.nos)) {
        if (dist(eu, n) <= REGRAS.ALCANCE_USAR) { r.usar = { tipo: 'bueiro', no, rotulo: 'BUEIRO', ic: '🕳️' }; break; }
      }
    }
    if (!r.usar && vivo && dist(eu, MAPA.FONTE) <= REGRAS.ALCANCE_EMERGENCIA) r.usar = { tipo: 'emergencia', rotulo: 'REUNIÃO', ic: '🔔' };

    if (!vivo) return r;

    // MATAR
    if (al.podeMatar) {
      let melhor = null;
      for (const o of this.sprites.values()) {
        if (o.eu || !o.visto || !o.vivo || !o.spr.visible) continue;
        const aliado = E.aliados.get(o.id);
        if (E.eu.alinhamento === 'impostor' && aliado === 'impostor') continue;
        if (al.neutro && aliado === 'neutro') continue;
        const d = dist(o, eu);
        if (d <= REGRAS.ALCANCE_MATAR && (!melhor || d < melhor.d)) melhor = { d, id: o.id };
      }
      r.matar = melhor ? melhor.id : null;
    }

    // RELATAR / PERÍCIA
    let melhorC = null;
    for (const c of E.corpos) {
      const d = dist(c, eu);
      if (d <= REGRAS.ALCANCE_RELATAR && (!melhorC || d < melhorC.d)) melhorC = { d, id: c.id };
    }
    r.corpo = melhorC ? melhorC.id : null;
    return r;
  }

  // ---------------------------------------------------------- ejeção
  animarEjecao(info, aoFim) {
    const F = MAPA.FONTE;
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.pan(F.x, F.y, 600, 'Sine.easeInOut');
    this.escuro.setVisible(false);
    this.ejetando = true;
    const h = this.texturaAvatar(info.avatar);
    const spr = this.add.image(F.x - 260, F.y + 120, `av_${h}_frente_0`).setOrigin(0.5, 0.6).setDepth(PROF.escuro - 1).setScale(1.3);
    const sombra = this.add.ellipse(F.x - 260, F.y + 140, 40, 12, 0x000000, 0.3).setDepth(PROF.escuro - 2);
    // pulinhos de nervoso, depois voa para a fonte
    this.tweens.chain({
      targets: spr,
      tweens: [
        { y: F.y + 100, duration: 160, yoyo: true, repeat: 2, delay: 600 },
        {
          x: F.x, duration: 1100, ease: 'Sine.easeInOut', angle: 720, scale: 0.9,
          onUpdate: (tw) => {
            const p = tw.progress;
            spr.y = F.y + 120 - Math.sin(p * Math.PI) * 260 - p * 120;
            sombra.x = spr.x;
          },
        },
      ],
      onComplete: () => {
        sombra.destroy();
        spr.destroy();
        this.respingo(F.x, F.y);
        this.time.delayedCall(1100, () => {
          this.ejetando = false;
          if (this.euSpr) cam.startFollow(this.euSpr.spr, true, 0.18, 0.18);
          aoFim && aoFim();
        });
      },
    });
  }

  respingo(x, y) {
    for (let i = 0; i < 3; i++) {
      const c = this.add.circle(x, y, 20, 0xffffff, 0).setStrokeStyle(6, 0xe1f5fe, 1).setDepth(PROF.escuro - 1);
      this.tweens.add({ targets: c, radius: 110, alpha: 0, duration: 900, delay: i * 150, onComplete: () => c.destroy() });
    }
    for (let i = 0; i < 18; i++) {
      const g = this.add.circle(x, y, 6 + Math.random() * 6, 0x81d4fa, 1).setDepth(PROF.escuro - 1);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 110;
      this.tweens.add({ targets: g, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 40, alpha: 0, duration: 800, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
    }
    // patinho de borracha surge na água
    const pato = this.add.text(x + 30, y + 10, '🦆', { fontSize: '40px' }).setOrigin(0.5).setDepth(PROF.escuro - 1).setAlpha(0);
    this.tweens.add({ targets: pato, alpha: 1, y: y - 10, duration: 500, delay: 500, yoyo: true, hold: 600, onComplete: () => pato.destroy() });
  }
}
