// =============================================================
// PARTIDA — lógica autoritativa de uma partida de BLOX City.
// O servidor decide: papéis, profissões, movimento válido, eliminações,
// tarefas, sabotagens, túneis, habilidades, reuniões, votos e vitória.
// Cada cliente só recebe o que o próprio papel pode saber.
// =============================================================
import { REGRAS, maxImpostores, qtdNeutrosPara } from '../shared/config.js';
import { ALINHAMENTOS, PROFISSOES, vagasProfissoes, podeUsarTuneis, textoEjecao } from '../shared/papeis.js';
import { MAPA, TUNEIS, vizinhosTunel, posicoesFonte, nomeLocal } from '../shared/mapa.js';
import { TIPOS_TAREFA, TAREFAS_DE_PROFISSAO, SABOTAGENS } from '../shared/tarefas.js';
import { colide } from '../shared/colisao.js';
import { avaliarVitoria } from './vitoria.js';

const agora = () => Date.now() / 1000;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const embaralhar = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [a[i], a[k]] = [a[k], a[i]];
  }
  return a;
};
const sortearInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const restante = (t) => Math.max(0, Math.ceil(t - agora()));

export class Partida {
  constructor(sala, participantes, io, papeisTeste = null) {
    this.sala = sala;
    this.io = io;
    this.inicio = agora();
    this.fase = 'jogando'; // jogando | reuniao | ejecao | fim
    this.corpos = [];
    this.sabotagem = null;
    this.prontoSabotagem = this.inicio + REGRAS.RECARGA_SABOTAGEM_INICIAL;
    this.historico = [];
    this.reuniao = null;
    this.proxCorpo = 1;
    this.jogadores = new Map();
    this.papeisTeste = papeisTeste;

    this.sortear(participantes);
    this.ameacasIniciais = [...this.jogadores.values()].filter((j) => ALINHAMENTOS[j.alinhamento].time !== 'inocentes').length;
    this.adversariosIniciais = [...this.jogadores.values()].filter((j) => ALINHAMENTOS[j.alinhamento].time !== 'impostores').length;

    this.timer = setInterval(() => this.tick(), 50);
    this.contTick = 0;
  }

  // ---------------------------------------------------------- sorteio
  sortear(participantes) {
    const lista = embaralhar(participantes);
    const n = lista.length;
    const qtdNeutros = Math.min(qtdNeutrosPara(n), n);
    // sempre sobra pelo menos 1 tripulante (inocente)
    const qtdImp = sortearInt(0, Math.min(maxImpostores(n), Math.max(0, n - qtdNeutros - 1)));

    let neutros;
    if (qtdNeutros >= 2) {
      // 7+ jogadores: um aliado dos inocentes e um dos impostores; o Encrenqueiro pode substituir um deles
      neutros = ['neutro_inocente', 'neutro_impostor'];
      if (Math.random() < REGRAS.CHANCE_ENCRENQUEIRO) neutros[sortearInt(0, 1)] = 'encrenqueiro';
    } else if (n <= 2) {
      // partida de 2: o neutro precisa poder eliminar o tripulante
      neutros = ['neutro_impostor'];
    } else {
      // até 6 jogadores: 1 neutro (Encrenqueiro ou aliado de um dos lados)
      neutros = [Math.random() < REGRAS.CHANCE_ENCRENQUEIRO ? 'encrenqueiro' : sortearInt(0, 1) ? 'neutro_impostor' : 'neutro_inocente'];
    }
    const alinhamentos = [];
    for (let i = 0; i < qtdImp; i++) alinhamentos.push('impostor');
    for (let i = 0; i < qtdNeutros; i++) alinhamentos.push(neutros[i]);
    while (alinhamentos.length < n) alinhamentos.push('inocente');

    const vagas = vagasProfissoes(n);
    while (vagas.length < n) vagas.push('civil');
    let profissoes = embaralhar(vagas).slice(0, n);
    let ordem = lista;
    if (this.papeisTeste) {
      // modo de teste do servidor: papéis fixos pela ordem de entrada
      ordem = participantes;
      ordem.forEach((_, i) => {
        const f = this.papeisTeste[i];
        if (f && ALINHAMENTOS[f.alinhamento]) alinhamentos[i] = f.alinhamento;
        if (f && PROFISSOES[f.profissao]) profissoes[i] = f.profissao;
      });
    }

    const pos = posicoesFonte(n);
    ordem.forEach((p, i) => {
      const al = alinhamentos[i];
      const neutro = ALINHAMENTOS[al].neutro;
      const j = {
        id: p.id,
        nome: p.nome,
        avatar: p.avatar,
        alinhamento: al,
        profissao: profissoes[i],
        vivo: true,
        desconectado: false,
        x: pos[i].x,
        y: pos[i].y,
        dir: 0,
        andando: false,
        ultimoMov: agora(),
        tp: 1,
        tunel: null,
        tunelAnterior: null,
        viagem: null,
        tarefaAberta: null,
        painelDesde: null,
        prontoMatar: this.inicio + (neutro ? REGRAS.RECARGA_MATAR_NEUTRO_INICIAL : REGRAS.RECARGA_MATAR_INICIAL),
        prontoHab: this.inicio + (profissoes[i] === 'eletricista' ? REGRAS.RECARGA_ELETRICISTA_INICIAL : 0),
        emergencias: REGRAS.REUNIOES_EMERGENCIA,
        periciados: new Set(),
        ultimoChat: 0,
        tarefas: [],
      };
      j.tarefas = this.sortearTarefas(j);
      this.jogadores.set(j.id, j);
    });
  }

  sortearTarefas(j) {
    const falsa = !ALINHAMENTOS[j.alinhamento].tarefasContam;
    const escolhidas = [];
    const qtdProf = TAREFAS_DE_PROFISSAO[j.profissao] || 0;
    if (qtdProf) {
      const daProf = MAPA.estacoes.filter((e) => TIPOS_TAREFA[e.tipo].profissao === j.profissao);
      escolhidas.push(...embaralhar(daProf).slice(0, qtdProf));
    }
    const gerais = embaralhar(MAPA.estacoes.filter((e) => !TIPOS_TAREFA[e.tipo].profissao));
    for (const e of gerais) {
      if (escolhidas.length >= REGRAS.TAREFAS_POR_JOGADOR) break;
      escolhidas.push(e);
    }
    return escolhidas.map((e) => ({ id: e.id, tipo: e.tipo, local: e.local, feita: false, falsa }));
  }

  // ---------------------------------------------------------- envio
  socket(id) {
    return this.io.sockets.sockets.get(id);
  }

  enviar(id, evento, dados) {
    this.socket(id)?.emit(evento, dados);
  }

  todos(evento, dados) {
    this.io.to(this.sala.codigo).emit(evento, dados);
  }

  aviso(id, texto, tipo = 'info') {
    this.enviar(id, 'jogo:aviso', { texto, tipo });
  }

  publicoJogadores() {
    return [...this.jogadores.values()].map((j) => ({ id: j.id, nome: j.nome, avatar: j.avatar, vivo: j.vivo, desconectado: j.desconectado }));
  }

  iniciar() {
    const lista = this.publicoJogadores();
    for (const j of this.jogadores.values()) {
      const al = j.alinhamento;
      let aliados = [];
      if (al === 'impostor') aliados = this.filtrar((o) => o.alinhamento === 'impostor' && o.id !== j.id).map((o) => ({ id: o.id, tipo: 'impostor' }));
      if (ALINHAMENTOS[al].neutro) aliados = this.filtrar((o) => ALINHAMENTOS[o.alinhamento].neutro && o.id !== j.id).map((o) => ({ id: o.id, tipo: 'neutro' }));
      this.enviar(j.id, 'jogo:inicio', {
        eu: { id: j.id, alinhamento: al, profissao: j.profissao, x: j.x, y: j.y, tp: j.tp },
        aliados,
        tarefas: j.tarefas,
        jogadores: lista,
        posicoes: [...this.jogadores.values()].map((o) => ({ id: o.id, x: o.x, y: o.y })),
        totalJogadores: this.jogadores.size,
      });
    }
    this.enviarProgresso();
    // Checagem imediata (ex.: sala de teste muito pequena)
    setTimeout(() => this.verificarVitoria(), 6000);
  }

  filtrar(fn) {
    return [...this.jogadores.values()].filter(fn);
  }

  // ---------------------------------------------------------- tick
  tick() {
    if (this.fase === 'fim') return;
    const t = agora();
    this.contTick++;

    // viagens nos túneis
    for (const j of this.jogadores.values()) {
      if (j.viagem && t >= j.viagem.chega) {
        j.tunelAnterior = j.tunel;
        j.tunel = j.viagem.para;
        j.viagem = null;
        this.enviarTunel(j);
      }
    }

    // histórico de posições (para a Perícia do Policial)
    if (this.contTick % 10 === 0 && this.fase === 'jogando') {
      const pos = {};
      for (const j of this.jogadores.values()) if (j.vivo && !j.tunel && !j.desconectado) pos[j.id] = [j.x, j.y];
      this.historico.push({ t, pos });
      while (this.historico.length && this.historico[0].t < t - 30) this.historico.shift();
    }

    // reunião
    if (this.fase === 'reuniao' && this.reuniao && t >= this.reuniao.fim) {
      if (this.reuniao.fase === 'discussao') {
        this.reuniao.fase = 'votacao';
        this.reuniao.fim = t + REGRAS.TEMPO_VOTACAO;
        this.todos('reuniao:fase', { fase: 'votacao', restante: REGRAS.TEMPO_VOTACAO });
      } else if (this.reuniao.fase === 'votacao') {
        this.apurar();
      }
    }

    // posições (20x por segundo)
    this.enviarSnapshots(t);
    // estado privado (4x por segundo)
    if (this.contTick % 5 === 0) this.enviarEstadosPrivados();
  }

  enviarSnapshots(t) {
    const vivos = [];
    const fantasmas = [];
    for (const j of this.jogadores.values()) {
      if (j.desconectado) continue;
      const linha = [j.id, Math.round(j.x), Math.round(j.y), j.dir, j.andando && this.fase === 'jogando' ? 1 : 0, j.vivo ? 1 : 0];
      if (j.vivo) { if (!j.tunel) vivos.push(linha); } else fantasmas.push(linha);
    }
    for (const j of this.jogadores.values()) {
      if (j.desconectado) continue;
      this.enviar(j.id, 'jogo:snap', { t, j: j.vivo ? vivos : vivos.concat(fantasmas) });
    }
  }

  enviarEstadosPrivados() {
    for (const j of this.jogadores.values()) {
      if (j.desconectado) continue;
      this.enviar(j.id, 'jogo:eu', {
        vivo: j.vivo,
        recMatar: restante(j.prontoMatar),
        recHab: restante(j.prontoHab),
        recSab: restante(this.prontoSabotagem),
        recEmerg: restante(this.inicio + REGRAS.RECARGA_EMERGENCIA_INICIAL),
        emergencias: j.emergencias,
        sabotagem: this.sabotagem ? this.sabotagem.tipo : null,
      });
    }
  }

  enviarProgresso() {
    this.todos('jogo:progresso', this.progresso());
  }

  enviarCorpos() {
    this.todos('jogo:corpos', this.corpos.map((c) => ({ id: c.id, vitima: c.vitimaId, x: c.x, y: c.y })));
  }

  progresso() {
    let feitas = 0, total = 0;
    for (const j of this.jogadores.values()) {
      if (j.desconectado || !ALINHAMENTOS[j.alinhamento].tarefasContam) continue;
      for (const t of j.tarefas) { total++; if (t.feita) feitas++; }
    }
    return { feitas, total };
  }

  // ---------------------------------------------------------- ações
  mover(id, d) {
    const j = this.jogadores.get(id);
    if (!j || j.desconectado || this.fase !== 'jogando' || j.tunel) return;
    if (d.tp !== j.tp) return; // pacote antigo (antes de um teleporte)
    const x = Number(d.x), y = Number(d.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const t = agora();
    const dt = Math.min(1, t - j.ultimoMov);
    const max = REGRAS.VELOCIDADE * dt * 1.4 + 26;
    const foraDoMapa = x < 30 || y < 30 || x > MAPA.LARGURA - 30 || y > MAPA.ALTURA - 30;
    const invalido = Math.hypot(x - j.x, y - j.y) > max || foraDoMapa || (j.vivo && colide(x, y, REGRAS.RAIO_JOGADOR * 0.45));
    if (invalido) {
      j.ultimoMov = t;
      this.enviar(id, 'jogo:corrigir', { x: j.x, y: j.y, tp: j.tp });
      return;
    }
    j.ultimoMov = t;
    j.x = x;
    j.y = y;
    j.dir = [0, 1, 2, 3].includes(d.dir) ? d.dir : 0;
    j.andando = !!d.andando;
  }

  teleportar(j, x, y) {
    j.x = x;
    j.y = y;
    j.tp++;
    j.ultimoMov = agora();
    this.enviar(j.id, 'jogo:teleporte', { x, y, tp: j.tp });
  }

  matar(id, alvoId) {
    const a = this.jogadores.get(id);
    const b = this.jogadores.get(alvoId);
    if (this.fase !== 'jogando' || !a || !b || a === b) return;
    if (!a.vivo || !b.vivo || a.tunel || b.tunel || a.desconectado || b.desconectado) return;
    const alA = ALINHAMENTOS[a.alinhamento];
    if (!alA.podeMatar) return;
    if (agora() < a.prontoMatar) return;
    if (dist(a, b) > REGRAS.ALCANCE_MATAR + 25) return;

    if (a.alinhamento === 'impostor' && b.alinhamento === 'impostor') return;
    if (alA.neutro) {
      if (ALINHAMENTOS[b.alinhamento].neutro) {
        this.aviso(id, 'Você não pode eliminar o outro neutro.', 'erro');
        return;
      }
      const aliado =
        (a.alinhamento === 'neutro_inocente' && b.alinhamento === 'inocente') ||
        (a.alinhamento === 'neutro_impostor' && b.alinhamento === 'impostor');
      if (aliado) {
        a.prontoMatar = agora() + REGRAS.RECARGA_MATAR_NEUTRO * REGRAS.PENALIDADE_ALIADO;
        this.aviso(id, 'Esse jogador é seu aliado! A eliminação foi cancelada e sua recarga dobrou.', 'erro');
        return;
      }
    }

    b.vivo = false;
    b.tarefaAberta = null;
    const corpo = { id: this.proxCorpo++, vitimaId: b.id, x: b.x, y: b.y, t: agora(), assassinoId: a.id };
    this.corpos.push(corpo);
    a.prontoMatar = agora() + (alA.neutro ? REGRAS.RECARGA_MATAR_NEUTRO : REGRAS.RECARGA_MATAR);

    this.enviar(b.id, 'jogo:morreu', { assassino: a.id });
    this.enviar(a.id, 'jogo:eliminou', { alvo: b.id });
    this.enviarCorpos();

    // Alarme de veículo (Mecânico)
    const carro = MAPA.carros.find((c) => Math.hypot(c.x + c.w / 2 - b.x, c.y + c.h / 2 - b.y) <= REGRAS.ALARME_RAIO_CARRO);
    if (carro) this.alertarMecanicos('alarme', `Alarme de carro disparou: ${nomeLocal(b.x, b.y)}`, b.x, b.y);

    this.verificarVitoria();
  }

  relatar(id, corpoId) {
    const j = this.jogadores.get(id);
    const c = this.corpos.find((k) => k.id === corpoId);
    if (this.fase !== 'jogando' || !j || !j.vivo || j.tunel || !c) return;
    if (dist(j, c) > REGRAS.ALCANCE_RELATAR + 30) return;
    this.iniciarReuniao('corpo', j, c);
  }

  emergencia(id) {
    const j = this.jogadores.get(id);
    if (this.fase !== 'jogando' || !j || !j.vivo || j.tunel) return;
    if (j.emergencias <= 0) return this.aviso(id, 'Você já usou sua reunião de emergência.', 'erro');
    if (agora() < this.inicio + REGRAS.RECARGA_EMERGENCIA_INICIAL) return this.aviso(id, 'Aguarde para chamar uma reunião.', 'erro');
    if (dist(j, MAPA.FONTE) > REGRAS.ALCANCE_EMERGENCIA + 30) return;
    j.emergencias--;
    this.iniciarReuniao('emergencia', j, null);
  }

  // ---------------------------------------------------------- tarefas
  abrirTarefa(id, estacaoId) {
    const j = this.jogadores.get(id);
    if (!j || this.fase !== 'jogando' || j.tunel) return { ok: false };
    const tarefa = j.tarefas.find((t) => t.id === estacaoId);
    const est = MAPA.estacoes.find((e) => e.id === estacaoId);
    if (!tarefa || !est || tarefa.feita) return { ok: false };
    if (tarefa.falsa) return { ok: false, erro: 'falsa' };
    if (dist(j, est) > REGRAS.ALCANCE_USAR + 45) return { ok: false, erro: 'longe' };
    j.tarefaAberta = { id: estacaoId, desde: agora() };
    return { ok: true };
  }

  concluirTarefa(id, estacaoId) {
    const j = this.jogadores.get(id);
    if (!j || this.fase !== 'jogando') return { ok: false };
    const ab = j.tarefaAberta;
    const tarefa = j.tarefas.find((t) => t.id === estacaoId);
    const est = MAPA.estacoes.find((e) => e.id === estacaoId);
    if (!ab || ab.id !== estacaoId || !tarefa || tarefa.feita || tarefa.falsa || !est) return { ok: false };
    if (agora() - ab.desde < REGRAS.TEMPO_MINIMO_TAREFA) return { ok: false };
    if (dist(j, est) > REGRAS.ALCANCE_USAR + 60) return { ok: false };
    tarefa.feita = true;
    j.tarefaAberta = null;
    this.enviar(id, 'jogo:tarefas', j.tarefas);
    this.enviarProgresso();
    this.verificarVitoria();
    return { ok: true };
  }

  // ---------------------------------------------------------- sabotagem
  sabotar(id, tipo) {
    const j = this.jogadores.get(id);
    if (!j || this.fase !== 'jogando' || !ALINHAMENTOS[j.alinhamento].podeSabotar) return;
    if (!SABOTAGENS[tipo] || this.sabotagem || agora() < this.prontoSabotagem) return;
    this.sabotagem = { tipo, desde: agora() };
    this.todos('jogo:sabotagem', { ativa: tipo });
  }

  abrirPainel(id) {
    const j = this.jogadores.get(id);
    if (!j || !j.vivo || j.tunel || !this.sabotagem) return { ok: false };
    if (dist(j, MAPA.PAINEL_ENERGIA) > REGRAS.ALCANCE_USAR + 45) return { ok: false };
    j.painelDesde = agora();
    return { ok: true };
  }

  consertar(id, origem) {
    const j = this.jogadores.get(id);
    if (!j || !j.vivo || this.fase !== 'jogando' || !this.sabotagem || this.sabotagem.tipo !== 'apagao') return { ok: false };
    if (origem === 'tablet') {
      if (j.profissao !== 'eletricista') return { ok: false };
      if (agora() < j.prontoHab) return { ok: false, erro: 'O tablet ainda está recarregando.' };
      j.prontoHab = agora() + REGRAS.RECARGA_ELETRICISTA;
    } else {
      if (!j.painelDesde || agora() - j.painelDesde < REGRAS.TEMPO_MINIMO_TAREFA) return { ok: false };
      if (dist(j, MAPA.PAINEL_ENERGIA) > REGRAS.ALCANCE_USAR + 60) return { ok: false };
      j.painelDesde = null;
    }
    this.sabotagem = null;
    this.prontoSabotagem = agora() + REGRAS.RECARGA_SABOTAGEM;
    this.todos('jogo:sabotagem', { ativa: null, resolvida: 'apagao' });
    return { ok: true };
  }

  // ---------------------------------------------------------- túneis
  entrarTunel(id, no) {
    const j = this.jogadores.get(id);
    const n = TUNEIS.nos[no];
    if (!j || !n || !j.vivo || j.tunel || this.fase !== 'jogando') return;
    if (!podeUsarTuneis(j.alinhamento, j.profissao)) return;
    if (dist(j, n) > REGRAS.ALCANCE_USAR + 45) return;
    j.tunel = no;
    j.tunelAnterior = null;
    j.tarefaAberta = null;
    this.enviarTunel(j);
    this.todos('jogo:efeito', { tipo: 'bueiro', x: n.x, y: n.y });
    this.alertarMecanicos('bueiro', `Barulho no bueiro: ${n.nome}`, n.x, n.y);
  }

  moverTunel(id, para) {
    const j = this.jogadores.get(id);
    if (!j || !j.tunel || j.viagem || this.fase !== 'jogando') return;
    if (!vizinhosTunel(j.tunel).includes(para)) return;
    j.viagem = { para, chega: agora() + REGRAS.TUNEL_TEMPO_VIAGEM };
    this.enviar(id, 'tunel:viajando', { para, tempo: REGRAS.TUNEL_TEMPO_VIAGEM });
  }

  sairTunel(id, silencioso = false) {
    const j = this.jogadores.get(id);
    if (!j || !j.tunel || j.viagem) return;
    const n = TUNEIS.nos[j.tunel];
    j.tunel = null;
    j.viagem = null;
    this.teleportar(j, n.x, n.y);
    this.enviar(id, 'tunel:saiu', {});
    if (!silencioso) {
      this.todos('jogo:efeito', { tipo: 'bueiro', x: n.x, y: n.y });
      this.alertarMecanicos('bueiro', `Barulho no bueiro: ${n.nome}`, n.x, n.y);
    }
  }

  enviarTunel(j) {
    this.enviar(j.id, 'tunel:estado', { no: j.tunel, anterior: j.tunelAnterior, vizinhos: vizinhosTunel(j.tunel) });
  }

  alertarMecanicos(tipo, texto, x, y) {
    for (const m of this.jogadores.values()) {
      if (m.profissao === 'mecanico' && m.vivo && !m.desconectado) {
        this.enviar(m.id, 'mecanico:alerta', { tipo, texto, x: Math.round(x), y: Math.round(y), t: Date.now() });
      }
    }
  }

  // ---------------------------------------------------------- perícia
  pericia(id, corpoId) {
    const j = this.jogadores.get(id);
    const c = this.corpos.find((k) => k.id === corpoId);
    if (!j || j.profissao !== 'policial' || !j.vivo || this.fase !== 'jogando' || !c) return;
    if (agora() < j.prontoHab) return this.aviso(id, 'A perícia ainda está recarregando.', 'erro');
    if (dist(j, c) > REGRAS.ALCANCE_RELATAR + 30) return;
    if (j.periciados.has(c.id)) return this.aviso(id, 'Você já analisou este corpo.', 'erro');
    j.periciados.add(c.id);
    j.prontoHab = agora() + REGRAS.RECARGA_PERICIA;

    const suspeitos = new Set([c.assassinoId]);
    for (const h of this.historico) {
      if (h.t < c.t - REGRAS.PERICIA_JANELA || h.t > c.t + 0.6) continue;
      for (const [pid, [px, py]] of Object.entries(h.pos)) {
        if (pid !== c.vitimaId && Math.hypot(px - c.x, py - c.y) <= REGRAS.PERICIA_RAIO) suspeitos.add(pid);
      }
    }
    suspeitos.delete(c.vitimaId);
    const vitima = this.jogadores.get(c.vitimaId);
    this.enviar(id, 'pericia:resultado', {
      vitima: vitima?.nome,
      local: nomeLocal(c.x, c.y),
      segundos: Math.round(agora() - c.t),
      suspeitos: embaralhar([...suspeitos]).map((sid) => this.jogadores.get(sid)?.nome).filter(Boolean),
    });
  }

  // ---------------------------------------------------------- reunião
  iniciarReuniao(motivo, chamador, corpo) {
    if (this.fase !== 'jogando') return;
    this.fase = 'reuniao';
    const t = agora();
    const vivos = this.filtrar((j) => j.vivo && !j.desconectado);
    const pos = posicoesFonte(vivos.length);
    for (const j of this.jogadores.values()) {
      j.tarefaAberta = null;
      j.painelDesde = null;
      if (j.tunel) {
        j.tunel = null;
        j.viagem = null;
        this.enviar(j.id, 'tunel:saiu', {});
      }
    }
    vivos.forEach((j, i) => this.teleportar(j, pos[i].x, pos[i].y));
    const vitima = corpo ? this.jogadores.get(corpo.vitimaId) : null;
    this.corpos = [];
    this.enviarCorpos();
    this.reuniao = { motivo, chamadorId: chamador.id, fase: 'discussao', fim: t + REGRAS.TEMPO_DISCUSSAO, votos: new Map() };
    this.todos('reuniao:inicio', {
      motivo,
      chamador: { id: chamador.id, nome: chamador.nome },
      vitima: vitima ? { id: vitima.id, nome: vitima.nome } : null,
      jogadores: this.publicoJogadores(),
      fase: 'discussao',
      restante: REGRAS.TEMPO_DISCUSSAO,
    });
  }

  votar(id, alvo) {
    const j = this.jogadores.get(id);
    const r = this.reuniao;
    if (this.fase !== 'reuniao' || !r || r.fase !== 'votacao' || !j || !j.vivo || j.desconectado) return;
    if (r.votos.has(id)) return;
    if (alvo !== 'pular') {
      const b = this.jogadores.get(alvo);
      if (!b || !b.vivo || b.desconectado) return;
    }
    r.votos.set(id, alvo);
    this.todos('reuniao:votou', { id });
    const vivos = this.filtrar((k) => k.vivo && !k.desconectado);
    if (vivos.every((k) => r.votos.has(k.id))) this.apurar();
  }

  chat(id, texto) {
    const j = this.jogadores.get(id);
    if (!j || this.fase !== 'reuniao') return;
    const t = agora();
    if (t - j.ultimoChat < 0.7) return;
    j.ultimoChat = t;
    texto = String(texto || '').replace(/[<>]/g, '').trim().slice(0, 140);
    if (!texto) return;
    const msg = { id, nome: j.nome, texto, morto: !j.vivo };
    if (j.vivo) this.todos('reuniao:chat', msg);
    else for (const k of this.jogadores.values()) if (!k.vivo) this.enviar(k.id, 'reuniao:chat', msg);
  }

  apurar() {
    const r = this.reuniao;
    if (!r || this.fase !== 'reuniao') return;
    this.fase = 'ejecao';
    const contagem = {};
    for (const alvo of r.votos.values()) contagem[alvo] = (contagem[alvo] || 0) + 1;
    const pulos = contagem.pular || 0;
    let max = 0;
    let lideres = [];
    for (const [alvo, qtd] of Object.entries(contagem)) {
      if (alvo === 'pular') continue;
      if (qtd > max) { max = qtd; lideres = [alvo]; }
      else if (qtd === max) lideres.push(alvo);
    }
    let ejetadoId = null;
    let motivo = null;
    if (max === 0) motivo = r.votos.size ? 'pulado' : 'sem_votos';
    else if (pulos >= max) motivo = 'pulado';
    else if (lideres.length > 1) {
      if (REGRAS.EMPATE === 'sorteio') ejetadoId = lideres[sortearInt(0, lideres.length - 1)];
      else motivo = 'empate';
    } else ejetadoId = lideres[0];

    let ejetado = null;
    let encrenqueiro = false;
    if (ejetadoId) {
      const e = this.jogadores.get(ejetadoId);
      e.vivo = false;
      encrenqueiro = e.alinhamento === 'encrenqueiro';
      ejetado = { id: e.id, nome: e.nome, texto: textoEjecao(e.nome, e.alinhamento), encrenqueiro };
    }

    this.todos('reuniao:resultado', {
      votos: REGRAS.VOTOS_ANONIMOS ? null : [...r.votos.entries()].map(([eleitor, alvo]) => ({ eleitor, alvo })),
      contagem,
      ejetado,
      motivo,
      tempo: REGRAS.TEMPO_ANIMACAO_EJECAO,
    });

    setTimeout(() => {
      if (this.fase === 'fim') return;
      if (encrenqueiro) {
        this.finalizar(avaliarVitoria(this, { encrenqueiroEjetado: true }));
        return;
      }
      this.reuniao = null;
      this.fase = 'jogando';
      if (this.verificarVitoria()) return;
      const t = agora();
      for (const j of this.jogadores.values()) {
        const neutro = ALINHAMENTOS[j.alinhamento].neutro;
        j.prontoMatar = t + (neutro ? REGRAS.RECARGA_MATAR_NEUTRO : REGRAS.RECARGA_MATAR);
        j.ultimoMov = t;
      }
      this.prontoSabotagem = Math.max(this.prontoSabotagem, t + 10);
      this.todos('jogo:retomar', { jogadores: this.publicoJogadores() });
    }, REGRAS.TEMPO_ANIMACAO_EJECAO * 1000 + 600);
  }

  // ---------------------------------------------------------- vitória
  verificarVitoria() {
    if (this.fase === 'fim') return true;
    if (this.fase === 'ejecao') return false; // espera a animação terminar
    const res = avaliarVitoria(this);
    if (res) { this.finalizar(res); return true; }
    return false;
  }

  finalizar(resultado) {
    if (this.fase === 'fim' || !resultado) return;
    this.fase = 'fim';
    clearInterval(this.timer);
    this.todos('jogo:fim', {
      ...resultado,
      revelacao: [...this.jogadores.values()].map((j) => ({
        id: j.id, nome: j.nome, avatar: j.avatar, alinhamento: j.alinhamento, profissao: j.profissao, vivo: j.vivo, desconectado: j.desconectado,
      })),
    });
    this.sala.partidaTerminou();
  }

  // ---------------------------------------------------------- saída
  sair(id) {
    const j = this.jogadores.get(id);
    if (!j || j.desconectado) return;
    j.desconectado = true;
    j.vivo = false;
    j.tunel = null;
    j.viagem = null;
    this.todos('jogo:saiu', { id, nome: j.nome });
    this.enviarProgresso();
    if (this.fase === 'reuniao' && this.reuniao) {
      this.reuniao.votos.delete(id);
      const vivos = this.filtrar((k) => k.vivo && !k.desconectado);
      if (this.reuniao.fase === 'votacao' && vivos.length && vivos.every((k) => this.reuniao.votos.has(k.id))) this.apurar();
    }
    this.verificarVitoria();
    if (this.filtrar((k) => !k.desconectado).length === 0) this.encerrar();
  }

  encerrar() {
    clearInterval(this.timer);
    this.fase = 'fim';
  }
}
