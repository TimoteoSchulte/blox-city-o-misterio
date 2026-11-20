// =============================================================
// Alinhamentos e profissões (registro expansível)
// Para criar uma profissão nova: adicione uma entrada em PROFISSOES,
// coloque-a em SORTEIO_PROFISSOES e trate a 'habilidade' no servidor
// (server/Partida.js -> usarHabilidade) e no cliente (ui/hud.js).
// =============================================================

// time: a qual lado o jogador pertence para fins de vitória.
export const ALINHAMENTOS = {
  inocente: {
    nome: 'Inocente',
    titulo: 'INOCENTE',
    cor: '#4fc3f7',
    time: 'inocentes',
    neutro: false,
    podeMatar: false,
    podeSabotar: false,
    usaTuneis: false,
    tarefasContam: true,
    objetivo: 'Complete suas tarefas e descubra quem são os impostores de BLOX City.',
  },
  impostor: {
    nome: 'Impostor',
    titulo: 'IMPOSTOR',
    cor: '#ff5252',
    time: 'impostores',
    neutro: false,
    podeMatar: true,
    podeSabotar: true,
    usaTuneis: true,
    tarefasContam: false,
    objetivo: 'Elimine os adversários sem levantar suspeitas. Use sabotagens e os bueiros.',
  },
  neutro_inocente: {
    nome: 'Neutro',
    titulo: 'NEUTRO',
    subtitulo: 'Aliado dos Inocentes',
    cor: '#b388ff',
    time: 'inocentes',
    neutro: true,
    podeMatar: true,
    podeSabotar: false,
    usaTuneis: false,
    tarefasContam: true,
    objetivo:
      'Você vence com os inocentes. Pode eliminar, mas nunca um inocente nem o outro neutro, se houver (tentar eliminar um aliado só gasta sua recarga).',
  },
  neutro_impostor: {
    nome: 'Neutro',
    titulo: 'NEUTRO',
    subtitulo: 'Aliado dos Impostores',
    cor: '#b388ff',
    time: 'impostores',
    neutro: true,
    podeMatar: true,
    podeSabotar: false,
    usaTuneis: false,
    tarefasContam: false,
    objetivo:
      'Você vence com os impostores. Pode eliminar, mas nunca um impostor nem o outro neutro, se houver (tentar eliminar um aliado só gasta sua recarga).',
  },
  encrenqueiro: {
    nome: 'Encrenqueiro',
    titulo: 'ENCRENQUEIRO',
    subtitulo: 'Neutro',
    cor: '#ffb300',
    time: 'encrenqueiro',
    neutro: true,
    podeMatar: true,
    podeSabotar: false,
    usaTuneis: false,
    tarefasContam: false,
    objetivo: 'Seu objetivo é ser VOTADO para fora numa reunião. Pareça suspeito... mas não demais!',
  },
};

// Texto do anúncio quando alguém é votado para fora.
// Profissões NUNCA são reveladas aqui. Exceção: Encrenqueiro.
export function textoEjecao(nome, alinhamento) {
  if (alinhamento === 'encrenqueiro') return `${nome} era o ENCRENQUEIRO!`;
  if (alinhamento === 'impostor') return `${nome} era impostor!`;
  if (alinhamento === 'inocente') return `${nome} era inocente!`;
  return `${nome} era neutro!`;
}

export const PROFISSOES = {
  policial: {
    nome: 'Policial',
    icone: '👮',
    habilidade: 'pericia',
    descricao:
      'PERÍCIA: perto de um corpo, use sua habilidade para descobrir quem esteve perto do local pouco antes da eliminação.',
  },
  eletricista: {
    nome: 'Eletricista',
    icone: '⚡',
    habilidade: 'tablet',
    descricao:
      'TABLET: restaure a energia da cidade de qualquer lugar. Disponível após 60s de partida; recarga de 15s após cada uso.',
  },
  mecanico: {
    nome: 'Mecânico',
    icone: '🔧',
    habilidade: 'alarmes',
    descricao:
      'ALARMES: você recebe alertas de atividade suspeita perto dos veículos (eliminações e bueiros) e pode ver o histórico no seu painel.',
  },
  civil: {
    nome: 'Civil',
    icone: '🙂',
    habilidade: null,
    descricao: 'Sem habilidade especial. Faça as tarefas da cidade e fique de olho em tudo.',
  },
  encanador: {
    nome: 'Encanador',
    icone: '🪠',
    habilidade: 'tuneis',
    descricao:
      'TÚNEIS: entre nos bueiros e ande pela rede subterrânea da cidade. Tarefa especial: desentupir vasos sanitários.',
  },
};

// Quantas vagas de cada profissão especial entram no sorteio.
// O restante dos jogadores recebe "civil".
export function vagasProfissoes(total) {
  const lista = ['policial', 'eletricista', 'mecanico', 'encanador'];
  if (total >= 11) lista.push('encanador');
  return lista;
}

export function podeUsarTuneis(alinhamento, profissao) {
  return ALINHAMENTOS[alinhamento]?.usaTuneis || profissao === 'encanador';
}
