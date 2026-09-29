'use strict'

// Multi-bot de ponta a ponta: arranca o index.js com dois bots na configuração
// e confirma que as duas sessões ligam, com nomes diferentes, e que o /bots
// as lista.
//
//   node test/multibot.js
//
// Não liga a servidor nenhum: o Mineflayer é substituído pelo harness.

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const raiz = path.join(__dirname, '..')
const settingsPath = path.join(raiz, 'settings.json')

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

const settingsOriginal = fs.existsSync(settingsPath) ? fs.readFileSync(settingsPath, 'utf8') : null

function restaurar() {
  if (settingsOriginal === null) {
    if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath)
    if (fs.existsSync(`${settingsPath}.bak`)) fs.unlinkSync(`${settingsPath}.bak`)
  } else {
    fs.writeFileSync(settingsPath, settingsOriginal)
  }
}

console.log('\nmulti-bot de ponta a ponta')

// Configuração com dois bots, num ficheiro à parte
const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'afkbot-multi-'))
const settingsAuxiliar = path.join(pasta, 'settings.json')
fs.writeFileSync(
  settingsAuxiliar,
  JSON.stringify(
    {
      server: { ip: 'servidor-de-teste.invalido', port: 25565, version: '1.20.4' },
      'bot-account': { type: 'mojang', username: 'botxxxx', password: '' },
      bots: [{ username: 'botxxxx' }, { username: 'botxxxx' }],
      movement: { enabled: false },
      language: 'pt-pt'
    },
    null,
    2
  )
)

// O harness copia este ficheiro para settings.json antes de arrancar
fs.writeFileSync(settingsPath, fs.readFileSync(settingsAuxiliar, 'utf8'))

let stdout = ''
let codigo = 1
try {
  stdout = execFileSync(process.execPath, [path.join(raiz, 'test', 'harness.js')], {
    cwd: raiz,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000,
    env: { ...process.env, AFK_TEST_SETTINGS: settingsAuxiliar },
    input: '/bots\n/pos\n/stop\n'
  })
  codigo = 0
} catch (err) {
  stdout = `${err.stdout || ''}${err.stderr || ''}`
  codigo = err.status === undefined ? 'sem estado' : err.status
} finally {
  restaurar()
}

const linhaEventos = (stdout.split('\n').find((l) => l.startsWith('EVENTOS:')) || '').trim()
const ligacoes = (linhaEventos.match(/createBot:/g) || []).length
const nomes = linhaEventos.match(/bot\d{4}/g) || []

verificar('o arranque multi-bot não dá erro', codigo === 0, `código ${codigo}\n${stdout.slice(-600)}`)
// O harness também executa /changeserver e /changename, por isso há mais
// ligações do que duas: o que interessa é haver uma por bot em cada arranque.
verificar('houve mais do que uma ligação', ligacoes >= 2, `${ligacoes} ligações\n${linhaEventos}`)
verificar('nenhuma ligação ao servidor real (todos os alvos são de teste)', !/aternos|hypixel|minecraft\./i.test(linhaEventos), linhaEventos)
verificar('nenhum nome se repete', new Set(nomes).size === nomes.length, linhaEventos)
verificar('há pelo menos dois bots diferentes', new Set(nomes).size >= 2, linhaEventos)
verificar('as primeiras ligações vão para o servidor configurado', (linhaEventos.match(/servidor-de-teste\.invalido/g) || []).length === 2, linhaEventos)
verificar('o /bots lista as sessões', (stdout.match(/bot\d{4}: \w+/g) || []).length >= 2, stdout.slice(-600))
verificar('o /stop manda parar todas as sessões', (linhaEventos.match(/quit:A parar/g) || []).length >= 2, linhaEventos)
assert.ok(true)

console.log(`\n${passou} passaram, ${falhou} falharam`)
if (falhou) process.exit(1)
