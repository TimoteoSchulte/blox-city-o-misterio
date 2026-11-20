# BLOX City: O Mistério

Jogo online de dedução social em 2D (visão de cima), de 2 a 15 jogadores, todo em português.
Inocentes, impostores e neutros, profissões sorteadas, tarefas jogáveis, sabotagem, túneis
subterrâneos, reuniões na fonte e várias formas de vencer.

---

## Como rodar no seu PC

Precisa do **Node.js 18 ou mais novo** (você já tem o 24).

1. Abra a pasta `block-city` no terminal e instale as dependências (só na primeira vez):
   ```
   npm install
   ```
2. Ligue o servidor:
   ```
   npm start
   ```
   Ou dê dois cliques em **`INICIAR-SERVIDOR.bat`**.
3. Abra **http://localhost:3100** no navegador.

Para testar sozinho com várias abas (mínimo de 2 jogadores em vez de 5):
```
npm run teste
```

## Como jogar com amigos pela internet

É automático. Ao ligar o servidor (`INICIAR-SERVIDOR.bat` ou `npm start`), ele abre um link
público usando o programa `ferramentas/cloudflared.exe` (oficial da Cloudflare, já está na pasta).
A janela do servidor mostra:

```
  LINK DO JOGO PARA SEUS AMIGOS:
  https://alguma-coisa.trycloudflare.com
```

1. Crie a sala e clique em **"Copiar link do jogo"**. O link certo é copiado mesmo que você
   esteja jogando pelo `localhost`.
2. Mande o link e o **código da sala** para os amigos.
3. Eles abrem o link, escolhem nome e avatar, digitam o código e caem na sua sala.

Importante:
- O link **muda toda vez** que o servidor liga de novo.
- Ele só funciona enquanto o seu PC e a janela do servidor estiverem abertos.
- Para desligar o link público: `node server/index.js --sem-tunel`.

### Hospedagem fixa (opcional, para ter um link permanente)
Dá para colocar o jogo de graça no **Render** (render.com):
1. Suba a pasta `block-city` para um repositório no GitHub.
2. No Render: *New → Web Service*, escolha o repositório.
3. Build command: `npm install` • Start command: `npm start`.
4. O Render define a porta sozinho (variável `PORT`); o jogo já entende isso.

No plano grátis o servidor "dorme" depois de um tempo parado e leva uns 30–60 s para acordar.

### Jogar na mesma rede Wi-Fi (sem internet externa)
Com `npm start` ligado, descubra o IP do PC (`ipconfig` → "Endereço IPv4", ex.: 192.168.0.10)
e os amigos abrem `http://192.168.0.10:3100`. Se o Windows perguntar sobre o firewall, permita
em "Redes privadas".

---

## Controles

| Ação | PC | Celular |
|---|---|---|
| Andar | **W A S D** ou setas | setinhas na tela (botão 🎮 mostra/esconde no PC) |
| Usar (tarefa, bueiro, painel, reunião na fonte) | **E** ou Espaço | botão USAR |
| Eliminar | **Q** | botão ELIMINAR |
| Relatar corpo | **R** | botão RELATAR |
| Sabotar (impostor) | **X** | botão SABOTAR |
| Habilidade da profissão | **T** | botão da profissão |
| Mapa | **M** | botão 🗺️ |
| Fechar janela | Esc | ✕ |

No celular, jogue com o aparelho **deitado**.

---

## Regras implementadas

**Entrada:** nome do jogador → avatar (homem ou mulher, cor de pele, casaco opcional,
camiseta e calça) → criar sala ou entrar com código/link.

**Sala:** até 15 jogadores. Quem cria é o administrador e só ele inicia a partida. Ninguém
escolhe papel nem profissão: tudo é sorteado.

**Alinhamentos**
- **Impostores:** de 0 a 3, sorteados (até 6 jogadores: 0–1; de 7 a 9: 0–2; 10 ou mais: 0–3).
  Eliminam, sabotam e usam os bueiros. Sabem quem são os outros impostores.
- **Neutros:** **1** neutro até 6 jogadores e **2** a partir de 7.
  - Com 1 neutro: em 40% das partidas ele é o **Encrenqueiro**; nas outras, é aliado dos
    inocentes ou dos impostores (meio a meio).
  - Com 2 neutros: um é aliado dos inocentes e o outro dos impostores. Em 40% das partidas,
    um deles vira o Encrenqueiro. Os dois sabem quem é o outro neutro e não podem eliminá-lo.
  - Partida de **2 jogadores**: 1 neutro aliado dos impostores contra 1 tripulante. O neutro
    vence se eliminar o tripulante; o tripulante vence se terminar as tarefas.
  - Neutros podem eliminar, mas não o próprio time aliado. Se tentarem, nada acontece e a
    recarga dobra.
- **Inocentes:** fazem as tarefas e tentam descobrir os impostores.

**Profissões** (independentes do alinhamento)
- **Policial:** *Perícia*. Perto de um corpo, mostra quem esteve perto do local nos 8 segundos
  antes da eliminação. O culpado sempre aparece na lista, mas outras pessoas podem aparecer junto.
- **Eletricista:** *Tablet*. Restaura a energia de qualquer lugar. Libera aos 60 s de partida
  e recarrega 15 s depois de cada uso.
- **Mecânico:** *Alertas*. Recebe avisos de alarme de carro (eliminação perto de veículos) e
  de barulho em bueiros, com histórico no painel e marcação no mapa.
- **Encanador:** anda pelos túneis e tem a tarefa especial de desentupir vasos.
- **Civil:** sem habilidade.

**Túneis:** 10 bueiros (A1–A4, B1–B4, C1, C2) ligados em rede (nem todos se conectam entre
si). Dentro do túnel você avança para um vizinho, volta para o anterior ou sai. Quem está no
túnel fica invisível. Podem usar: encanadores e impostores.

**Tarefas:** 12 minijogos de verdade: lavar o carro, conectar fios, disjuntores, calibrar o
medidor, desentupir o vaso, lavar a louça, arrumar a cama, regar plantas, sintonizar a TV,
repor prateleiras, fechar o caixa e trocar o pneu. Cada jogador recebe 5. Impostores,
o neutro aliado dos impostores e o Encrenqueiro recebem tarefas falsas.
Fantasmas do time inocente continuam podendo fazer tarefas.

**Sabotagem:** Apagão. A visão de todos diminui, menos a dos impostores. Restaura no painel da
Usina Elétrica ou pelo tablet do Eletricista.

**Reuniões:** relatando um corpo ou pelo botão de emergência (1 por jogador) perto da fonte.
São 30 s de discussão com chat, depois 45 s de votação, com um botão por jogador e o botão
"Pular voto". Quem sai é jogado na fonte numa animação cômica e o jogo anuncia só o
alinhamento ("Fulano era inocente/impostor/neutro!"). A exceção é o Encrenqueiro, que é
revelado e vence.

**Empate na votação:** ninguém sai. Isso se muda em `shared/config.js` → `EMPATE: 'sorteio'`.
Se os votos de "pular" forem iguais ou maiores que os do mais votado, ninguém sai.

**Vitória** (o gerenciador central confere nesta ordem, então nunca aparecem duas telas):
1. Encrenqueiro votado para fora → **Encrenqueiro vence**.
2. Não sobrou nenhum inocente nem impostor vivo, só o neutro → **Vitória do Neutro**.
3. Todos os impostores e neutros inimigos (aliado dos impostores e Encrenqueiro) eliminados,
   por votação ou eliminação → **Inocentes vencem** (o neutro aliado dos inocentes vence junto).
4. Todas as tarefas do time inocente concluídas → **Inocentes vencem** (inclusive o neutro aliado),
   mesmo em partidas sem impostores.
5. Time impostor vivo e sobra no máximo 1 adversário vivo → **Impostores vencem** (inclusive o neutro aliado).
   Se a partida começou com só 1 adversário (partida de 2), é preciso eliminar todos.

---

## Estrutura do código

```
block-city/
  server/index.js     servidor (Express + Socket.IO), salas e lobby
  server/Partida.js   lógica autoritativa da partida (papéis, movimento, eliminações,
                      tarefas, sabotagem, túneis, habilidades, reuniões)
  server/vitoria.js   gerenciador central de vitória
  shared/config.js    TODOS os números do jogo (tempos, recargas, alcances, avatar)
  shared/papeis.js    alinhamentos e profissões (adicione profissões novas aqui)
  shared/mapa.js      mapa da cidade, casas, túneis, pontos de tarefa
  shared/tarefas.js   catálogo de tarefas e sabotagens
  shared/colisao.js   colisão (usada pelo cliente e pelo servidor)
  client/             o jogo no navegador (Phaser 3 + telas em HTML)
    src/mundo/        mapa desenhado, personagens, visão, telhados, animação da fonte
    src/ui/           telas, HUD, reunião, túneis, tablet, revelação, vitória
    src/tarefas/      minijogos
```

O servidor é quem decide tudo o que importa e cada jogador só recebe as informações do próprio
papel. Movimentos impossíveis (rápidos demais ou atravessando paredes) são corrigidos.

### Para testes (só quem roda o servidor)
- `node server/index.js --minimo=2` reduz o mínimo de jogadores.
- `node server/index.js --minimo=2 --papeis=impostor:encanador,inocente:eletricista,...` fixa
  papéis na ordem de entrada na sala. O administrador da sala nunca tem essa opção.
- `?toque=1` no endereço mostra as setinhas no PC.

## Ideias para depois
- Mais sabotagens (o sistema já aceita: `shared/tarefas.js` → `SABOTAGENS`).
- Mais profissões (`shared/papeis.js`).
- Armários nas casas para se esconder.
- Sons e música.
