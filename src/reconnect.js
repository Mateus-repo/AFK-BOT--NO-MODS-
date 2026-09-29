'use strict'

// Reconexão automática com recuo exponencial.
//
// A função `agendar` recebe a função que volta a tentar ligar-se, por isso este
// módulo não sabe nada de Mineflayer e pode ser testado com um relógio falso.

const OPCOES = {
  atrasoMinimo: 1000,
  atrasoMaximo: 60000,
  maxTentativas: 10
}

/** Atraso, em milissegundos, antes da tentativa número `tentativa` (1 = primeira). */
function calcularAtraso(tentativa, minimo = OPCOES.atrasoMinimo, maximo = OPCOES.atrasoMaximo) {
  if (tentativa < 1) return minimo
  return Math.min(minimo * Math.pow(2, tentativa - 1), maximo)
}

function createReconnect({ log, t, aoTentar, opcoes = {}, temporizadores = global } = {}) {
  const cfg = { ...OPCOES, ...opcoes }
  const estado = { ativo: false, tentativa: 0, temporizador: null }

  function clear() {
    if (estado.temporizador) {
      temporizadores.clearTimeout(estado.temporizador)
      estado.temporizador = null
    }
  }

  function ativar() {
    estado.ativo = true
  }

  /** Mudança deliberada: o bot não se deve ligar sozinho a seguir. */
  function desativar() {
    estado.ativo = false
    clear()
  }

  function reset() {
    estado.tentativa = 0
  }

  /** Tenta ligar-se outra vez. Devolve o atraso usado, ou null se não tentou. */
  function agendar(motivo) {
    if (!estado.ativo) return null
    if (estado.tentativa >= cfg.maxTentativas) {
      log(t('reconnect_give_up'), 'ERROR')
      return null
    }
    estado.tentativa += 1
    const atraso = calcularAtraso(estado.tentativa, cfg.atrasoMinimo, cfg.atrasoMaximo)
    log(
      `${t('reconnect_wait')} ${Math.round(atraso / 1000)}s (motivo: ${motivo}, tentativa ${estado.tentativa}/${cfg.maxTentativas})`,
      'WARN'
    )
    estado.temporizador = temporizadores.setTimeout(() => {
      estado.temporizador = null
      aoTentar()
    }, atraso)
    return atraso
  }

  return {
    ativar,
    desativar,
    reset,
    clear,
    agendar,
    estado,
    opcoes: cfg
  }
}

module.exports = { createReconnect, calcularAtraso, OPCOES }
