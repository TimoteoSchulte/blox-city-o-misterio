// Janelas do jogo: tarefas, painel de energia, túneis, tablet, alertas,
// sabotagem, perícia e mapa.
import { MAPA, TUNEIS } from '/shared/mapa.js';
import { TIPOS_TAREFA, SABOTAGENS } from '/shared/tarefas.js';
import { E, el, raiz, toast, emitir } from '../estado.js';
import { socket, pedir } from '../rede.js';
import { MINIJOGOS } from '../tarefas/minijogos.js';

let atual = null; // {fundo, limpar, tipo}

export function abrirJanela(tipo, titulo, montar, { dica, largura } = {}) {
  fecharJanela();
  const conteudo = el('div', {});
  const jan = el('div', { class: 'janela', style: largura ? { width: largura } : {} },
    el('button', { class: 'fechar', onclick: () => fecharJanela() }, '✕'),
    titulo ? el('h3', {}, titulo) : null,
    dica ? el('p', { class: 'dica' }, dica) : null,
    conteudo);
  const fundo = el('div', { class: 'modal-fundo', onpointerdown: (e) => { if (e.target === fundo) fecharJanela(); } }, jan);
  raiz.append(fundo);
  atual = { fundo, tipo, conteudo, jan, limpar: null };
  E.janela = tipo;
  atual.limpar = montar(conteudo, jan) || null;
  return atual;
}

export function fecharJanela(tipo) {
  if (!atual || (tipo && atual.tipo !== tipo)) return;
  try { atual.limpar && atual.limpar(); } catch (e) { console.error(e); }
  atual.fundo.remove();
  atual = null;
  E.janela = null;
}

export function janelaAtual() { return atual?.tipo || null; }

function mostrarConcluida(jan, texto = 'TAREFA CONCLUÍDA!') {
  jan.style.position = 'relative';
  jan.append(el('div', { class: 'concluida' }, '✔ ' + texto));
}

// ---------------------------------------------------------- tarefas
export async function abrirTarefa(estacaoId) {
  const r = await pedir('jogo:tarefa:abrir', { estacao: estacaoId });
  if (!r.ok) {
    if (r.erro === 'longe') toast('Chegue mais perto da tarefa.', 'erro');
    return;
  }
  const tarefa = E.tarefas.find((t) => t.id === estacaoId);
  const info = TIPOS_TAREFA[tarefa.tipo];
  abrirJanela('tarefa:' + estacaoId, info.nome, (area, jan) => {
    let enviado = false;
    const concluir = async () => {
      if (enviado) return;
      enviado = true;
      // respeita o tempo mínimo do servidor
      await new Promise((ok) => setTimeout(ok, 350));
      const res = await pedir('jogo:tarefa:concluir', { estacao: estacaoId });
      if (res.ok) {
        mostrarConcluida(jan);
        setTimeout(() => fecharJanela('tarefa:' + estacaoId), 900);
      } else {
        enviado = false;
        setTimeout(async () => {
          const r2 = await pedir('jogo:tarefa:concluir', { estacao: estacaoId });
          if (r2.ok) { mostrarConcluida(jan); setTimeout(() => fecharJanela('tarefa:' + estacaoId), 900); }
        }, 1000);
      }
    };
    return MINIJOGOS[tarefa.tipo](area, concluir);
  }, { dica: info.dica + ` • ${tarefa.local}` });
}

export async function abrirPainelEnergia() {
  const r = await pedir('jogo:painel:abrir');
  if (!r.ok) return;
  abrirJanela('painel', '⚡ Painel de Energia da Usina', (area, jan) => {
    const concluir = async () => {
      await new Promise((ok) => setTimeout(ok, 300));
      const res = await pedir('jogo:consertar', { origem: 'painel' });
      if (res.ok) { mostrarConcluida(jan, 'ENERGIA RESTAURADA!'); setTimeout(() => fecharJanela('painel'), 900); }
    };
    return MINIJOGOS.energia(area, concluir);
  }, { dica: 'Ligue todos os disjuntores e puxe a alavanca.' });
}

// ---------------------------------------------------------- túneis
export function atualizarTunel(d) {
  E.tunel = d.no;
  const montar = (area) => {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 900 420');
    svg.setAttribute('class', 'tunel-svg');
    const mk = (tag, a, txt) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); if (txt) n.textContent = txt; svg.append(n); return n; };
    for (const [a, b] of TUNEIS.conexoes) {
      const A = TUNEIS.nos[a].ui, B = TUNEIS.nos[b].ui;
      const ativo = (a === d.no || b === d.no);
      mk('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, stroke: ativo ? '#ffd23f' : '#3b3550', 'stroke-width': ativo ? 14 : 10, 'stroke-linecap': 'round' });
    }
    for (const [id, n] of Object.entries(TUNEIS.nos)) {
      const atualNo = id === d.no, viz = d.vizinhos.includes(id);
      const g = mk('g', { class: viz ? 'no' : '' });
      const circ = document.createElementNS(NS, 'circle');
      Object.entries({ cx: n.ui.x, cy: n.ui.y, r: atualNo ? 30 : 24, fill: atualNo ? '#ffd23f' : viz ? '#5ee08a' : '#2b2640', stroke: '#000', 'stroke-width': 4 }).forEach(([k, v]) => circ.setAttribute(k, v));
      g.append(circ);
      const t1 = document.createElementNS(NS, 'text');
      Object.entries({ x: n.ui.x, y: n.ui.y + 7, 'text-anchor': 'middle', 'font-size': 20, 'font-weight': 800, fill: atualNo || viz ? '#1b1535' : '#8d86b0' }).forEach(([k, v]) => t1.setAttribute(k, v));
      t1.textContent = id; g.append(t1);
      const t2 = document.createElementNS(NS, 'text');
      Object.entries({ x: n.ui.x, y: n.ui.y + 50, 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: atualNo ? '#ffd23f' : '#cfc8f0' }).forEach(([k, v]) => t2.setAttribute(k, v));
      t2.textContent = n.nome; g.append(t2);
      if (viz) g.addEventListener('click', () => socket.emit('tunel:mover', { para: id }));
      svg.append(g);
    }
    const viajando = el('div', { class: 'viajando', id: 'tunel-viajando' });
    const botoes = el('div', { class: 'tunel-botoes' });
    if (d.anterior) botoes.append(el('button', { class: 'btn sec', onclick: () => socket.emit('tunel:mover', { para: d.anterior }) }, `↩ Voltar para ${d.anterior} (${TUNEIS.nos[d.anterior].nome})`));
    for (const v of d.vizinhos) {
      if (v === d.anterior) continue;
      botoes.append(el('button', { class: 'btn sec', onclick: () => socket.emit('tunel:mover', { para: v }) }, `➜ Ir para ${v} (${TUNEIS.nos[v].nome})`));
    }
    botoes.append(el('button', { class: 'btn', onclick: () => socket.emit('tunel:sair') }, `⬆ Sair aqui (${TUNEIS.nos[d.no].nome})`));
    area.append(svg, viajando, botoes);
  };
  abrirJanela('tunel', `🕳️ Túneis de BLOX City — você está em ${d.no}: ${TUNEIS.nos[d.no].nome}`, montar, { dica: 'Escolha um túnel conectado para avançar, volte ao anterior ou saia pelo bueiro.' });
  // fechar no X = sair pelo bueiro
  atual.jan.querySelector('.fechar').onclick = () => socket.emit('tunel:sair');
  atual.fundo.onpointerdown = null;
}

export function tunelViajando(d) {
  const v = document.getElementById('tunel-viajando');
  if (v) v.textContent = `Rastejando pelo túnel até ${d.para} (${TUNEIS.nos[d.para].nome})...`;
  atual?.conteudo.querySelectorAll('button').forEach((b) => (b.disabled = true));
}

export function sairTunel() {
  E.tunel = null;
  fecharJanela('tunel');
}

// ---------------------------------------------------------- eletricista
export function abrirTablet() {
  abrirJanela('tablet', null, (area) => {
    const tab = el('div', { class: 'tablet' });
    const desenhar = () => {
      const apagao = E.sabotagem === 'apagao';
      const rec = E.priv.recHab || 0;
      tab.innerHTML = '';
      tab.append(
        el('div', { style: { fontWeight: 800, fontSize: '22px', color: '#80cbc4' } }, '⚡ TABLET DO ELETRICISTA'),
        el('div', { style: { color: '#b0bec5' } }, 'Sistema elétrico de BLOX City'),
        el('div', { class: 'lampada', style: { background: apagao ? '#d50000' : '#69f0ae', boxShadow: apagao ? '0 0 30px #d50000' : '0 0 30px #69f0ae' } }),
        el('div', { style: { fontWeight: 800, fontSize: '20px' } }, apagao ? 'APAGÃO EM ANDAMENTO' : 'Energia normal'),
        el('div', { class: 'espaco' }),
        el('button', {
          class: 'btn cheio', disabled: !apagao || rec > 0,
          onclick: async () => {
            const r = await pedir('jogo:consertar', { origem: 'tablet' });
            if (r.ok) toast('Energia restaurada remotamente!', 'ok');
            else if (r.erro) toast(r.erro, 'erro');
          },
        }, rec > 0 ? `Recarregando... ${rec}s` : 'Restaurar energia remotamente'),
        el('div', { class: 'dica', style: { marginTop: '8px' } }, 'Se o tablet estiver recarregando, a energia precisa ser restaurada na Usina Elétrica.'),
      );
    };
    desenhar();
    area.append(tab);
    const t = setInterval(desenhar, 500);
    return () => clearInterval(t);
  });
}

// ---------------------------------------------------------- mecânico
export function abrirAlertas() {
  abrirJanela('alertas', '🔧 Painel do Mecânico', (area) => {
    const lista = el('div', { class: 'alerta-lista' });
    if (!E.alertas.length) lista.append(el('div', { class: 'dica' }, 'Nenhuma atividade suspeita registrada ainda.'));
    for (const a of [...E.alertas].reverse()) {
      const s = Math.round((Date.now() - a.recebido) / 1000);
      lista.append(el('div', {}, `${a.tipo === 'alarme' ? '🚨' : '🕳️'} ${a.texto} `, el('small', { style: { color: 'var(--suave)' } }, `há ${s}s`)));
    }
    area.append(lista);
  }, { dica: 'Alarmes de carros (eliminações perto de veículos) e barulhos nos bueiros.' });
}

// ---------------------------------------------------------- policial
export function mostrarPericia(d) {
  abrirJanela('pericia', '👮 Resultado da Perícia', (area) => {
    area.append(
      el('p', { style: { textAlign: 'center' } }, `Corpo de `, el('b', {}, d.vitima || '???'), ` em `, el('b', {}, d.local), ` (há ${d.segundos}s).`),
      el('p', { class: 'dica' }, 'Pessoas que estiveram perto do local pouco antes da eliminação:'),
      el('div', { class: 'pericia-nomes' }, d.suspeitos.length ? d.suspeitos.map((n) => el('span', {}, n)) : el('span', {}, 'Ninguém foi visto')),
      el('p', { class: 'dica' }, 'O culpado está nesta lista... mas nem todos aqui são culpados.'),
    );
  });
}

// ---------------------------------------------------------- impostor
export function abrirSabotagem() {
  abrirJanela('sabotagem', '😈 Sabotar a cidade', (area) => {
    for (const [id, s] of Object.entries(SABOTAGENS)) {
      const rec = E.priv.recSab || 0;
      area.append(el('div', { class: 'cartao-prof', style: { marginBottom: '10px' } },
        el('div', { class: 'ic' }, s.icone),
        el('div', { style: { flex: 1 } }, el('b', {}, s.nome), el('div', { style: { color: 'var(--suave)', fontSize: '15px' } }, s.descricao)),
        el('button', {
          class: 'btn verm', disabled: !!E.sabotagem || rec > 0,
          onclick: () => { socket.emit('jogo:sabotar', { tipo: id }); fecharJanela('sabotagem'); },
        }, E.sabotagem ? 'Ativa' : rec > 0 ? `${rec}s` : 'Sabotar')));
    }
  });
}

// ---------------------------------------------------------- mapa
export function abrirMapa(posicao) {
  abrirJanela('mapa', '🗺️ Mapa de BLOX City', (area) => {
    const esc = 0.25;
    const c = el('canvas', { width: MAPA.LARGURA * esc, height: MAPA.ALTURA * esc });
    const ctx = c.getContext('2d');
    const desenhar = () => {
      ctx.setTransform(esc, 0, 0, esc, 0, 0);
      ctx.fillStyle = '#6fbf63'; ctx.fillRect(0, 0, MAPA.LARGURA, MAPA.ALTURA);
      for (const q of MAPA.QUARTEIROES) { ctx.fillStyle = '#cfc6b6'; ctx.fillRect(q.x, q.y, q.w, q.h); ctx.fillStyle = '#7ccb6d'; ctx.fillRect(q.x + 36, q.y + 36, q.w - 72, q.h - 72); }
      ctx.fillStyle = '#474c58'; for (const r of MAPA.RUAS) ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#86d478'; for (const p of MAPA.PARQUES) ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#e3d3b0'; ctx.fillRect(MAPA.PRACA.x, MAPA.PRACA.y, MAPA.PRACA.w, MAPA.PRACA.h);
      ctx.fillStyle = '#2f9fe0'; ctx.beginPath(); ctx.arc(MAPA.FONTE.x, MAPA.FONTE.y, MAPA.FONTE.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#575c68'; ctx.fillRect(1960, 1560, 740, 480);
      ctx.font = '800 56px "Baloo 2", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const pr of MAPA.predios) {
        ctx.fillStyle = pr.telhado; ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
        ctx.strokeStyle = '#1d1a2b'; ctx.lineWidth = 10; ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
        ctx.fillStyle = '#fff'; ctx.fillText(pr.nome, pr.x + pr.w / 2, pr.y + pr.h / 2);
      }
      ctx.fillStyle = '#fff'; ctx.fillText('Centro', MAPA.FONTE.x, MAPA.PRACA.y + 60); ctx.fillText('Estacionamento', 2330, 1800);
      ctx.fillText('Parque Oeste', 930, 960); ctx.fillText('Parque Leste', 2700, 960);
      // bueiros (para quem usa túneis)
      if (E.eu && (E.eu.alinhamento === 'impostor' || E.eu.profissao === 'encanador')) {
        for (const [id, n] of Object.entries(TUNEIS.nos)) {
          ctx.fillStyle = '#2f333b'; ctx.beginPath(); ctx.arc(n.x, n.y, 34, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffd23f'; ctx.font = '800 40px sans-serif'; ctx.fillText(id, n.x, n.y + 2);
        }
      }
      // tarefas pendentes
      for (const t of E.tarefas) {
        if (t.feita) continue;
        const est = MAPA.estacoes.find((e) => e.id === t.id);
        ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#000'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(est.x, est.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (E.sabotagem === 'apagao') {
        ctx.strokeStyle = '#ff1744'; ctx.lineWidth = 24; ctx.strokeRect(360, 360, 720, 500);
        ctx.fillStyle = '#ff1744'; ctx.font = '800 70px sans-serif'; ctx.fillText('⚡ APAGÃO', 720, 330);
      }
      // alertas recentes do mecânico
      for (const a of E.alertas) {
        if (Date.now() - a.recebido > 15000) continue;
        ctx.strokeStyle = '#ff9100'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(a.x, a.y, 80, 0, Math.PI * 2); ctx.stroke();
      }
      const p = posicao();
      if (p) {
        ctx.fillStyle = '#ff1744'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, 40, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    };
    desenhar();
    area.className = 'minimapa';
    area.append(c, el('p', { class: 'dica', style: { marginTop: '6px' } }, '🔴 Você  •  🟡 Suas tarefas'));
    const t = setInterval(desenhar, 300);
    return () => clearInterval(t);
  });
}

export { emitir };
