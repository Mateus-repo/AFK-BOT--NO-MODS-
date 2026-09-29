'use strict'

// Vários bots, um por sessão.
//
// Cada sessão tem o seu movimento, a sua reconexão e o seu estado, para que uma
// sessão caída não leve as outras. A ideia vem do branch `Tests`; aqui a lógica
// de nomes e a de gestão estão isoladas e recebem a fábrica de sessões por
// injecção, para os testes não precisarem do Mineflayer.

const PADRAO = {
  username: 'AFK_Bot',
  sufixoDigitos: 4
}

/**
 * Gera um nome a partir de um modelo.
 * `botxxxx` → `bot1234`; `bot_1` → `bot_1_4820`.
 * Serv para não se repetir o mesmo nome quando o servidor não deixa estar
 * duas contas iguais ao mesmo tempo.
 */
function gerarNome(modelo, aleatorio = Math.random) {
  const base = String(modelo || PADRAO.username)
  if (/x/i.test(base)) {
    return base.replace(/[xX]/g, () => Math.floor(aleatorio() * 10))
  }
  const sufixo = Math.floor(aleatorio() * 10 ** PADRAO.sufixoDigitos)
  return `${base.slice(0, 10)}_${sufixo}`
}

/**
 * Descobre quantos bots há na configuração.
 * Aceita um array `bots`, ou deriva um só do `bot-account` — que é como sempre
 * funcionou.
 */
function normalizarBots(config) {
  const conta = (config && config['bot-account']) || {}
  const lista = config && Array.isArray(config.bots) ? config.bots : []

  const bots = lista
    .filter((b) => b && typeof b === 'object')
    .map((b, i) => ({
      username: b.username || `AFK_Bot_${i + 1}`,
      type: b.type || conta.type || 'mojang',
      password: b.password === undefined ? conta.password : b.password
    }))

  if (bots.length) return bots

  return [
    {
      username: conta.username || PADRAO.username,
      type: conta.type || 'mojang',
      password: conta.password
    }
  ]
}

/**
 * Gerencia as sessões. `criarSessao(configBot)` devolve um objecto com
 * `ligar()`, `parar()`, e (opcionalmente) `estado()`, `posicao()`, `abrirMovimento()`.
 */
function criarGerenciador({ criarSessao, log, t, onEstado } = {}) {
  const sessoes = []

  function avisar(estado) {
    if (onEstado) onEstado(estado, resumo())
  }

  function resumo() {
    return sessoes.map((s) => ({ nome: s.nome, estado: s.estado || 'desligado' }))
  }

  function adicionar(configBot) {
    const s = criarSessao(configBot)
    s.nome = s.nome || configBot.username
    s.estado = s.estado || 'desligado'
    sessoes.push(s)
    return s
  }

  function ligarTodas() {
    for (const s of sessoes) {
      try {
        s.ligar()
        s.estado = 'a_ligar'
        log(`${t('bot_starting')} ${s.nome}`, 'INFO')
      } catch (err) {
        s.estado = 'erro'
        log(`${t('error_generic')} ${s.nome}: ${err.message}`, 'ERROR')
      }
    }
    avisar('ligar')
    return sessoes.length
  }

  function pararTodas() {
    for (const s of sessoes) {
      try {
        s.parar()
        s.estado = 'parado'
      } catch (err) {
        log(`${t('error_generic')} ${s.nome}: ${err.message}`, 'ERROR')
      }
    }
    avisar('parar')
  }

  function marcar(nome, estado) {
    const s = sessoes.find((x) => x.nome === nome)
    if (s) s.estado = estado
    avisar('estado')
    return s
  }

  function abaixo(indice) {
    return sessoes.slice(0, Math.max(0, indice))
  }

  return {
    sessoes,
    adicionar,
    ligarTodas,
    pararTodas,
    marcar,
    abaixo,
    resumo,
    tamanho: () => sessoes.length,
    ligadas: () => sessoes.filter((s) => s.estado === 'ligada' || s.estado === 'a_ligar')
  }
}

module.exports = { gerarNome, normalizarBots, criarGerenciador, PADRAO }
