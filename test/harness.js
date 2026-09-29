'use strict'

// Arranca o index.js de verdade, com o Mineflayer e o readline substituídos,
// para poder verificar o arranque e os comandos sem ligar a servidor nenhum.
//
// Usado por test/arranque.js. Não se corre directamente.

const Module = require('module')
const EventEmitter = require('events')

// ---- Mineflayer falso -----------------------------------------------------
const eventos = []
class BotFalso extends EventEmitter {
  constructor(opcoes) {
    super()
    this.opcoes = opcoes
    this.username = opcoes.username
    const pos = { x: 0, y: 64, z: 0 }
    pos.clone = () => ({ x: pos.x, y: pos.y, z: pos.z })
    this.entity = { position: pos, yaw: 0, onGround: true }
    this.players = { [opcoes.username]: { ping: 42 } }
    this.chats = []
    this.estados = {}
    this.looks = 0
    this._client = { write: () => {}, removeAllListeners() {}, on() {}, end() {}, socket: { destroy() {} } }
  }
  // O movimento anti-AFK usa estes
  setControlState(chave, valor) {
    this.estados[chave] = valor
    eventos.push(`controlo:${chave}=${valor}`)
  }
  clearControlStates() {
    this.estados = {}
    eventos.push('controlo:limpo')
  }
  look() {
    this.looks += 1
  }
  respawn() {
    eventos.push('respawn')
  }
  chat(msg) {
    this.chats.push(msg)
  }
  quit(motivo) {
    eventos.push(`quit:${motivo}`)
    this.emit('end')
  }
}

let ultimoBot = null
const mineflayerFalso = {
  createBot: (opcoes) => {
    eventos.push(`createBot:${opcoes.host}:${opcoes.port}:${opcoes.version}:${opcoes.username}:${opcoes.auth}`)
    ultimoBot = new BotFalso(opcoes)
    return ultimoBot
  }
}

// ---- readline falso: guarda o handler para o teste poder enviar linhas ----
let handlerDeLinha = null
const interfaceFalsa = {
  prompt: () => {},
  question: () => {},
  on: () => interfaceFalsa
}
interfaceFalsa.on = (evento, fn) => {
  if (evento === 'line') handlerDeLinha = fn
  return interfaceFalsa
}
const readlineFalso = {
  createInterface: () => interfaceFalsa
}

// ---- Intercepta os dois módulos -------------------------------------------
const original = Module._load
Module._load = function (pedido, pai, semCache) {
  if (pedido === 'mineflayer') return mineflayerFalso
  if (pedido === 'readline') return readlineFalso
  return original.call(this, pedido, pai, semCache)
}

process.stdout.write = process.stdout.write.bind(process.stdout)

// ---- Arranca o bot --------------------------------------------------------
// AFK_TEST_SETTINGS aponta para outro settings.json (usado pelo teste multi-bot)
if (process.env.AFK_TEST_SETTINGS) {
  const destino = require('path').join(__dirname, 'settings.json')
  require('fs').copyFileSync(process.env.AFK_TEST_SETTINGS, destino)
}

require('../index.js')

// Dá tempo ao init() e ao createBot()
setTimeout(() => {
  if (!ultimoBot) {
    console.log('FALHA: o bot não tentou ligar-se')
    process.exit(2)
  }
  if (!handlerDeLinha) {
    console.log('FALHA: o terminal não registou handler de comandos')
    process.exit(3)
  }
  // Comandos que não devem rebentar
  const comandos = [
    '/server', '/typeinfo', '/ping', '/pos', '/help', '/comando-que-nao-existe',
    '/version', '/lang', '/andar', '/andar on', '/andar nope', '/bots', '/diagnostico', '/andar off'
  ];
  for (const linha of comandos) {
    handlerDeLinha(linha);
    // Um tique de física depois de cada comando: o movimento anti-AFK só age
    // com o bot ligado e dentro do mundo
    if (ultimoBot) ultimoBot.emit('physicsTick');
  }
  // Comando que escreve a configuração
  handlerDeLinha('/changeserver 127.0.0.1:25570')
  handlerDeLinha('/changename bot_teste')
  // Um tique de física, para o movimento anti-AFK fazer o seu trabalho
  if (ultimoBot) {
    ultimoBot.emit('physicsTick')
  }
  if (!ultimoBot) {
    console.log('FALHA: o bot desapareceu')
    process.exit(4)
  }
  console.log(`EVENTOS:${eventos.join('|')}`)
  handlerDeLinha('/stop')
  // /stop chama process.exit; se chegar aqui é que não saiu
  console.log('FALHA: /stop não parou o processo')
  process.exit(5)
}, 150)
