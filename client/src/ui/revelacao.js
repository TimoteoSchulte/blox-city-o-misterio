// Revelação do papel no início, tela de eliminação e tela de vitória/derrota.
import { ALINHAMENTOS, PROFISSOES } from '/shared/papeis.js';
import { E, el, raiz, nomeDe } from '../estado.js';
import { retrato } from '../avatar.js';

export function revelarPapel() {
  const al = ALINHAMENTOS[E.eu.alinhamento];
  const prof = PROFISSOES[E.eu.profissao];
  const aliados = [...E.aliados.entries()];
  const caixaAliados = aliados.length
    ? el('div', {},
      el('div', { style: { marginTop: '12px', color: 'var(--suave)' } }, E.eu.alinhamento === 'impostor' ? 'Seus parceiros impostores:' : 'O outro neutro é:'),
      el('div', { class: 'aliados' }, aliados.map(([id]) => el('div', { style: { textAlign: 'center' } }, retrato(E.jogadores.get(id).avatar, 56), el('b', {}, nomeDe(id))))))
    : E.eu.alinhamento === 'impostor' ? el('div', { style: { marginTop: '12px', color: 'var(--suave)' } }, 'Você é o único impostor desta partida.') : null;
  const tela = el('div', { class: 'revelacao' },
    el('div', { class: 'voce' }, 'Você é...'),
    el('div', { class: 'papel', style: { color: al.cor } }, al.titulo),
    al.subtitulo ? el('div', { class: 'subpapel', style: { color: al.cor } }, al.subtitulo) : null,
    el('div', { class: 'obj' }, al.objetivo),
    el('div', { class: 'cartao-prof' }, el('div', { class: 'ic' }, prof.icone),
      el('div', {}, el('div', { style: { fontWeight: 800, fontSize: '20px' } }, 'Profissão: ' + prof.nome), el('div', { style: { color: 'var(--suave)' } }, prof.descricao))),
    caixaAliados,
    el('div', { style: { marginTop: '18px', color: 'var(--suave)', fontSize: '14px' } }, 'Toque para começar'));
  raiz.append(tela);
  E.congelado = true;
  const fechar = () => { if (!tela.isConnected) return; tela.remove(); E.congelado = false; };
  tela.addEventListener('pointerdown', fechar);
  setTimeout(fechar, 7000);
}

export function telaMorte(assassinoId) {
  const info = E.jogadores.get(assassinoId);
  const tela = el('div', { class: 'morte' },
    el('div', { class: 't' }, 'Você foi eliminado!'),
    info ? el('div', { style: { marginTop: '8px' } }, retrato(info.avatar, 80), el('div', { style: { fontWeight: 800, fontSize: '20px' } }, `por ${info.nome}`)) : null,
    el('p', { style: { maxWidth: '520px', color: '#ffcdd2' } }, 'Agora você é um fantasma: pode andar através das paredes, ver os outros fantasmas e continuar fazendo suas tarefas para ajudar seu time.'));
  raiz.append(tela);
  const fechar = () => tela.remove();
  tela.addEventListener('pointerdown', fechar);
  setTimeout(fechar, 4000);
}

export function telaVitoria(d, aoVoltar) {
  const venci = d.vencedores.includes(E.eu.id);
  const cor = { inocentes: '#4fc3f7', impostores: '#ff5252', neutros: '#b388ff', encrenqueiro: '#ffb300', ninguem: '#bdbdbd' }[d.tipo];
  const grade = el('div', { class: 'grade' });
  for (const j of d.revelacao) {
    const al = ALINHAMENTOS[j.alinhamento];
    const prof = PROFISSOES[j.profissao];
    grade.append(el('div', { class: 'rev' + (d.vencedores.includes(j.id) ? ' venceu' : '') },
      retrato(j.avatar, 60, { morto: !j.vivo }),
      el('div', { style: { fontWeight: 800 } }, j.nome + (j.id === E.eu.id ? ' (você)' : '')),
      el('div', { class: 'al', style: { color: al.cor } }, al.nome + (al.subtitulo && al.neutro && j.alinhamento !== 'encrenqueiro' ? ` (${al.subtitulo})` : '')),
      el('div', {}, `${prof.icone} ${prof.nome}`),
      el('div', { style: { color: 'var(--suave)', fontSize: '12px' } }, j.desconectado ? 'saiu' : j.vivo ? 'vivo' : 'eliminado')));
  }
  const tela = el('div', { class: 'vitoria' },
    el('div', { class: 'caixa larga', style: { textAlign: 'center' } },
      el('div', { class: 'resultado', style: { color: d.tipo === 'ninguem' ? cor : venci ? '#5ee08a' : '#ff5252' } }, d.tipo === 'ninguem' ? 'FIM DE JOGO' : venci ? 'VITÓRIA!' : 'DERROTA'),
      el('h2', { style: { color: cor, marginTop: '8px' } }, d.titulo),
      el('p', { class: 'sub' }, d.subtitulo),
      grade,
      el('button', { class: 'btn', onclick: () => { tela.remove(); aoVoltar(); } }, '↩ Voltar ao lobby')));
  raiz.append(tela);
}
