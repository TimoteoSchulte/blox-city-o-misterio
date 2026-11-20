// Catálogo de tarefas e sabotagens (expansível).
// Cada tipo de tarefa corresponde a um minijogo em client/src/tarefas/.
// `profissao`: a tarefa só é sorteada para jogadores dessa profissão.

export const TIPOS_TAREFA = {
  lavar_carro: { nome: 'Lavar o carro', dica: 'Esfregue toda a sujeira do carro.' },
  conectar_fios: { nome: 'Conectar os fios', dica: 'Ligue cada fio à tomada da mesma cor.' },
  religar_disjuntores: { nome: 'Religar os disjuntores', dica: 'Ligue todos os disjuntores.' },
  calibrar_medidor: { nome: 'Calibrar o medidor', dica: 'Pare o ponteiro na faixa verde 3 vezes.', profissao: 'eletricista' },
  desentupir_vaso: { nome: 'Desentupir o vaso', dica: 'Use o desentupidor até a água descer.', profissao: 'encanador' },
  lavar_louca: { nome: 'Lavar a louça', dica: 'Esfregue os pratos até ficarem limpos.' },
  arrumar_cama: { nome: 'Arrumar a cama', dica: 'Arraste o travesseiro e o cobertor para o lugar.' },
  regar_plantas: { nome: 'Regar as plantas', dica: 'Segure para encher o regador e solte na faixa verde.' },
  consertar_tv: { nome: 'Sintonizar a TV', dica: 'Gire a antena até a imagem ficar nítida.' },
  repor_prateleiras: { nome: 'Repor as prateleiras', dica: 'Arraste cada produto para o lugar certo.' },
  caixa_registradora: { nome: 'Fechar o caixa', dica: 'Digite o código mostrado na nota.' },
  trocar_pneu: { nome: 'Trocar o pneu', dica: 'Solte os parafusos, troque o pneu e aperte de novo.', profissao: 'mecanico' },
};

// Quantas tarefas de profissão cada um recebe (o resto é sorteado das gerais)
export const TAREFAS_DE_PROFISSAO = { encanador: 2, eletricista: 1, mecanico: 1 };

export const SABOTAGENS = {
  apagao: {
    nome: 'Apagão',
    icone: '💡',
    descricao: 'Corta a energia da cidade. A visão de todos (menos dos impostores) diminui.',
    aviso: 'APAGÃO! Restaure a energia na Usina Elétrica.',
  },
};
