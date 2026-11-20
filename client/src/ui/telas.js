// Telas antes da partida: nome -> avatar -> menu (criar/entrar) -> lobby
import { AVATAR, REGRAS } from '/shared/config.js';
import { E, el, limparTela, raiz, salvarPerfil, toast } from '../estado.js';
import { socket, pedir } from '../rede.js';
import { canvasAvatar, retrato } from '../avatar.js';

const codigoNoLink = () => (new URLSearchParams(location.search).get('sala') || '').toUpperCase();

function logo() {
  return el('div', { class: 'logo' },
    el('span', { class: 'l1' }, 'BLOX CITY'),
    el('span', { class: 'l2' }, el('span', { class: 'lupa' }, '🔍'), ' O Mistério'));
}

// ---------------------------------------------------------- 1. NOME
export function telaNome() {
  E.fase = 'menu';
  E.tela = 'nome';
  document.body.classList.remove('em-jogo');
  limparTela();
  const campo = el('input', { class: 'campo', maxlength: 14, placeholder: 'Seu nome de jogador', value: E.perfil.nome || '' });
  const erro = el('div', { class: 'erro-msg' });
  const seguir = () => {
    const nome = campo.value.replace(/[<>]/g, '').trim();
    if (nome.length < 2) { erro.textContent = 'Digite um nome com pelo menos 2 letras.'; return; }
    E.perfil.nome = nome;
    salvarPerfil();
    telaAvatar();
  };
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') seguir(); });
  const cod = codigoNoLink();
  raiz.append(el('div', { class: 'tela' },
    el('div', { class: 'caixa' },
      logo(),
      el('div', { class: 'espaco' }),
      el('h2', {}, 'Escolha seu nome de jogador'),
      cod ? el('p', { class: 'sub' }, `Você foi convidado para a sala ${cod}!`) : el('p', { class: 'sub' }, 'É assim que os outros vão te ver na cidade.'),
      campo,
      erro,
      el('button', { class: 'btn cheio', onclick: seguir }, 'Continuar ➜'),
    )));
  setTimeout(() => campo.focus(), 50);
}

// ---------------------------------------------------------- 2. AVATAR
// voltarPara: função chamada ao confirmar (padrão: menu)
export function telaAvatar(voltarPara) {
  E.tela = 'avatar';
  limparTela();
  const av = { ...E.perfil.avatar };
  let aba = av.casaco ? 'casaco' : 'camiseta';

  const previa = el('div', { class: 'previa' });
  const desenhar = () => {
    previa.innerHTML = '';
    const c = canvasAvatar(av, { vista: 'frente' }, 4);
    c.style.width = '160px';
    c.style.height = '213px';
    previa.append(c);
    previa.append(el('div', { style: { fontWeight: 800, fontSize: '20px' } }, E.perfil.nome));
  };

  const botoesGenero = el('div', { class: 'generos' });
  const desenharGeneros = () => {
    botoesGenero.innerHTML = '';
    for (const g of AVATAR.generos) {
      botoesGenero.append(el('button', {
        class: 'btn ' + (av.genero === g.id ? '' : 'sec'),
        onclick: () => { av.genero = g.id; desenharGeneros(); desenhar(); },
      }, g.id === 'm' ? '👦 ' + g.nome : '👧 ' + g.nome));
    }
  };

  const paletaPele = el('div', { class: 'paleta' });
  const desenharPele = () => {
    paletaPele.innerHTML = '';
    for (const p of AVATAR.peles) {
      paletaPele.append(el('div', {
        class: 'cor' + (av.pele === p ? ' sel' : ''), style: { background: p }, title: 'Cor de pele',
        onclick: () => { av.pele = p; desenharPele(); desenhar(); },
      }));
    }
  };

  const abas = el('div', { class: 'abas' });
  const paletaRoupa = el('div', { class: 'paleta' });
  const NOMES = { casaco: '🧥 Casaco', camiseta: '👕 Camiseta', calca: '👖 Calça' };
  const desenharRoupas = () => {
    abas.innerHTML = '';
    for (const k of ['casaco', 'camiseta', 'calca']) {
      abas.append(el('button', { class: 'aba' + (aba === k ? ' ativa' : ''), onclick: () => { aba = k; desenharRoupas(); } }, NOMES[k]));
    }
    paletaRoupa.innerHTML = '';
    if (aba === 'casaco') {
      paletaRoupa.append(el('div', {
        class: 'cor nenhum' + (av.casaco == null ? ' sel' : ''),
        onclick: () => { av.casaco = null; desenharRoupas(); desenhar(); },
      }, 'SEM CASACO'));
    }
    for (const c of AVATAR.roupas) {
      paletaRoupa.append(el('div', {
        class: 'cor' + (av[aba] === c ? ' sel' : ''), style: { background: c },
        onclick: () => { av[aba] = c; desenharRoupas(); desenhar(); },
      }));
    }
  };

  const confirmar = () => {
    E.perfil.avatar = av;
    salvarPerfil();
    if (E.sala) socket.emit('sala:perfil', E.perfil);
    (voltarPara || telaMenu)();
  };

  raiz.append(el('div', { class: 'tela' },
    el('div', { class: 'caixa larga' },
      el('h2', {}, 'Escolha seu avatar'),
      el('div', { class: 'editor' },
        el('div', {}, previa, botoesGenero),
        el('div', {},
          el('div', { class: 'aba-titulo' }, 'Cor de pele'),
          paletaPele,
          el('div', { class: 'aba-titulo' }, 'Roupas'),
          abas,
          paletaRoupa,
          el('div', { class: 'linha' },
            el('button', { class: 'btn sec', onclick: () => telaNome() }, '✎ Mudar nome'),
            el('button', { class: 'btn', style: { flex: 1 }, onclick: confirmar }, 'Pronto! ➜')),
        ),
      ),
    )));
  desenhar(); desenharGeneros(); desenharPele(); desenharRoupas();
}

// ---------------------------------------------------------- 3. MENU
export function telaMenu() {
  E.tela = 'menu';
  E.fase = 'menu';
  limparTela();
  const cod = codigoNoLink();
  if (cod) {
    // veio por link de convite: entra direto
    entrarNaSala(cod).then((ok) => { if (!ok) { history.replaceState(null, '', location.pathname); telaMenu(); } });
    raiz.append(el('div', { class: 'tela' }, el('div', { class: 'caixa' }, logo(), el('p', { class: 'sub' }, `Entrando na sala ${cod}...`))));
    return;
  }
  const campo = el('input', { class: 'campo', maxlength: 5, placeholder: 'CÓDIGO', style: { textTransform: 'uppercase', letterSpacing: '6px' } });
  const erro = el('div', { class: 'erro-msg' });
  const criar = async () => {
    const r = await pedir('sala:criar', E.perfil);
    if (!r.ok) erro.textContent = r.erro || 'Não foi possível criar a sala.';
  };
  const entrar = async () => {
    const c = campo.value.trim().toUpperCase();
    if (c.length < 4) { erro.textContent = 'Digite o código da sala.'; return; }
    const r = await pedir('sala:entrar', { codigo: c, ...E.perfil });
    if (!r.ok) erro.textContent = r.erro || 'Não foi possível entrar.';
  };
  campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') entrar(); });
  atualizarCaixaLink();
  const mini = retrato(E.perfil.avatar, 56);
  raiz.append(el('div', { class: 'tela' },
    el('div', { class: 'caixa' },
      logo(),
      el('div', { class: 'linha centro', style: { margin: '10px 0' } }, mini,
        el('div', {}, el('div', { style: { fontWeight: 800, fontSize: '20px' } }, E.perfil.nome),
          el('a', { href: '#', style: { color: 'var(--amarelo)' }, onclick: (e) => { e.preventDefault(); telaAvatar(); } }, 'editar avatar'))),
      el('button', { class: 'btn cheio', onclick: criar }, '🏙️ Criar sala'),
      el('div', { class: 'espaco' }),
      el('div', { class: 'linha' }, el('div', { style: { flex: 1 } }, campo), el('button', { class: 'btn sec', onclick: entrar }, 'Entrar')),
      erro,
      el('div', { class: 'info-sorteio' }, `De ${REGRAS.MIN_JOGADORES} a ${REGRAS.MAX_JOGADORES} jogadores • Papéis e profissões são sorteados`),
      caixaLink,
    )));
}

// Mostra o link público atual do jogo (com botão de copiar)
const caixaLink = el('div', { style: { textAlign: 'center', marginTop: '10px', fontSize: '14px', color: 'var(--suave)', wordBreak: 'break-all' } });
async function atualizarCaixaLink() {
  try {
    const d = await (await fetch('/api/link')).json();
    const link = d.link || (/localhost|127\.0\.0\.1/.test(location.origin) ? null : location.origin);
    caixaLink.innerHTML = '';
    if (!link) { caixaLink.textContent = 'Gerando o link público do jogo...'; setTimeout(atualizarCaixaLink, 3000); return; }
    caixaLink.append('Link do jogo: ', el('b', { style: { color: 'var(--amarelo)' } }, link), ' ',
      el('a', { href: '#', style: { color: 'var(--texto)' }, onclick: async (e) => {
        e.preventDefault();
        try { await navigator.clipboard.writeText(link); toast('Link do jogo copiado!', 'ok'); } catch (er) { prompt('Copie o link do jogo:', link); }
      } }, '(copiar)'));
  } catch (e) { /* sem servidor */ }
}
atualizarCaixaLink();

async function entrarNaSala(codigo) {
  const r = await pedir('sala:entrar', { codigo, ...E.perfil });
  if (!r.ok) toast(r.erro || 'Não foi possível entrar na sala.', 'erro', 5000);
  return r.ok;
}

// ---------------------------------------------------------- 4. LOBBY
export function telaLobby() {
  const s = E.sala;
  if (!s) return telaMenu();
  E.fase = 'lobby';
  E.tela = 'lobby';
  document.body.classList.remove('em-jogo');
  limparTela();
  const souAdmin = s.admin === socket.id;
  const linkLocal = location.origin;
  const erro = el('div', { class: 'erro-msg' });
  const lista = el('div', { class: 'lista-jog' });
  for (const j of s.jogadores) {
    lista.append(el('div', { class: 'jog' + (j.id === socket.id ? ' eu' : '') },
      s.admin === j.id ? el('span', { class: 'coroa', title: 'Administrador' }, '👑') : null,
      retrato(j.avatar, 72),
      el('div', { class: 'nome' }, j.nome)));
  }
  const iniciar = async () => {
    const r = await pedir('sala:iniciar');
    if (!r.ok && r.erro) erro.textContent = r.erro;
  };
  // Link do JOGO (não da sala): o servidor informa o link público, se existir
  const linkTexto = el('div', { style: { color: 'var(--suave)', fontSize: '14px', marginTop: '6px', wordBreak: 'break-all' } }, '');
  let link = linkLocal;
  const ehLocal = (u) => /localhost|127\.0\.0\.1/.test(u);
  fetch('/api/link').then((r) => r.json()).then((d) => {
    if (d.link) link = d.link;
    linkTexto.textContent = ehLocal(link)
      ? '⚠ Link público ainda não disponível: este endereço só funciona no seu PC.'
      : link;
  }).catch(() => { linkTexto.textContent = link; });
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast(`Link do jogo copiado! Seus amigos abrem, criam o personagem e digitam o código ${s.codigo}.`, 'ok', 5000);
    } catch (e) { prompt('Copie o link do jogo:', link); }
  };
  const falta = Math.max(0, s.minimo - s.jogadores.length);
  raiz.append(el('div', { class: 'tela' },
    el('div', { class: 'caixa larga' },
      el('div', { class: 'codigo-sala' },
        el('div', { style: { color: 'var(--suave)' } }, 'Código da sala'),
        el('div', { class: 'cod' }, s.codigo),
        el('button', { class: 'btn sec', onclick: copiar }, '🔗 Copiar link do jogo'),
        linkTexto),
      el('div', { style: { textAlign: 'center', fontWeight: 700 } }, `Jogadores: ${s.jogadores.length}/${s.maximo}`),
      lista,
      el('div', { class: 'info-sorteio' },
        'Impostores (0 a 3), neutros (1 até 6 jogadores, 2 a partir de 7) e profissões são sorteados no início. Ninguém escolhe o próprio papel.'),
      el('div', { class: 'espaco' }),
      erro,
      el('div', { class: 'linha centro' },
        el('button', { class: 'btn sec', onclick: () => telaAvatar(telaLobby) }, '🎨 Avatar'),
        el('button', { class: 'btn verm', onclick: () => { socket.emit('sala:sair'); E.sala = null; history.replaceState(null, '', location.pathname); telaMenu(); } }, 'Sair'),
        souAdmin
          ? el('button', { class: 'btn', onclick: iniciar, disabled: falta > 0 }, falta > 0 ? `Faltam ${falta} jogador(es)` : '▶ Iniciar partida')
          : el('div', { style: { color: 'var(--suave)', fontWeight: 700 } }, 'Aguardando o administrador iniciar...')),
    )));
}
