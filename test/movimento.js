'use strict'

// Testes do movimento anti-AFK (src/movimento.js).
//   node test/movimento.js

const assert = require('assert')
const EventEmitter = require('events')
const movimento = require('../src/movimento')

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

console.log('\nmovimento anti-AFK')

// ------------------------------------------------------------- normalização
teste('os valores por omissão são usados quando não vem nada', () => {
  const c = movimento.normalizar({})
  assert.strictEqual(c.enabled, true)
  assert.strictEqual(c.activeDurationSeconds, movimento.PADRAO.activeDurationSeconds)
  assert.strictEqual(c.pauseDurationSeconds, movimento.PADRAO.pauseDurationSeconds)
  assert.strictEqual(c.radius, movimento.PADRAO.radius)
})

teste('desligar é só enabled = false', () => {
  assert.strictEqual(movimento.normalizar({ enabled: false }).enabled, false)
  assert.strictEqual(movimento.normalizar({ enabled: 'qualquer' }).enabled, true)
})

teste('o raio fica dentro dos tectos', () => {
  assert.strictEqual(movimento.normalizar({ radius: 0 }).radius, movimento.TECTOS.raioMinimo)
  assert.strictEqual(movimento.normalizar({ radius: 500 }).radius, movimento.TECTOS.raioMaximo)
  assert.strictEqual(movimento.normalizar({ radius: 'abc' }).radius, movimento.PADRAO.radius)
  assert.strictEqual(movimento.normalizar({ radius: 3 }).radius, 3)
})

teste('as durações ficam dentro dos tectos', () => {
  assert.strictEqual(movimento.normalizar({ activeDurationSeconds: -10 }).activeDurationSeconds, movimento.TECTOS.duracaoMinima)
  assert.strictEqual(movimento.normalizar({ activeDurationSeconds: 99999 }).activeDurationSeconds, movimento.TECTOS.duracaoMaxima)
  assert.strictEqual(movimento.normalizar({ pauseDurationSeconds: 0 }).pauseDurationSeconds, 0)
})

// ---------------------------------------------------------------- geometria
teste('o ângulo normaliza-se para [0, 2π)', () => {
  assert.ok(Math.abs(movimento.normalizarAngulo(-Math.PI / 2) - (Math.PI * 1.5)) < 1e-9)
  assert.ok(Math.abs(movimento.normalizarAngulo(Math.PI * 3) - Math.PI) < 1e-9)
  assert.ok(Math.abs(movimento.normalizarAngulo(1)) - 1 < 1e-9)
})

teste('o ponto alvo está no raio certo', () => {
  const centro = { x: 0, z: 0 }
  const atual = { x: 2, z: 0 }
  const ponto = movimento.calcularPonto(centro, atual, 1.2, 1)
  const distancia = Math.hypot(ponto.x - centro.x, ponto.z - centro.z)
  assert.ok(Math.abs(distancia - 1.2) < 1e-9, `distância ${distancia}`)
})

teste('inverter o sentido dá o ponto do lado oposto', () => {
  const centro = { x: 0, z: 0 }
  const atual = { x: 2, z: 0 }
  const a = movimento.calcularPonto(centro, atual, 1, 1)
  const b = movimento.calcularPonto(centro, atual, 1, -1)
  assert.ok(Math.abs(a.z + b.z) < 1e-9, `${a.z} e ${b.z} deviam ser simétricos`)
  assert.ok(Math.abs(a.x - b.x) < 1e-6)
})

teste('a diferença angular é sempre a mais curta', () => {
  assert.ok(Math.abs(movimento.diferencaAngular(0.1, Math.PI * 2 - 0.1) - 0.2) < 1e-9)
  assert.ok(Math.abs(movimento.diferencaAngular(Math.PI - 0.1, -Math.PI + 0.1) - (-0.2)) < 1e-9)
})

teste('o yaw roda devagar para o alvo', () => {
  const inicio = 0
  const alvo = 1
  const depois = movimento.calcularYaw(alvo, inicio, 0.4)
  assert.ok(depois > inicio && depois < alvo, `${depois} tem de estar entre ${inicio} e ${alvo}`)
  // com factor 1 chega lá
  assert.ok(Math.abs(movimento.calcularYaw(alvo, inicio, 1) - alvo) < 1e-9)
})

teste('perto do limite dos ângulos não dá a volta completa', () => {
  const inicio = Math.PI * 2 - 0.05
  const depois = movimento.calcularYaw(0.05, inicio, 0.4)
  assert.ok(depois > Math.PI, `esperava passar dos 180 graus, deu ${depois}`)
})

teste('obstáculo:inverte o sentido e recentra ao fim de duas vezes', () => {
  const primeira = movimento.reagirAObstaculo({ bloqueados: 2, direccao: 1, centrado: false })
  assert.strictEqual(primeira.direccao, -1)
  assert.strictEqual(primeira.centrar, true, 'recentra quando já bateu duas vezes')
  const segunda = movimento.reagirAObstaculo({ bloqueados: 1, direccao: 1, centrado: false })
  assert.strictEqual(segunda.direccao, -1)
  assert.strictEqual(segunda.centrar, false, 'ainda não recentra')
  const comCentroFixo = movimento.reagirAObstaculo({ bloqueados: 5, direccao: 1, centrado: true })
  assert.strictEqual(comCentroFixo.centrar, false, 'com centro fixo não se recentra')
})

// ------------------------------------------------------------- ciclo e bot
class BotFalso extends EventEmitter {
  constructor(pos) {
    super()
    this.entity = { position: { x: pos.x, y: pos.y, z: pos.z }, yaw: 0, onGround: true }
    this.estados = {}
    this.looks = []
  }
  setControlState(k, v) {
    this.estados[k] = v
  }
  clearControlStates() {
    this.estados = {}
  }
  look(yaw) {
    this.looks.push(yaw)
  }
}

function relogioFalso() {
  let id = 0
  constScheduled = []
  return {
    agendados: scheduled(),
    setTimeout(fn, ms) {
      id += 1
      scheduled().push({ id, fn, ms })
      return id
    },
    clearTimeout(i) {
      const lista = scheduled()
      const idx = lista.findIndex((x) => x.id === i)
      if (idx >= 0) lista.splice(idx, 1)
    },
    disparar() {
      const lista = scheduled()
      const proximo = lista.shift()
      if (proximo) proximo.fn()
      return proximo
    }
  }
}
function scheduled() {
  return global.__listaAgendada || (global.__listaAgendada = [])
}

teste('não liga o movimento se estiver desligado', () => {
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({ bot, config: { enabled: false } })
  assert.strictEqual(m.iniciar(), false)
  assert.strictEqual(m.estado().fase, 'parado')
})

teste('a andar: anda, salta e olha para o alvo', () => {
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({
    bot,
    config: { enabled: true, radius: 1.2 },
    temporizadores: { setTimeout: () => 1, clearTimeout: () => {} }
  })
  assert.strictEqual(m.iniciar({ x: 0, y: 64, z: 0 }), true)
  m.passo()
  assert.strictEqual(bot.estados.forward, true)
  assert.strictEqual(bot.estados.jump, true)
  assert.strictEqual(bot.looks.length, 1)
})

teste('parar limpa os comandos e deixa de ouvir os tiques', () => {
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({
    bot,
    config: { enabled: true },
    temporizadores: { setTimeout: () => 1, clearTimeout: () => {} }
  })
  m.iniciar({ x: 0, y: 64, z: 0 })
  m.passo()
  assert.ok(bot.estados.forward)
  m.parar()
  assert.deepStrictEqual(bot.estados, {})
  assert.strictEqual(m.estado().fase, 'parado')
  assert.strictEqual(bot.listenerCount('physicsTick'), 0, 'tem de se desligar do physicsTick')
})

teste('o tique do física mexe no bot', () => {
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({
    bot,
    config: { enabled: true },
    temporizadores: { setTimeout: () => 1, clearTimeout: () => {} }
  })
  m.iniciar({ x: 0, y: 64, z: 0 })
  assert.strictEqual(bot.listenerCount('physicsTick'), 1)
  bot.emit('physicsTick')
  assert.ok(bot.estados.forward, 'o tique tem de mandar andar')
})

teste('o ciclo passa de andar para pausa e volta', () => {
  const agendados = []
  let id = 0
  const rel = {
    setTimeout: (fn, ms) => {
      id += 1
      agendados.push({ fn, ms })
      return id
    },
    clearTimeout: (i) => {
      const idx = agendados.findIndex((x) => x.i === i)
      if (idx >= 0) agendados.splice(idx, 1)
    }
  }
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({
    bot,
    config: { enabled: true, activeDurationSeconds: 10, pauseDurationSeconds: 5 },
    temporizadores: rel
  })
  m.iniciar({ x: 0, y: 64, z: 0 })
  assert.strictEqual(m.estado().fase, 'andando')
  assert.strictEqual(agendados[0].ms, 10000, 'espera os segundos activos')
  agendados.pop().fn()
  assert.strictEqual(m.estado().fase, 'pausa')
  assert.deepStrictEqual(bot.estados, {}, 'em pausa não mexe nos comandos')
  assert.strictEqual(agendados[agendados.length - 1].ms, 5000, 'espera os segundos de pausa')
  agendados.pop().fn()
  assert.strictEqual(m.estado().fase, 'andando')
})

teste('sem posição do bot, o tique não rebenta', () => {
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({
    bot,
    config: { enabled: true },
    temporizadores: { setTimeout: () => 1, clearTimeout: () => {} }
  })
  m.iniciar({ x: 0, y: 64, z: 0 })
  bot.entity = null
  assert.doesNotThrow(() => m.passo())
})

teste('mudou de patamar: recentra no novo nível', () => {
  const bot = new BotFalso({ x: 0, y: 64, z: 0 })
  const m = movimento.criarMovimento({
    bot,
    config: { enabled: true },
    temporizadores: { setTimeout: () => 1, clearTimeout: () => {} }
  })
  m.iniciar({ x: 0, y: 64, z: 0 })
  m.passo()
  const centroAntes = m.estado().centro
  bot.entity.position = { x: 0, y: 70, z: 0 }
  bot.entity.onGround = true
  m.passo()
  assert.strictEqual(m.estado().centro.y, 70, 'o centro tem de descer para o novo nível')
  assert.notStrictEqual(centroAntes.y, m.estado().centro.y)
})

// ---------------------------------------------------------------------- fim
Promise.all(fila).then(() => {
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  if (falhou) process.exit(1)
})
