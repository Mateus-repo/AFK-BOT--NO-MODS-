'use strict'

// Idiomas: carrega `lang/<idioma>.txt` (formato chave=valor) e traduz chaves.
//
// Também expõe uma verificação de coerência entre idiomas, usada pelos testes
// e, mais tarde, por um comando de diagnóstico.

const fs = require('fs')
const path = require('path')

function createI18n({ dir }) {
  let messages = {}
  let current = null

  /** Devolve true se o idioma foi carregado. */
  function load(lang) {
    const file = path.join(dir, `${lang}.txt`)
    if (!fs.existsSync(file)) {
      return false
    }
    const novo = {}
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      novo[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
    messages = novo
    current = lang
    return true
  }

  function t(key) {
    return messages[key] || key
  }

  return { load, t, get current() { return current }, get messages() { return messages } }
}

/** Lê um ficheiro `chave=valor` e devolve as chaves duplicadas e as linhas inválidas. */
function analisarFicheiro(ficheiro) {
  const chaves = new Set()
  const duplicadas = []
  const invalidas = []
  for (const [i, line] of fs.readFileSync(ficheiro, 'utf8').split(/\r?\n/).entries()) {
    if (!line || line.startsWith('#')) continue
    const p = line.indexOf('=')
    if (p < 0) {
      invalidas.push(i + 1)
      continue
    }
    const chave = line.slice(0, p).trim()
    if (chaves.has(chave)) duplicadas.push(chave)
    chaves.add(chave)
  }
  return { chaves, duplicadas, invalidas }
}

module.exports = { createI18n, analisarFicheiro }
