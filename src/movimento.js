'use strict'

// Movimento anti-AFK: andar em círculo e saltar, com pausas.
//
// Serve para os servidores que expulsam quem fica parado. A ideia vem do branch
// `Tests`; aqui a matemática está isolada em funções puras e o ciclo tem um
// relógio injectado, para os testes não esperarem pelo relógio de verdade.
//
// IMPORTANTE: isto não é garantido contra anticheat agressivo. É uma coisa
// correcta e discreta, não um contorno de sistema.

const PADRAO = {
  enabled: true,
  activeDurationSeconds: 180,
  pauseDurationSeconds: 30,
  radius: 1.2
}

const TECTOS = {
  raioMinimo: 0.5,
  raioMaximo: 8,
  duracaoMinima: 5,
  duracaoMaxima: 3600
}

const ANGULO_A_FRENTE = Math.PI / 3
const PASSO_BLOQUEADO = 0.02
const PASSO_LIVRE = 0.05
const TICKS_BLOQUEADO = 12
const BLOQUEIOS_PARA_RECENTRAR = 2

function numero(valor, minimo, maximo, recurso) {
  const n = Number(valor)
  if (!Number.isFinite(n)) return recurso
  return Math.min(Math.max(n, minimo), maximo)
}

/** Completa e limita os valores, sem perder o que vier certo. */
function normalizar(config) {
  const c = config || {}
  return {
    enabled: c.enabled !== false,
    activeDurationSeconds: numero(
      c.activeDurationSeconds,
      TECTOS.duracaoMinima,
      TECTOS.duracaoMaxima,
      PADRAO.activeDurationSeconds
    ),
    pauseDurationSeconds: numero(
      c.pauseDurationSeconds,
      0,
      TECTOS.duracaoMaxima,
      PADRAO.pauseDurationSeconds
    ),
    radius: numero(c.radius, TECTOS.raioMinimo, TECTOS.raioMaximo, PADRAO.radius)
  }
}

/** Envolve um ângulo em [0, 2π). */
function normalizarAngulo(angulo) {
  const doisPi = Math.PI * 2
  return ((angulo % doisPi) + doisPi) % doisPi
}

/**
 * Ponto do perímetro onde o bot quer estar, `anguloAFrente` à frente do
 * ângulo em que está, no sentido indicado.
 */
function calcularPonto(centro, atual, raio, direccao) {
  const anguloActual = Math.atan2(atual.z - centro.z, atual.x - centro.x)
  const alvo = anguloActual + direccao * ANGULO_A_FRENTE
  return {
    x: centro.x + raio * Math.cos(alvo),
    z: centro.z + raio * Math.sin(alvo)
  }
}

/** Diferença mais curta entre dois ângulos, em [-π, π]. */
function diferencaAngular(desejado, actual) {
  let diff = (desejado - actual) % (Math.PI * 2)
  if (diff < -Math.PI) diff += Math.PI * 2
  if (diff > Math.PI) diff -= Math.PI * 2
  return diff
}

/** Roda suavemente para o ângulo desejado, em vez de virar de repente. */
function calcularYaw(desejado, actual, factor = 0.4) {
  const diff = diferencaAngular(desejado, actual)
  return actual + diff * factor
}

/** O bot está preso contra um obstáculo? Se sim, o que fazer. */
function reagirAObstaculo({ bloqueados, direccao, centrado }) {
  if (bloqueados >= BLOQUEIOS_PARA_RECENTRAR && !centrado) {
    return { direccao: -direccao, centrar: true, bloqueados: 0 }
  }
  return { direccao: -direccao, centrar: false, bloqueados }
}

/**
 * Movimento em si. Recebe o bot e um relógio opcional (para os testes).
 */
function criarMovimento({ bot, config, log, t, temporizadores = global } = {}) {
  const cfg = normalizar(config)
  let centro = null
  let ultimaPosicao = null
  let bloqueados = 0
  let fase = 'parado'
  let temporizador = null
  let aOuvir = null

  const estado = () => ({ fase, centro, bloqueados, direccao: direccaoActual })

  let direccaoActual = 1

  function mostrar(texto, tipo = 'INFO') {
    if (log) log(texto, tipo)
  }

  function definirFase(nova) {
    fase = nova
    if (nova === 'parado') {
      if (bot) bot.clearControlStates()
    } else if (nova === 'pausa') {
      if (bot) bot.clearControlStates()
    } else {
      mostrar(t ? `${t('movement_started')} ${cfg.activeDurationSeconds}s` : '', 'INFO')
    }
    agendar()
  }

  function agendar() {
    if (temporizador) {
      temporizadores.clearTimeout(temporizador)
      temporizador = null
    }
    if (fase === 'parado') return
    const segundos = fase === 'andando' ? cfg.activeDurationSeconds : cfg.pauseDurationSeconds
    temporizador = temporizadores.setTimeout(() => {
      temporizador = null
      definirFase(fase === 'andando' ? 'pausa' : 'andando')
    }, segundos * 1000)
  }

  function passo() {
    if (!bot || !bot.entity || !bot.entity.position) return
    const pos = bot.entity.position

    if (fase === 'andando') {
      if (!centro) centro = { x: pos.x, y: pos.y, z: pos.z }
      if (!ultimaPosicao) ultimaPosicao = { x: pos.x, z: pos.z }

      const andou = Math.hypot(pos.x - ultimaPosicao.x, pos.z - ultimaPosicao.z)
      ultimaPosicao = { x: pos.x, z: pos.z }

      if (andou < PASSO_BLOQUEADO) {
        bloqueados += 1
        if (bloqueados >= TICKS_BLOQUEADO) {
          bloqueados = 0
          const r = reagirAObstaculo({ bloqueados: BLOQUEIOS_PARA_RECENTRAR, direccao: direccaoActual, centrado: false })
          direccaoActual = r.direccao
          if (r.centrar) centro = { x: pos.x, y: pos.y, z: pos.z }
        }
      } else {
        if (bloqueados > 0) bloqueados -= 1
        if (andou > PASSO_LIVRE) bloqueados = 0
      }

      // Mudou de patamar: volta a usar o novo centro
      if (bot.entity.onGround && Math.abs(pos.y - centro.y) > 1.2) {
        centro = { x: pos.x, y: pos.y, z: pos.z }
      }

      const alvo = calcularPonto(centro, pos, cfg.radius, direccaoActual)
      const desejado = Math.atan2(-(alvo.x - pos.x), -(alvo.z - pos.z))

      bot.setControlState('forward', true)
      bot.setControlState('jump', true)
      bot.look(calcularYaw(desejado, bot.entity.yaw || 0), 0, true)
    }
  }

  function aoTick() {
    passo()
  }

  function iniciar(posicao) {
    if (!cfg.enabled) return false
    if (posicao) centro = { x: posicao.x, y: posicao.y, z: posicao.z }
    fase = 'andando'
    if (bot && bot.on) {
      aOuvir = aoTick
      bot.on('physicsTick', aOuvir)
    }
    agendar()
    return true
  }

  function parar() {
    if (aOuvir && bot && bot.removeListener) bot.removeListener('physicsTick', aOuvir)
    aOuvir = null
    fase = 'parado'
    if (temporizador) temporizadores.clearTimeout(temporizador)
    temporizador = null
    if (bot) bot.clearControlStates()
  }

  return { iniciar, parar, passo, estado, config: cfg, definirCentro: (p) => { centro = p } }
}

module.exports = {
  criarMovimento,
  normalizar,
  normalizarAngulo,
  calcularPonto,
  calcularYaw,
  diferencaAngular,
  reagirAObstaculo,
  PADRAO,
  TECTOS,
  ANGULO_A_FRENTE,
  TICKS_BLOQUEADO
}
