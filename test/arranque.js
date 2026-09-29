'use strict'

// Arranque do bot sem servidor: substitui o Mineflayer e o readline (ver
// harness.js) e verifica o arranque, os comandos e a gravação da configuração.
//
//   node test/arranque.js
//
// Mexe no settings.json da raiz, por isso guarda e restaura o que lá estava.

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const raiz = path.join(__dirname, '..')
const settingsPath = path.join(raiz, 'settings.json')

const settingsOriginal = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : null
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

function preparar() {
  fs.writeFileSync(
    settingsPath,
    JSON.stringify(
      {
        server: { ip: 'exemplo.invalido', port: 25565, version: '1.20.4' },
        'bot-account': { type: 'mojang', username: 'bot_teste', password: '' },
        language: 'pt-pt',
        'campo-do-futuro': { manter: true }
      },
      null,
      2
    )
  )
}

function restaurar() {
  if (settingsOriginal === null) {
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath)
    for (const extra of [`${settingsPath}.bak`]) {
      if (fs.existsSync(extra)) fs.unlinkSync(extra)
    }
  } else {
    fs.writeFileSync(settingsPath, settingsOriginal)
  }
}

console.log('\narranque sem servidor')

let stdout = ''
let codigo = 1
let configApos = null
try {
  preparar()
  stdout = execFileSync(process.execPath, [path.join(raiz, 'test', 'harness.js')], {
    cwd: raiz,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000
  })
  codigo = 0
} catch (err) {
  stdout = `${err.stdout || ''}${err.stderr || ''}`
  codigo = err.status === undefined ? 'sem estado' : err.status
} finally {
  // Estado da configuração depois dos comandos, antes de a restaurar
  try {
    configApos = JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
  } catch {
    configApos = null
  }
  restaurar()
}

verificar('o arranque termina sem erro', codigo === 0, `código ${codigo}\n${stdout.slice(-800)}`)
verificar('não dá erro de sintaxe em runtime', !stdout.includes('ReferenceError'), stdout.slice(-500))
verificar('não dá erro de módulo em falta', !stdout.includes('Cannot find module'), stdout.slice(-500))
verificar('não dá erro de tipo em runtime', !stdout.includes('TypeError'), stdout.slice(-500))

const linhaEventos = (stdout.split('\n').find((l) => l.startsWith('EVENTOS:')) || '').trim()
verificar('o bot tentou ligar-se ao servidor configurado', linhaEventos.includes('exemplo.invalido:25565'), linhaEventos)
verificar('o /changeserver recomeçou a ligação', linhaEventos.includes('createBot:127.0.0.1:25570'), linhaEventos)
verificar('o /stop parou o processo', !stdout.includes('FALHA: /stop'), stdout.slice(-300))
verificar('os comandos responderam', stdout.includes('Servidor atual'), stdout.slice(-400))

verificar('o /changeserver gravou o servidor novo', configApos && configApos.server.ip === '127.0.0.1', JSON.stringify(configApos))
verificar('o /changename gravou o nome novo', configApos && configApos['bot-account'].username === 'bot_teste', JSON.stringify(configApos))
verificar(
  'os campos desconhecidos sobreviveram aos comandos',
  configApos && configApos['campo-do-futuro'] && configApos['campo-do-futuro'].manter === true,
  JSON.stringify(configApos)
)
verificar('a porta antiga não se perdeu', configApos && configApos.server.port === 25570, JSON.stringify(configApos))
verificar('o /diagnostico responde', stdout.includes('node:'), stdout.slice(-400))
verificar('o /diagnostico mostra a versão configurada', stdout.includes('1.20.4'), stdout.slice(-400))
verificar('o /andar responde e não rebenta', /anti-afk/i.test(stdout), stdout.slice(-400))
verificar('o /andar com estado inválido mostra a sintaxe', stdout.includes('/andar [on|off]'), stdout.slice(-400))
verificar('o movimento anti-AFK manda andar', linhaEventos.includes('controlo:forward=true'), linhaEventos)
verificar('o movimento anti-AFK manda saltar', linhaEventos.includes('controlo:jump=true'), linhaEventos)

console.log(`\n${passou} passaram, ${falhou} falharam`)
if (falhou) process.exit(1)
