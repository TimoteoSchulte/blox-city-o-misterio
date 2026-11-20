// Reunião na fonte: discussão, chat, votação (com "Pular voto"), resultado,
// animação de ejeção na fonte e anúncio do alinhamento.
import { E, el, raiz, nomeDe } from '../estado.js';
import { socket } from '../rede.js';
import { retrato } from '../avatar.js';
import { fecharJanela } from './paineis.js';

let R = null;

export function iniciarReuniao(d) {
  fecharJanela();
  E.emReuniao = true;
  E.corpos = [];
  for (const j of d.jogadores) {
    const info = E.jogadores.get(j.id);
    if (info) info.vivo = j.vivo && !j.desconectado;
  }
  document.querySelector('.reuniao')?.remove();
  const titulo = d.motivo === 'corpo'
    ? `📢 ${d.chamador.nome} encontrou o corpo de ${d.vitima?.nome || 'alguém'}!`
    : `🔔 ${d.chamador.nome} chamou uma reunião de emergência!`;
  const fase = el('div', { class: 'fase' });
  const grade = el('div', { class: 'votos-grade' });
  const msgs = el('div', { class: 'msgs' });
  const input = el('input', { maxlength: 140, placeholder: E.eu.vivo ? 'Digite sua mensagem...' : 'Chat dos fantasmas...' });
  const form = el('form', { onsubmit: (e) => { e.preventDefault(); if (input.value.trim()) socket.emit('reuniao:chat', { texto: input.value }); input.value = ''; } },
    input, el('button', { class: 'btn', type: 'submit', style: { padding: '6px 14px', fontSize: '16px' } }, 'Enviar'));
  const pular = el('button', { class: 'btn sec', onclick: () => votar('pular') }, '⏭ PULAR VOTO');
  const contPulo = el('div', { class: 'contagem-pulo' });
  const tela = el('div', { class: 'reuniao' },
    el('div', { class: 'topo' }, el('div', { class: 'tit' }, titulo), fase),
    el('div', { class: 'corpo' }, grade, el('div', { class: 'chat' }, msgs, form)),
    el('div', { class: 'rodape' }, pular, contPulo));
  raiz.append(tela);

  R = { tela, fase, grade, msgs, pular, contPulo, faseAtual: d.fase, fim: Date.now() + d.restante * 1000, votei: false, selecionado: null, cartoes: new Map() };
  for (const j of d.jogadores) {
    const vivo = j.vivo && !j.desconectado;
    const info = E.jogadores.get(j.id) || j;
    const c = el('div', { class: 'cand' + (vivo ? '' : ' morto') },
      retrato(info.avatar, 52, { morto: !vivo }),
      el('div', { style: { minWidth: 0, flex: 1 } },
        el('div', { class: 'nm', style: { color: corNome(j.id) } }, info.nome + (j.id === E.eu.id ? ' (você)' : '')),
        el('div', { style: { fontSize: '13px', color: 'var(--suave)' } }, !vivo ? (j.desconectado ? 'saiu' : 'eliminado') : j.id === d.chamador.id ? 'chamou a reunião' : ''),
        el('div', { class: 'eleitores' })),
      el('button', { class: 'btn confirmar', style: { padding: '4px 10px', fontSize: '15px' }, onclick: (e) => { e.stopPropagation(); votar(j.id); } }, '✔ Votar'),
      el('span', { class: 'votou' }, 'VOTOU'));
    if (vivo) c.addEventListener('click', () => selecionar(j.id));
    R.cartoes.set(j.id, c);
    grade.append(c);
  }
  sistema('A discussão começou. Votação em breve!');
  atualizarFase();
  R.timer = setInterval(atualizarFase, 250);
}

function corNome(id) {
  const a = E.aliados.get(id);
  return a === 'impostor' ? '#ff6b6b' : a === 'neutro' ? '#c9a7ff' : '#fff';
}

function podeVotar() {
  return R && R.faseAtual === 'votacao' && E.eu.vivo && !R.votei;
}

function selecionar(id) {
  if (!podeVotar()) return;
  R.selecionado = R.selecionado === id ? null : id;
  for (const [k, c] of R.cartoes) c.classList.toggle('sel', k === R.selecionado);
}

function votar(alvo) {
  if (!podeVotar()) return;
  R.votei = true;
  socket.emit('reuniao:voto', { alvo });
  for (const c of R.cartoes.values()) c.classList.remove('sel');
  sistema(alvo === 'pular' ? 'Você pulou seu voto.' : `Você votou em ${nomeDe(alvo)}.`);
  atualizarFase();
}

function atualizarFase() {
  if (!R) return;
  const s = Math.max(0, Math.ceil((R.fim - Date.now()) / 1000));
  if (R.faseAtual === 'discussao') R.fase.textContent = `💬 Discussão: ${s}s (a votação começa depois)`;
  else if (R.faseAtual === 'votacao') R.fase.textContent = `🗳️ Votação: ${s}s` + (E.eu.vivo ? (R.votei ? ' • voto registrado' : ' • escolha um jogador ou pule') : ' • fantasmas não votam');
  else R.fase.textContent = '📊 Resultado';
  R.pular.disabled = !podeVotar();
}

export function faseReuniao(d) {
  if (!R) return;
  R.faseAtual = d.fase;
  R.fim = Date.now() + d.restante * 1000;
  if (d.fase === 'votacao') sistema('VOTAÇÃO ABERTA! Clique num jogador e confirme, ou pule o voto.');
  atualizarFase();
}

export function alguemVotou(d) {
  R?.cartoes.get(d.id)?.classList.add('ja-votou');
}

export function chatReuniao(m) {
  if (!R) return;
  R.msgs.append(el('div', { class: 'm' + (m.morto ? ' morto' : '') }, el('b', {}, m.nome + ': '), m.texto));
  R.msgs.scrollTop = R.msgs.scrollHeight;
}

function sistema(t) {
  if (!R) return;
  R.msgs.append(el('div', { class: 'sis' }, t));
  R.msgs.scrollTop = R.msgs.scrollHeight;
}

// resultado -> mostra votos -> animação na fonte -> anúncio
export function resultadoReuniao(d, mundo) {
  if (!R) return;
  R.faseAtual = 'resultado';
  clearInterval(R.timer);
  atualizarFase();
  for (const c of R.cartoes.values()) c.classList.remove('sel');
  if (d.votos) {
    for (const v of d.votos) {
      const info = E.jogadores.get(v.eleitor);
      if (!info) continue;
      const img = retrato(info.avatar, 22);
      if (v.alvo === 'pular') R.contPulo.append(img);
      else R.cartoes.get(v.alvo)?.querySelector('.eleitores').append(img);
    }
  }
  if (d.contagem?.pular) R.contPulo.prepend(el('span', { style: { fontWeight: 800 } }, `Pularam: ${d.contagem.pular} `));
  const msg = d.ejetado ? `A cidade decidiu: ${d.ejetado.nome} está fora!`
    : d.motivo === 'empate' ? 'Empate! Ninguém foi eliminado.'
      : 'Ninguém foi eliminado (votos pulados).';
  sistema(msg);
  R.fase.textContent = '📊 ' + msg;

  setTimeout(() => {
    const tela = R?.tela;
    tela?.remove();
    R = null;
    E.emReuniao = false;
    E.congelado = true;
    if (d.ejetado) {
      const info = E.jogadores.get(d.ejetado.id);
      if (info) info.vivo = false;
      if (d.ejetado.id === E.eu.id) E.eu.vivo = false;
      // o anúncio sai quando a animação termina, ou por tempo (se a aba estiver em segundo plano)
      let anunciado = false;
      const fazer = () => {
        if (anunciado) return;
        anunciado = true;
        anunciar(d.ejetado.texto, d.ejetado.encrenqueiro ? 'Você foi enganado! O Encrenqueiro venceu!' : null);
      };
      mundo.animarEjecao(info, fazer);
      setTimeout(fazer, 4500);
    } else {
      anunciar(d.motivo === 'empate' ? 'Empate na votação. Ninguém foi eliminado.' : 'Ninguém foi eliminado.', null);
    }
  }, 2600);
}

function anunciar(texto, extra) {
  const a = el('div', { class: 'anuncio' }, el('div', { class: 'txt' }, texto), extra ? el('div', { class: 'txt2' }, extra) : null);
  raiz.append(a);
  setTimeout(() => a.remove(), 3200);
}

export function encerrarReuniao() {
  if (R) { clearInterval(R.timer); R.tela.remove(); R = null; }
  E.emReuniao = false;
  E.congelado = false;
}
