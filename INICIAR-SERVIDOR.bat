@echo off
title BLOX City: O Misterio - servidor
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando dependencias pela primeira vez...
  call npm install
)
echo.
echo Abrindo o jogo em http://localhost:3100
echo O LINK DO JOGO PARA SEUS AMIGOS vai aparecer abaixo em alguns segundos.
echo Para fechar o servidor, feche esta janela.
echo.
start "" http://localhost:3100
node server\index.js
pause
