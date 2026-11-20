// =============================================================
// GERENCIADOR CENTRAL DE VITÓRIA
// Toda checagem de fim de jogo passa por aqui, numa ordem fixa,
// e a Partida só aceita UM resultado (ver Partida.finalizar).
//
// Ordem de prioridade:
//  1. Encrenqueiro votado para fora      -> vitória do Encrenqueiro
//  2. Sem inocentes e sem impostores vivos (sobram só neutros) -> vitória dos Neutros
//  3. Todos os impostores e neutros inimigos eliminados -> vitória dos Inocentes
//  4. Todas as tarefas do time inocente concluídas -> vitória dos Inocentes
//  5. Time impostor vivo e sobra no máximo 1 adversário vivo -> vitória dos Impostores
//     (em partidas que começam com só 1 adversário, precisa eliminar todos)
//  6. Ninguém vivo -> empate (sem vencedores)
// =============================================================
import { ALINHAMENTOS } from '../shared/papeis.js';

export function avaliarVitoria(partida, contexto = {}) {
  const todos = [...partida.jogadores.values()];

  if (contexto.encrenqueiroEjetado) {
    return montar('encrenqueiro', todos.filter((j) => j.alinhamento === 'encrenqueiro'));
  }

  const vivos = todos.filter((j) => j.vivo && !j.desconectado);
  const inocentes = vivos.filter((j) => j.alinhamento === 'inocente').length;
  const impostores = vivos.filter((j) => j.alinhamento === 'impostor').length;
  const neutros = vivos.filter((j) => ALINHAMENTOS[j.alinhamento].neutro).length;

  if (inocentes === 0 && impostores === 0 && neutros > 0) {
    return montar('neutros', todos.filter((j) => ALINHAMENTOS[j.alinhamento].neutro));
  }

  // Todos os impostores e neutros inimigos (aliado dos impostores e Encrenqueiro) eliminados
  // -> a cidade está a salvo. Só vale se a partida começou com pelo menos uma ameaça.
  const ameaca = (j) => ALINHAMENTOS[j.alinhamento].time !== 'inocentes';
  if ((partida.ameacasIniciais ?? 0) > 0 && !vivos.some(ameaca)) {
    const r = montar('inocentes', todos.filter((j) => !ameaca(j)));
    r.subtitulo = 'Todos os impostores e neutros inimigos foram eliminados. BLOX City está a salvo!';
    return r;
  }

  const { feitas, total } = partida.progresso();
  if (total > 0 && feitas >= total) {
    return montar('inocentes', todos.filter((j) => ALINHAMENTOS[j.alinhamento].time === 'inocentes'));
  }

  const timeImpostor = vivos.filter((j) => ALINHAMENTOS[j.alinhamento].time === 'impostores').length;
  const adversarios = vivos.length - timeImpostor;
  // Se a partida já começou com só 1 adversário (ex.: partida de 2), é preciso eliminar todos.
  const limite = (partida.adversariosIniciais ?? 99) > 1 ? 1 : 0;
  if (timeImpostor > 0 && adversarios <= limite) {
    return montar('impostores', todos.filter((j) => ALINHAMENTOS[j.alinhamento].time === 'impostores'));
  }

  if (vivos.length === 0) return montar('ninguem', []);
  return null;
}

const TEXTOS = {
  inocentes: { titulo: 'Os Inocentes venceram!', subtitulo: 'Todas as tarefas de BLOX City foram concluídas.' },
  impostores: { titulo: 'Os Impostores venceram!', subtitulo: 'BLOX City caiu nas mãos dos impostores.' },
  neutros: { titulo: 'Vitória dos Neutros!', subtitulo: 'Inocentes e impostores foram eliminados. Só restaram os neutros.' },
  encrenqueiro: { titulo: 'O Encrenqueiro venceu!', subtitulo: 'Você foi enganado! O objetivo do Encrenqueiro era ser votado.' },
  ninguem: { titulo: 'Ninguém venceu', subtitulo: 'Não sobrou ninguém em BLOX City.' },
};

function montar(tipo, vencedores) {
  return { tipo, ...TEXTOS[tipo], vencedores: vencedores.map((j) => j.id) };
}
