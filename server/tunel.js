// =============================================================
// Link público automático (túnel gratuito da Cloudflare)
// Ao ligar o servidor, tenta abrir um túnel com o programa "cloudflared".
// O link (https://....trycloudflare.com) fica disponível em /api/link,
// e é ele que o botão "Copiar link do jogo" copia.
// - Se a variável LINK_PUBLICO estiver definida (ex.: hospedagem fixa), usa ela.
// - Se o cloudflared não estiver instalado, o jogo funciona só local.
// - Para desligar: node server/index.js --sem-tunel
// =============================================================
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const pastaJogo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// No Render, o próprio Render informa o link fixo em RENDER_EXTERNAL_URL.
const LINK_FIXO = process.env.LINK_PUBLICO || process.env.RENDER_EXTERNAL_URL || null;
let linkPublico = LINK_FIXO;
export const obterLink = () => linkPublico;

function acharCloudflared() {
  const candidatos = [
    process.env.CLOUDFLARED,
    path.join(pastaJogo, 'ferramentas', 'cloudflared.exe'), // dentro da pasta do jogo
    path.join(pastaJogo, 'ferramentas', 'cloudflared'),
  ].filter(Boolean);
  for (const c of candidatos) if (fs.existsSync(c)) return c;
  return 'cloudflared'; // tenta pelo PATH
}

let proc = null;
let encerrando = false;
let falhasSeguidas = 0;
let semPrograma = false;

export function abrirTunel(porta) {
  if (LINK_FIXO) { console.log('Link fixo do jogo: ' + LINK_FIXO); return; }
  if (process.argv.includes('--sem-tunel')) return;
  const fechar = () => { encerrando = true; try { proc?.kill(); } catch (e) { /* ok */ } };
  process.on('exit', fechar);
  process.on('SIGINT', () => { fechar(); process.exit(0); });
  iniciar(porta);
  // Vigia: a cada 45 s confere se o link público responde; se cair, reabre o túnel
  setInterval(() => vigiar(porta), 45000);
}

function iniciar(porta) {
  if (encerrando) return;
  linkPublico = null;
  try {
    proc = spawn(acharCloudflared(), ['tunnel', '--no-autoupdate', '--url', `http://localhost:${porta}`], { windowsHide: true });
  } catch (e) {
    semPrograma = true;
    avisoSemTunel();
    return;
  }
  const este = proc;
  este.on('error', () => { semPrograma = true; avisoSemTunel(); });
  const ler = (buf) => {
    const m = String(buf).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (m && este === proc && !linkPublico) {
      linkPublico = m[0];
      falhasSeguidas = 0;
      console.log('\n==================================================');
      console.log('  LINK DO JOGO PARA SEUS AMIGOS:');
      console.log('  ' + linkPublico);
      console.log('  (se o servidor for religado, este link muda)');
      console.log('==================================================\n');
    }
  };
  este.stdout.on('data', ler);
  este.stderr.on('data', ler);
  este.on('exit', () => {
    if (este !== proc || encerrando || semPrograma) return;
    console.log('O túnel caiu. Abrindo um novo link em 5 segundos...');
    linkPublico = null;
    setTimeout(() => iniciar(porta), 5000);
  });
}

async function vigiar(porta) {
  if (encerrando || semPrograma || !proc) return;
  if (!linkPublico) return;
  try {
    const r = await fetch(linkPublico + '/api/link', { signal: AbortSignal.timeout(15000) });
    falhasSeguidas = r.ok ? 0 : falhasSeguidas + 1;
  } catch (e) {
    falhasSeguidas++;
  }
  if (falhasSeguidas >= 3) {
    console.log('O link público parou de responder. Reabrindo o túnel (o link vai mudar)...');
    falhasSeguidas = 0;
    const velho = proc;
    proc = null;
    try { velho.kill(); } catch (e) { /* ok */ }
    setTimeout(() => iniciar(porta), 2000);
  }
}

function avisoSemTunel() {
  console.log('\n(cloudflared não encontrado: o jogo só funciona neste PC/rede.');
  console.log(' Coloque o cloudflared.exe em block-city/ferramentas/ para ter link público.)\n');
}
