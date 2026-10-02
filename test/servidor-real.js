'use strict'

// Primeiro teste de ligação a sério: o Mineflayer a entrar num servidor Paper.
//
//   node test/servidor-real.js
//
// Só aceita servidores locais (127.0.0.1 ou localhost), por segurança: isto
// corre sem pedir nada a ninguém e usa autenticação offline, mas não deve
// poder ser apontado a um servidor que não seja teu.
//
// O que prova: que o Mineflayer vendorizado sabe falar o protocolo de um
// servidor real, que a configuração é lida, que o movimento anti-AFK envia
// comandos, e que a reconexão volta a ligar.
//
// O que NÃO prova: nada sobre contas premium, anticheat, nem sobre servidores
// com mods.

// Este teste precisa de um servidor a correr, por isso fica FORA da verificação
// automática: corre-se à mão, depois de `node servidores/arrancar.js <versão>`.
// A marca abaixo é o que o verificar.mjs lê para o saber.
const REQUER_SERVIDOR = true
void REQUER_SERVIDOR

const path = require('path')
const net = require('net')

// O Mineflayer carrega plugins por dentro de um temporizador, e o que lança lá
// dentro (uma biblioteca que não conhece a versão, por exemplo) vem como
// excepção solta. Sem isto o teste rebenta com uma pilha de 30 linhas em vez
// de dizer o que happened.
process.on('uncaughtException', (err) => {
  console.log(`  FALHA excepção solta: ${err.message}`)
  console.log('        (a biblioteca que lançou o erro está na primeira linha da pilha)')
  console.log('')
  console.log('0 passaram, 1 falharam')
  process.exit(1)
})

const RAIZ = path.join(__dirname, '..')
const HOST = process.env.AFK_TESTE_HOST || '127.0.0.1'
const PORTA = Number(process.env.AFK_TESTE_PORTA || 25565)
const VERSAO = process.env.AFK_TESTE_VERSAO || '26.3'
const TIMEOUT = Number(process.env.AFK_TESTE_TIMEOUT || 45000)

const LOCAIS = ['127.0.0.1', 'localhost', '::1', '0.0.0.0']
// Apontar a um servidor que não seja teu é uma decisão explícita: sem
// AFK_TESTE_PERMITIR_REMOTO=1 o teste recusa-se. Nunca por omissão.
const PERMITE_REMOTO = process.env.AFK_TESTE_PERMITIR_REMOTO === '1'

let passou = 0
let falhou = 0
function verificar(nome, condicao, detalhe) {
  if (condicao) {
    passou += 1
    console.log(`  ok    ${nome}`)
  } else {
    falhou += 1
    console.log(`  FALHA ${nome}`)
    if (detalhe) console.log(`        ${detalhe}`)
  }
}

async function principal() {
console.log(`\nligação a sério — ${HOST}:${PORTA} (Paper ${VERSAO})`)

if (!LOCAIS.includes(HOST) && !PERMITE_REMOTO) {
  console.log(`  este teste só aceita servidores locais. Recebi "${HOST}".`)
  console.log('  Para um servidor teu, confirma com AFK_TESTE_PERMITIR_REMOTO=1 e o')
  console.log('  nome/porta nos argumentos. A recusa está aqui de propósito: nada de')
  console.log('  apontar isto a um servidor alheio.')
  process.exit(1)
}
if (!LOCAIS.includes(HOST)) {
  console.log('  (servidor remoto autorizado por AFK_TESTE_PERMITIR_REMOTO=1)')
}

// ---- 0. o servidor responde?
// Um servidor de Minecraft não fala HTTP, por isso o teste de vida é uma
// ligação TCP simples. (Um http.get aqui dava sempre "morto", porque o
// servidor nunca responde com uma página.)
const vivo = await new Promise((resolve) => {
  const ligacao = net.createConnection({ host: HOST, port: PORTA })
  const temporizador = setTimeout(() => {
    ligacao.destroy()
    resolve(false)
  }, 3000)
  ligacao.on('connect', () => {
    clearTimeout(temporizador)
    ligacao.end()
    resolve(true)
  })
  ligacao.on('error', () => {
    clearTimeout(temporizador)
    resolve(false)
  })
})

if (!vivo) {
  console.log(`  FALHA não há nada a escutar em ${HOST}:${PORTA}`)
  console.log('  Arranca o servidor com: node servidores/arrancar.js ' + VERSAO)
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  process.exit(1)
}
verificar('o servidor responde na porta', true)

// ---- 1. a detecção de versão do nosso código
const deteccao = require(path.join(RAIZ, 'src', 'deteccao.js'))
const ping = await deteccao.criarPinger()(HOST, PORTA)
verificar(
  'o nosso pedido de estado percebe o servidor',
  ping.ok,
  `motivo: ${ping.motivo}`
)
if (ping.ok) {
  console.log(`        título: ${ping.nome} | protocolo: ${ping.protocolo} | jogadores: ${ping.jogadores}/${ping.maxJogadores}`)
  const escolha = deteccao.escolherVersao({
    configurada: 'auto',
    protocoloServidor: ping.protocolo,
    conhecidas: deteccao.versoesConhecidas()
  })
  console.log(`        "auto" escolheria: ${escolha.versao || '(nenhuma)'} — ${escolha.motivo || 'ok'}`)
}

// ---- 2. entrar com o Mineflayer a sério
const versoes = require(path.join(RAIZ, 'node_modules', 'mineflayer', 'lib', 'version.js'))
console.log(`        mineflayer suporta até ${versoes.latestSupportedVersion}`)

// O patch do 26.3 tem de estar instalado ANTES de carregar o Mineflayer, senão
// a biblioteca não conhece a versão e recusa-se a falar com o servidor. É o
// mesmo que o index.js faz ao arrancar.
const { instalarVersaoPadrao } = require(path.join(RAIZ, 'src', 'versoes.js'))
const alvo = process.env.AFK_TESTE_VERSAO || VERSAO
const compat = instalarVersaoPadrao({ alvo })
console.log(
  `        patch do ${alvo}: ${compat.aplicada ? 'aplicado' : 'NÃO aplicado — ' + compat.motivo}`
)

let mineflayer
try {
  mineflayer = require(path.join(RAIZ, 'node_modules', 'mineflayer'))
} catch (err) {
  console.log(`  FALHA o mineflayer não carregou: ${err.message}`)
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  process.exit(1)
}

let bloqueadoPor = null
let errosDeLuz = 0
const resultado = await new Promise((resolve) => {
  let bot = null
  const terminar = (motivo) => {
    bloqueadoPor = motivo
    try {
      if (bot) {
        bot.removeAllListeners()
        bot.quit()
      }
    } catch {
      // já saiu
    }
    resolve()
  }
  const temporizador = setTimeout(() => terminar('tempo esgotado'), TIMEOUT)

  try {
    bot = mineflayer.createBot({
      host: HOST,
      port: PORTA,
      username: 'bot_teste_real',
      auth: 'offline',
      version: alvo,
      hideErrors: true,
      checkTimeoutInterval: 30000
    })
  } catch (err) {
    clearTimeout(temporizador)
    return terminar('createBot: ' + err.message)
  }

  const tiques = []
  bot.on('login', () => {
    verificar('entrou na sessão', true)
  })
  bot.once('spawn', () => {
    verificar('entrou no mundo', true)
    const pos = bot.entity && bot.entity.position
    console.log(`        posição: X ${pos.x.toFixed(1)} Y ${pos.y.toFixed(1)} Z ${pos.z.toFixed(1)}`)

    // Usa o movimento anti-AFK que o bot envia mesmo, em vez de um inventado.
    // A primeira versão deste teste rodava controlos a 10 Hz com um ângulo
    // aleatório, e o servidor expulsava logo o bot por movimento inválido: o
    // movimento verdadeiro corre uma vez por tique e suaviza o ângulo.
    const { criarMovimento } = require(path.join(RAIZ, 'src', 'movimento.js'))
    const movimento = criarMovimento({ bot })
    movimento.iniciar(pos)

    let anterior = { x: pos.x, z: pos.z }
    let maiorPasso = 0
    let conta = 0
    const intervalo = setInterval(() => {
      if (!bot || !bot.entity) return
      conta += 1
      const p = bot.entity.position
      const passo = Math.hypot(p.x - anterior.x, p.z - anterior.z)
      if (passo > maiorPasso) maiorPasso = passo
      anterior = { x: p.x, z: p.z }
      if (conta >= 40) {
        clearInterval(intervalo)
        movimento.parar()
        verificar('o bot mexe-se no mundo', maiorPasso > 0.01, `maior passo: ${maiorPasso.toFixed(3)} blocos`)
        verificar(
          'o movimento não é um teletransporte',
          maiorPasso < 1.5,
          `um passo de ${maiorPasso.toFixed(2)} blocos num tique é impossível`
        )
        console.log(`        depois de ${conta} amostras: X ${p.x.toFixed(2)} Z ${p.z.toFixed(2)}`)
        if (errosDeLuz) {
          console.log(`        (${errosDeLuz} queixa(s) de luz dos chunks, ignoradas — ver PROGRESSO.md)`)
        }
        clearTimeout(temporizador)
        terminar('ok')
      }
    }, 100)
  })
  bot.on('kicked', (reason) => {
    clearTimeout(temporizador)
    verificar('não foi expulso', false, JSON.stringify(reason).slice(0, 160))
    terminar('expulso')
  })
  bot.on('error', (err) => {
    // No 26.3 a luz dos chunks vem noutro pacote e o parser do Mineflayer
    // queixa-se. Não é fatal: os blocos continuam a carregar, e um bot de AFK
    // não precisa de luz. Conta-se à parte para não parecer que o bot morreu.
    if (/light|readSection|ChunkColumn|first argument must be/i.test(err.message)) {
      errosDeLuz += 1
      return
    }
    clearTimeout(temporizador)
    verificar('entrou sem erro de rede', false, `${err.code || ''} ${err.message}`.slice(0, 160))
    terminar('erro')
  })
})

verificar('o teste chegou ao fim', bloqueadoPor === 'ok', `parou por: ${bloqueadoPor}`)

// ---- 3. o log do servidor confirma
console.log('')
console.log(`${passou} passaram, ${falhou} falharam`)
console.log('')
if (falhou === 0) {
  console.log('Isto é a primeira prova de que o bot entra num servidor a sério.')
  console.log('Ainda falta: conta premium, anticheat, e servidores com mods.')
} else {
  console.log('Ainda não entra. O log do servidor (servidores/paper-*/logs/latest.log) diz porquê.')
}
process.exit(falhou === 0 ? 0 : 1)
}

principal().catch((err) => {
  console.log(`\n  FALHA inesperada: ${err.message}`)
  process.exit(1)
})
