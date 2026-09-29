'use strict'

// Leitura, validação e escrita do settings.json.
//
// Não sabe nada de Mineflayer nem de rede: recebe os caminhos e as funções de
// que precisa, por isso os testes podem usar uma pasta temporária qualquer.

const fs = require('fs')

// Valores de recurso para quando o settings.json não existe ou não pode ser lido.
// Têm o mesmo formato do default.json.
const FALLBACK_CONFIG = {
  server: { ip: '', port: 25565, version: '1.20.4' },
  'bot-account': { type: 'mojang', username: 'bot_placeholder', password: '' },
  language: 'eng',
  maxRam: '1G'
}

const TIPOS_CONTA = ['mojang', 'microsoft']

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/** Junta alterações a um objecto sem perder o que já lá estava. */
function deepMerge(base, updates) {
  const resultado = isPlainObject(base) ? { ...base } : {}
  for (const [chave, valor] of Object.entries(updates || {})) {
    resultado[chave] = isPlainObject(valor) ? deepMerge(resultado[chave], valor) : valor
  }
  return resultado
}

function normalizar(config, base) {
  const final = deepMerge(deepMerge(base, {}), config)
  if (final.server) {
    const port = parseInt(final.server.port, 10)
    final.server.port = Number.isInteger(port) && port > 0 && port <= 65535 ? port : base.server.port
    final.server.version = String(final.server.version || base.server.version)
  }
  if (final['bot-account'] && !TIPOS_CONTA.includes(final['bot-account'].type)) {
    final['bot-account'].type = 'mojang'
  }
  return final
}

function createConfig({ configPath, defaultConfigPath, log, t }) {
  let config = null
  // Cópia do que está no disco, para escrever uma opção não apagar campos que o
  // utilizador ou uma versão futura do bot acrescentaram.
  let raw = null

  function defaults() {
    try {
      const base = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'))
      return normalizar(base, FALLBACK_CONFIG)
    } catch {
      return { ...FALLBACK_CONFIG }
    }
  }

  /**
   * Lê o settings.json e completa o que falta com o default.json.
   * Nunca lança: o bot arranca sempre com alguma coisa e avisa do que está errado.
   */
  function read() {
    let fromDisk = {}
    let estado = null

    try {
      fromDisk = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (!isPlainObject(fromDisk)) {
        fromDisk = {}
        estado = 'config_not_object'
      }
    } catch (err) {
      fromDisk = {}
      estado = err.code === 'ENOENT' ? 'config_missing' : 'config_unreadable'
      if (estado === 'config_unreadable') {
        log(`${t('config_unreadable')} ${err.message}`, 'ERROR')
      }
    }

    const base = defaults()
    config = normalizar(fromDisk, base)

    if (estado === 'config_missing' || estado === 'config_not_object') {
      log(t(estado), 'WARN')
    } else if (!fromDisk.server || !fromDisk['bot-account']) {
      log(t('config_filled'), 'WARN')
    }

    raw = fromDisk
    return config
  }

  /** Grava alterações preservando os campos que o bot não conhece. */
  function save(updates) {
    const merged = deepMerge(raw || {}, updates)
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2))
    raw = merged
    config = normalizar(merged, defaults())
    return config
  }

  /**
   * Substitui o ficheiro inteiro por outro (usado pelo /default).
   * Guarda antes uma cópia do que ia ser perdido, em settings.json.bak.
   */
  function replaceFrom(caminho) {
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, `${configPath}.bak`)
    }
    fs.copyFileSync(caminho, configPath)
    raw = null
    return read()
  }

  return {
    read,
    save,
    replaceFrom,
    defaults,
    get: () => config,
    raw: () => raw
  }
}

module.exports = { createConfig, isPlainObject, deepMerge, normalizar, FALLBACK_CONFIG, TIPOS_CONTA }
