// Conexão com o servidor (Socket.IO). Toda decisão importante é do servidor.
/* global io */
export const socket = io({ transports: ['websocket', 'polling'] });

// Envia e espera a resposta do servidor
export function pedir(evento, dados = {}) {
  return new Promise((ok) => {
    let respondeu = false;
    socket.emit(evento, dados, (r) => { respondeu = true; ok(r || { ok: false }); });
    setTimeout(() => { if (!respondeu) ok({ ok: false, erro: 'Sem resposta do servidor.' }); }, 6000);
  });
}
