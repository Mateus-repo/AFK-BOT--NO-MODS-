'use strict'

// Log: escreve no terminal e em logs/latest.log, com timestamp.

const fs = require('fs')
const path = require('path')

function formatTimestamp(date) {
  const YYYY = date.getFullYear()
  const MM = String(date.getMonth() + 1).padStart(2, '0')
  const DD = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  const mmm = String(date.getMilliseconds()).padStart(3, '0')
  return `[${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}.${mmm}]`
}

function createLog({ dir, filename = 'latest.log', console: saida = console } = {}) {
  let stream = null

  if (dir) {
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      stream = fs.createWriteStream(path.join(dir, filename), { flags: 'a' })
    } catch {
      // Sem log em ficheiro o bot continua a funcionar: escreve só no terminal.
      stream = null
    }
  }

  function log(text, type = 'INFO') {
    const line = `${formatTimestamp(new Date())} [${type}] ${text}\n`
    if (stream) stream.write(line)
    saida.log(line.trim())
  }

  function close() {
    if (stream) stream.end()
    stream = null
  }

  return { log, close, formatTimestamp, temFicheiro: () => !!stream }
}

module.exports = { createLog, formatTimestamp }
