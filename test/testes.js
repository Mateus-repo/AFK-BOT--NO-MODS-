'use strict'

// Testes de caracterização: não ligam a servidor nenhum.
//   node test/testes.js
//
// Correm também com o Node mínimo do projecto:
//   npx -y node@14.21.3 test/testes.js

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')

const { createConfig, deepMerge, FALLBACK_CONFIG } = require('../src/config')
const { createI18n, analisarFicheiro } = require('../src/i18n')
const { createLog, formatTimestamp } = require('../src/log')
const { createReconnect, calcularAtraso } = require('../src/reconnect')

let passou = 0
let falhou = 0
const falhas = []
// Fila para que a saída fique por ordem, mesmo com testes assíncronos.
let fila = Promise.resolve()

function teste(nome, fn) {
  fila = fila.then(async () => {
    try {
      await fn()
      passou += 1
      console.log(`  ok    ${nome}`)
    } catch (err) {
      falhou += 1
      falhas.push({ nome, err })
      console.log(`  FALHA ${nome}`)
      console.log(`        ${err.message}`)
    }
  })
  return fila
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

function pastaTemporaria() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'afkbot-'))
}

function configDeTeste(pasta, conteudoInicial) {
  const configPath = path.join(pasta, 'settings.json')
  const defaultConfigPath = path.join(pasta, 'default.json')
  if (conteudoInicial === undefined) {
    fs.writeFileSync(defaultConfigPath, JSON.stringify(FALLBACK_CONFIG, null, 2))
  } else if (typeof conteudoInicial === 'string') {
    fs.writeFileSync(configPath, conteudoInicial)
    fs.writeFileSync(defaultConfigPath, JSON.stringify(FALLBACK_CONFIG, null, 2))
  } else {
    fs.writeFileSync(configPath, JSON.stringify(conteudoInicial, null, 2))
    fs.writeFileSync(defaultConfigPath, JSON.stringify(FALLBACK_CONFIG, null, 2))
  }
  const linhas = []
  const t = (chave) => chave
  const log = (texto) => linhas.push(texto)
  const cfg = createConfig({ configPath, defaultConfigPath, log, t })
  return { cfg, configPath, linhas, log }
}

// ------------------------------------------------------------------ config
console.log('\nconfig')

teste('sem settings.json usa o default.json e avisa', () => {
  const { cfg, linhas } = configDeTeste(pastaTemporaria())
  const config = cfg.read()
  assert.strictEqual(config.server.port, 25565)
  assert.ok(linhas.some((l) => l.includes('config_missing')), `esperava config_missing, houve: ${linhas}`)
})

teste('settings.json com JSON partido não rebenta', () => {
  const { cfg, linhas } = configDeTeste(pastaTemporaria(), '{ isto não é json')
  const config = cfg.read()
  assert.strictEqual(config.server.port, 25565)
  assert.ok(linhas.some((l) => l.includes('config_unreadable')))
})

teste('settings.json que é uma lista conta como inválido', () => {
  const { cfg, linhas } = configDeTeste(pastaTemporaria(), '[1, 2, 3]')
  cfg.read()
  assert.ok(linhas.some((l) => l.includes('config_not_object')))
})

teste('secções em falta são completadas com o default', () => {
  const { cfg, linhas } = configDeTeste(pastaTemporaria(), { language: 'pt-pt' })
  const config = cfg.read()
  assert.strictEqual(config.language, 'pt-pt')
  assert.strictEqual(config.server.port, 25565)
  assert.ok(linhas.some((l) => l.includes('config_filled')))
})

teste('porta inválida volta ao valor do default', () => {
  for (const porta of ['abc', 0, 70000, -1, null]) {
    const { cfg } = configDeTeste(pastaTemporaria(), { server: { ip: 'exemplo.com', port: porta } })
    const config = cfg.read()
    assert.strictEqual(config.server.port, 25565, `porta ${porta} devia voltar a 25565`)
  }
})

teste('porta em texto é aceite', () => {
  const { cfg } = configDeTeste(pastaTemporaria(), { server: { ip: 'exemplo.com', port: '25570' } })
  assert.strictEqual(cfg.read().server.port, 25570)
})

teste('tipo de conta desconhecido volta a mojang', () => {
  const { cfg } = configDeTeste(pastaTemporaria(), { 'bot-account': { type: 'pirata' } })
  assert.strictEqual(cfg.read()['bot-account'].type, 'mojang')
})

teste('gravar preserva campos que o bot não conhece', () => {
  const { cfg, configPath } = configDeTeste(pastaTemporaria(), {
    server: { ip: 'antigo.com', port: 25565 },
    'campo-do-futuro': { novo: true }
  })
  cfg.read()
  cfg.save({ server: { ip: 'novo.com' } })
  const emDisco = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  assert.strictEqual(emDisco.server.ip, 'novo.com')
  assert.deepStrictEqual(emDisco['campo-do-futuro'], { novo: true })
  assert.strictEqual(emDisco.server.port, 25565, 'a porta não devia desaparecer')
})

teste('deepMerge não mexe em objectos de fora', () => {
  const base = { a: { b: 1 } }
  deepMerge(base, { a: { c: 2 } })
  assert.deepStrictEqual(base, { a: { b: 1 } })
})

teste('substituir pelo default cria backup e relê', () => {
  const { cfg, configPath } = configDeTeste(pastaTemporaria(), { server: { ip: 'meu.com', port: 25565 } })
  cfg.read()
  const antes = fs.readFileSync(configPath, 'utf8')
  cfg.replaceFrom(path.join(path.dirname(configPath), 'default.json'))
  assert.ok(fs.existsSync(`${configPath}.bak`), 'esperava settings.json.bak')
  assert.strictEqual(cfg.get().server.ip, FALLBACK_CONFIG.server.ip)
  assert.notStrictEqual(antes, '')
})

// ------------------------------------------------------------------- i18n
console.log('\nidiomas')

teste('carrega e traduz', () => {
  const i18n = createI18n({ dir: path.join(__dirname, '..', 'lang') })
  assert.strictEqual(i18n.load('pt-pt'), true)
  assert.strictEqual(i18n.current, 'pt-pt')
  assert.ok(i18n.t('login_success').length > 0)
  assert.notStrictEqual(i18n.t('login_success'), 'login_success')
})

teste('chave inexistente devolve a própria chave', () => {
  const i18n = createI18n({ dir: path.join(__dirname, '..', 'lang') })
  i18n.load('eng')
  assert.strictEqual(i18n.t('chave_que_nao_existe'), 'chave_que_nao_existe')
})

teste('idioma inexistente devolve false e não rebenta', () => {
  const i18n = createI18n({ dir: path.join(__dirname, '..', 'lang') })
  assert.strictEqual(i18n.load('klingon'), false)
  assert.strictEqual(i18n.current, null)
})

teste('os três idiomas têm as mesmas chaves', () => {
  const dir = path.join(__dirname, '..', 'lang')
  const referencia = analisarFicheiro(path.join(dir, 'eng.txt')).chaves
  for (const ficheiro of ['pt-pt.txt', 'en-us.txt']) {
    const outro = analisarFicheiro(path.join(dir, ficheiro))
    const faltam = [...referencia].filter((c) => !outro.chaves.has(c))
    const aMais = [...outro.chaves].filter((c) => !referencia.has(c))
    assert.deepStrictEqual(faltam, [], `${ficheiro} sem ${faltam.join(', ')}`)
    assert.deepStrictEqual(aMais, [], `${ficheiro} com chaves a mais: ${aMais.join(', ')}`)
  }
})

teste('nenhum ficheiro de idioma tem linhas sem =', () => {
  const dir = path.join(__dirname, '..', 'lang')
  for (const ficheiro of fs.readdirSync(dir).filter((f) => f.endsWith('.txt'))) {
    const r = analisarFicheiro(path.join(dir, ficheiro))
    assert.deepStrictEqual(r.invalidas, [], `${ficheiro}: linhas ${r.invalidas.join(', ')}`)
    assert.deepStrictEqual(r.duplicadas, [], `${ficheiro}: chaves duplicadas`)
  }
})

// -------------------------------------------------------------------- log
console.log('\nlog')

teste('timestamp tem a forma certa', () => {
  const ts = formatTimestamp(new Date(2026, 0, 2, 3, 4, 5, 6))
  assert.ok(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}\]$/.test(ts), ts)
})

teste('escreve no terminal e no ficheiro', async () => {
  const pasta = pastaTemporaria()
  const linhas = []
  const logger = createLog({ dir: pasta, console: { log: (l) => linhas.push(l) } })
  logger.log('mensagem de teste')
  await dormir(50) // a escrita em ficheiro é assíncrona
  logger.close()
  assert.ok(linhas.some((l) => l.includes('mensagem de teste')))
  assert.ok(fs.readFileSync(path.join(pasta, 'latest.log'), 'utf8').includes('mensagem de teste'))
})

teste('sem pasta de logs não rebenta', () => {
  const linhas = []
  const logger = createLog({ console: { log: (l) => linhas.push(l) } })
  logger.log('só terminal')
  assert.ok(linhas.some((l) => l.includes('só terminal')))
})

// -------------------------------------------------------------- reconexão
console.log('\nreconexão')

teste('recuo exponencial com tecto', () => {
  assert.strictEqual(calcularAtraso(1, 1000, 60000), 1000)
  assert.strictEqual(calcularAtraso(2, 1000, 60000), 2000)
  assert.strictEqual(calcularAtraso(3, 1000, 60000), 4000)
  assert.strictEqual(calcularAtraso(4, 1000, 60000), 8000)
  assert.strictEqual(calcularAtraso(7, 1000, 60000), 60000, 'tem de respeitar o tecto')
  assert.strictEqual(calcularAtraso(20, 1000, 60000), 60000)
})

teste('não agenda enquanto estiver desactivado', () => {
  const rc = createReconnect({ log: () => {}, t: (c) => c, aoTentar: () => {} })
  assert.strictEqual(rc.agendar('teste'), null)
})

teste('agenda, respeita o número de tentativas e desliga no fim', () => {
  let tentados = 0
  const agendados = []
  const falsos = {
    setTimeout: (fn, ms) => {
      agendados.push(ms)
      return agendados.length
    },
    clearTimeout: () => {}
  }
  const linhas = []
  const rc = createReconnect({
    log: (t) => linhas.push(t),
    t: (c) => c,
    aoTentar: () => {
      tentados += 1
    },
    opcoes: { maxTentativas: 3 },
    temporizadores: falsos
  })
  rc.ativar()
  assert.strictEqual(rc.agendar('caiu'), 1000)
  assert.strictEqual(rc.agendar('caiu'), 2000)
  assert.strictEqual(rc.agendar('caiu'), 4000)
  assert.strictEqual(rc.agendar('caiu'), null, 'a quarta tentativa tem de ser recusada')
  assert.ok(linhas.some((l) => l.includes('reconnect_give_up')))
  assert.deepStrictEqual(agendados, [1000, 2000, 4000])
})

teste('ligar-se com sucesso reinicia a contagem', () => {
  const rc = createReconnect({ log: () => {}, t: (c) => c, aoTentar: () => {}, temporizadores: { setTimeout: () => 1, clearTimeout: () => {} } })
  rc.ativar()
  rc.estado.tentativa = 4
  rc.reset()
  assert.strictEqual(rc.estado.tentativa, 0)
})

teste('desativar limpa o temporizador', () => {
  let limpo = 0
  const rc = createReconnect({
    log: () => {},
    t: (c) => c,
    aoTentar: () => {},
    temporizadores: { setTimeout: () => 42, clearTimeout: () => { limpo += 1 } }
  })
  rc.ativar()
  rc.agendar('caiu')
  rc.desativar()
  assert.strictEqual(limpo, 1)
  assert.strictEqual(rc.estado.ativo, false)
  assert.strictEqual(rc.estado.temporizador, null)
})

// ------------------------------------------------------------------- fim
fila.then(() => {
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  if (falhou) {
    for (const f of falhas) console.log(`  ${f.nome}: ${f.err.message}`)
    process.exit(1)
  }
})
