// =============================================================
// BLOX City: O Mistério — regras e números do jogo
// Usado pelo servidor (autoritativo) e pelo cliente (interface).
// Tempos em segundos, distâncias em pixels do mundo.
// =============================================================

export const REGRAS = {
  MAX_JOGADORES: 15,
  MIN_JOGADORES: 2, // dá para jogar até em dupla (neutro contra 1 tripulante)

  // Movimento
  VELOCIDADE: 240,
  RAIO_JOGADOR: 15,

  // Visão
  VISAO: 360,
  VISAO_APAGAO: 120,

  // Alcances
  ALCANCE_MATAR: 95,
  ALCANCE_RELATAR: 140,
  ALCANCE_USAR: 75,
  ALCANCE_EMERGENCIA: 240, // distância do centro da fonte (a borda fica a ~150)

  // Recargas (cooldowns)
  RECARGA_MATAR_INICIAL: 15,
  RECARGA_MATAR: 30,
  RECARGA_MATAR_NEUTRO_INICIAL: 25,
  RECARGA_MATAR_NEUTRO: 45,
  PENALIDADE_ALIADO: 2, // neutro que tenta eliminar um aliado: recarga x2
  RECARGA_SABOTAGEM_INICIAL: 20,
  RECARGA_SABOTAGEM: 30,
  RECARGA_ELETRICISTA_INICIAL: 60, // confirmado no design
  RECARGA_ELETRICISTA: 15,         // confirmado no design
  RECARGA_PERICIA: 25,
  RECARGA_EMERGENCIA_INICIAL: 20,
  REUNIOES_EMERGENCIA: 1, // por jogador, por partida

  // Perícia do Policial
  PERICIA_JANELA: 8,   // segundos antes da morte que entram na análise
  PERICIA_RAIO: 420,   // quem esteve a essa distância do local

  // Alarme do Mecânico
  ALARME_RAIO_CARRO: 320,

  // Túneis
  TUNEL_TEMPO_VIAGEM: 0.7,

  // Reunião
  TEMPO_DISCUSSAO: 30,
  TEMPO_VOTACAO: 45,
  TEMPO_ANIMACAO_EJECAO: 10,
  EMPATE: 'ninguem', // 'ninguem' = ninguém sai | 'sorteio' = sorteia entre os empatados
  VOTOS_ANONIMOS: false,

  // Tarefas
  TAREFAS_POR_JOGADOR: 5,
  TEMPO_MINIMO_TAREFA: 1.2, // anti-trapaça: tarefa não pode ser concluída mais rápido que isso

  // Sorteio
  CHANCE_ENCRENQUEIRO: 0.4, // chance do neutro da partida ser o Encrenqueiro
};

// Máximo de impostores conforme o tamanho da sala.
// O número real é sorteado entre 0 e esse máximo (o admin não escolhe).
export function maxImpostores(totalJogadores) {
  if (totalJogadores <= 6) return 1;
  if (totalJogadores <= 9) return 2;
  return 3;
}

// Neutros: 1 até 6 jogadores; 2 a partir de 7.
export function qtdNeutrosPara(totalJogadores) {
  return totalJogadores >= 7 ? 2 : 1;
}

// ---------- AVATAR ----------
// Dois modelos (homem e mulher). O jogador escolhe a cor da pele e
// as cores de casaco (opcional), camiseta e calça.
export const AVATAR = {
  generos: [
    { id: 'm', nome: 'Homem' },
    { id: 'f', nome: 'Mulher' },
  ],
  peles: ['#ffe0c4', '#f6c9a0', '#e3a87a', '#c68654', '#9a6340', '#6b4128', '#4a2c1a'],
  roupas: [
    '#e53935', '#1e88e5', '#43a047', '#fdd835', '#fb8c00', '#8e24aa', '#f06292', '#26c6da',
    '#f2f2f2', '#3a3b42', '#8d6e63', '#c0ca33', '#8a1c4a', '#283593', '#e8c9a0', '#607d8b',
  ],
};

export const AVATAR_PADRAO = { genero: 'm', pele: '#e3a87a', camiseta: '#1e88e5', calca: '#283593', casaco: null };

// Garante que o avatar recebido do cliente só usa opções válidas.
export function validarAvatar(a) {
  const ok = (lista, v, padrao) => (lista.includes(v) ? v : padrao);
  a = a && typeof a === 'object' ? a : {};
  return {
    genero: a.genero === 'f' ? 'f' : 'm',
    pele: ok(AVATAR.peles, a.pele, AVATAR_PADRAO.pele),
    camiseta: ok(AVATAR.roupas, a.camiseta, AVATAR_PADRAO.camiseta),
    calca: ok(AVATAR.roupas, a.calca, AVATAR_PADRAO.calca),
    casaco: a.casaco == null ? null : ok(AVATAR.roupas, a.casaco, null),
  };
}

export function validarNome(n) {
  n = String(n || '').replace(/[<>]/g, '').trim().slice(0, 14);
  return n || 'Jogador';
}
