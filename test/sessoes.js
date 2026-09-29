'use strict'

// Testes do multi-bot (src/sessoes.js).
//   node test/sessoes.js

const assert = require('assert')
const sessoes = require('../src/sessoes')

let passou = 0
let falhou = 0
const fila = []

function teste(nome, fn) {
  fila.push(
    (async () => {
      try {
        await fn()
        passou += 1
        console.log(`  ok    ${nome}`)
      } catch (err) {
        falhou += 1
        console.log(`  FALHA ${nome}`)
        console.log(`        ${err.message}`)
      }
    })()
  )
  return fila[fila.length - 1]
}

console.log('\nmulti-bot')

// ------------------------------------------------------------------- nomes
teste('um modelo com x dá um nome com dígitos', () => {
  const nome = sessoes.gerarNome('botxxxx', () => 0.5)
  assert.strictEqual(nome, 'bot5555')
})

teste('cada x é trocado por um dígito diferente', () => {
  const nomes = new Set()
  for (let i = 0; i < 20; i++) nomes.add(sessoes.gerarNome('botxxxx'))
  assert.ok(nomes.size > 1, 'tem de variar entre chamadas')
})

teste('sem x, acrescenta um sufixo de quatro dígitos', () => {
  const nome = sessoes.gerarNome('bot_1', () => 0.5)
  assert.ok(/^bot_1_\d{4}$/.test(nome), nome)
})

teste('o nome fica em dez caracteres antes do sufixo', () => {
  const nome = sessoes.gerarNome('nome_muito_longo_aqui', () => 0.5)
  assert.ok(nome.startsWith('nome_muito'), nome)
  assert.ok(nome.length <= 15, `demasiado comprido: ${nome}`)
})

teste('sem modelo, usa o nome por omissão', () => {
  assert.ok(sessoes.gerarNome(null, () => 0.5).length > 0)
  assert.ok(sessoes.gerarNome(undefined, () => 0.5).length > 0)
})

// ------------------------------------------------------- lista de bots
teste('sem bots, deriva um da conta principal', () => {
  const bots = sessoes.normalizarBots({ 'bot-account': { username: 'bot_principal', type: 'mojang', password: 'x' } })
  assert.strictEqual(bots.length, 1)
  assert.strictEqual(bots[0].username, 'bot_principal')
  assert.strictEqual(bots[0].type, 'mojang')
  assert.strictEqual(bots[0].password, 'x')
})

teste('com bots, usa a lista', () => {
  const bots = sessoes.normalizarBots({
    'bot-account': { username: 'principal' },
    bots: [{ username: 'bot_a' }, { username: 'bot_b' }]
  })
  assert.strictEqual(bots.length, 2)
  assert.deepStrictEqual(bots.map((b) => b.username), ['bot_a', 'bot_b'])
})

teste('cada bot herda o tipo e a senha da conta principal', () => {
  const bots = sessoes.normalizarBots({
    'bot-account': { type: 'microsoft', password: 'secreto' },
    bots: [{ username: 'bot_a' }, { username: 'bot_b', password: 'outro' }]
  })
  assert.strictEqual(bots[0].password, 'secreto')
  assert.strictEqual(bots[0].type, 'microsoft')
  assert.strictEqual(bots[1].password, 'outro', 'o bot pode ter a sua própria senha')
})

teste('bots sem nome recebem um nome por ordem', () => {
  const bots = sessoes.normalizarBots({ bots: [{}, {}] })
  assert.deepStrictEqual(bots.map((b) => b.username), ['AFK_Bot_1', 'AFK_Bot_2'])
})

teste('uma lista inválida não parte nada', () => {
  assert.strictEqual(sessoes.normalizarBots(null).length, 1)
  assert.strictEqual(sessoes.normalizarBots({}).length, 1)
  assert.strictEqual(sessoes.normalizarBots({ bots: 'isto não é uma lista' }).length, 1)
  assert.strictEqual(sessoes.normalizarBots({ bots: [null, 'x', { username: 'ok' }] }).length, 1)
})

// ------------------------------------------------------------- gerenciador
function sessaoFalsa(nome, queixa) {
  return {
    nome,
    estado: 'desligado',
    ligadas: 0,
    parar() {
      if (queixa) throw new Error(queixa)
      this.paradas = (this.paradas || 0) + 1
      this.estado = 'parado'
    },
    ligar() {
      if (queixa) throw new Error(queixa)
      this.ligadas += 1
      this.estado = 'a_ligar'
    }
  }
}

teste('liga todas as sessões', () => {
  const g = sessoes.criarGerenciador({
    criarSessao: (c) => sessaoFalsa(c.username),
    log: () => {},
    t: (k) => k
  })
  g.adicionar({ username: 'bot_a' })
  g.adicionar({ username: 'bot_b' })
  assert.strictEqual(g.ligarTodas(), 2)
  assert.strictEqual(g.tamanho(), 2)
  for (const s of g.sessoes) assert.strictEqual(s.ligadas, 1)
})

teste('uma sessão que falha não leva as outras', () => {
  const g = sessoes.criarGerenciador({
    criarSessao: (c) => sessaoFalsa(c.username, c.username === 'bot_b' ? 'não foi possível' : null),
    log: () => {},
    t: (k) => k
  })
  g.adicionar({ username: 'bot_a' })
  g.adicionar({ username: 'bot_b' })
  g.ligarTodas()
  assert.strictEqual(g.sessoes[0].ligadas, 1, 'a primeira ligou')
  assert.strictEqual(g.sessoes[1].estado, 'erro', 'a segunda ficou em erro')
})

teste('o estado de cada sessão é independente', () => {
  const g = sessoes.criarGerenciador({
    criarSessao: (c) => sessaoFalsa(c.username),
    log: () => {},
    t: (k) => k
  })
  g.adicionar({ username: 'bot_a' })
  g.adicionar({ username: 'bot_b' })
  g.ligarTodas()
  g.marcar('bot_b', 'ligada')
  assert.strictEqual(g.sessoes[1].estado, 'ligada')
  assert.notStrictEqual(g.sessoes[0].estado, 'ligada')
  assert.strictEqual(g.ligadas().length, 2, 'as duas estão ligadas ou a ligar')
})

teste('marcar um nome que não existe não rebenta', () => {
  const g = sessoes.criarGerenciador({ criarSessao: (c) => sessaoFalsa(c.username), log: () => {}, t: (k) => k })
  g.adicionar({ username: 'bot_a' })
  assert.strictEqual(g.marcar('bot_fantasma', 'ligada'), undefined)
})

teste('parar todas chama cada sessão uma vez', () => {
  const g = sessoes.criarGerenciador({ criarSessao: (c) => sessaoFalsa(c.username), log: () => {}, t: (k) => k })
  g.adicionar({ username: 'bot_a' })
  g.adicionar({ username: 'bot_b' })
  g.pararTodas()
  for (const s of g.sessoes) assert.strictEqual(s.paradas, 1)
})

teste('abaixo(n) dá as primeiras n sessões', () => {
  const g = sessoes.criarGerenciador({ criarSessao: (c) => sessaoFalsa(c.username), log: () => {}, t: (k) => k })
  g.adicionar({ username: 'a' })
  g.adicionar({ username: 'b' })
  g.adicionar({ username: 'c' })
  assert.deepStrictEqual(g.abaixo(2).map((s) => s.nome), ['a', 'b'])
  assert.strictEqual(g.abaixo(0).length, 0)
  assert.strictEqual(g.abaixo(99).length, 3)
})

// ---------------------------------------------------------------------- fim
Promise.all(fila).then(() => {
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  if (falhou) process.exit(1)
})
