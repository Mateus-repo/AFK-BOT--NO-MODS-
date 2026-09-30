// Utilitários partilhados pelos scripts do projeto (.opencode/scripts).
// Sem dependências externas. Node 18+.
//
// Regra: nada aqui escreve ficheiros do projeto. Estes scripts só leem e
// reportam; quem altera é sempre uma skill, e só depois de aprovação.

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

/** Pastas que nunca se percorrem (ruído, binários, dependências). */
export const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.idea',
  'nodeMsi',
  'logs',
  'old-deprecated-10.1',
  // Cópia de referência que o dono do projecto deixou, sem versionar. O código
  // que corre é o de vendor/, e é esse que a verificação tem de vigiar.
  'resources',
])

/**
 * Raiz do projeto: primeiro ancestral com `.git` ou `package.json`.
 * Se não houver nenhum, usa a pasta atual.
 */
export function repoRoot(start = process.cwd()) {
  let dir = path.resolve(start)
  for (;;) {
    if (
      fs.existsSync(path.join(dir, '.git')) ||
      fs.existsSync(path.join(dir, 'package.json'))
    ) {
      return dir
    }
    const up = path.dirname(dir)
    if (up === dir) return path.resolve(start)
    dir = up
  }
}

/** Lista ficheiros de `dir` (recursivo), devolvendo caminhos relativos a `root`. */
export function listFiles(root, dir = root, acc = [], depth = 0) {
  if (depth > 8) return acc
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return acc
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.opencode') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      listFiles(root, full, acc, depth + 1)
    } else if (entry.isFile()) {
      acc.push(path.relative(root, full).split(path.sep).join('/'))
    }
  }
  return acc
}

export function readText(file) {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

export function exists(file) {
  return fs.existsSync(file)
}

/**
 * Lê um ficheiro de idioma `key=value`.
 * Devolve { keys, duplicadas, invalidas, ordem }.
 */
export function parseLang(file) {
  const text = readText(file)
  const keys = new Set()
  const duplicadas = []
  const invalidas = []
  const ordem = []
  if (text === null) return { keys, duplicadas, invalidas, ordem, ausente: true }
  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim() || line.trimStart().startsWith('#')) return
    const idx = line.indexOf('=')
    if (idx < 0) {
      invalidas.push({ linha: i + 1, texto: line.slice(0, 60) })
      return
    }
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1)
    if (!key) {
      invalidas.push({ linha: i + 1, texto: line.slice(0, 60) })
      return
    }
    if (keys.has(key)) duplicadas.push(key)
    keys.add(key)
    ordem.push({ linha: i + 1, chave: key, valor: value })
  })
  return { keys, duplicadas, invalidas, ordem, ausente: false }
}

/** Chaves usadas no código: t('chave'), t("chave"), lang['chave'], `t(\`chave\`)`. */
export function usedLangKeys(source) {
  const usados = new Set()
  if (!source) return usados
  const padroes = [
    /\bt\(\s*'([^']+)'/g,
    /\bt\(\s*"([^"]+)"/g,
    /\bt\(\s*`([^`$]+)`/g,
    /\blang\(\s*'([^']+)'/g,
  ]
  for (const re of padroes) {
    let m
    while ((m = re.exec(source)) !== null) usados.add(m[1])
  }
  return usados
}

/** Comandos de terminal declarados no `switch (cmd)` de index.js. */
export function commandsInIndex(source) {
  const comandos = new Set()
  if (!source) return comandos
  const re = /case\s+'([a-z0-9_-]+)'\s*:/g
  let m
  while ((m = re.exec(source)) !== null) comandos.add(m[1])
  return comandos
}

/** Verifica sintaxe de JavaScript sem executar o ficheiro. */
export function syntaxError(source, filename) {
  try {
    new vm.Script(source, { filename })
    return null
  } catch (err) {
    return err.message
  }
}

/** Tabela markdown simples: | a | b | -> [{a,b}] */
export function parseTableRow(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('|')) return null
  const cells = trimmed
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
  if (cells.length < 2) return null
  if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return null
  return cells
}

/** Saída formatada para consola. */
export const out = {
  ok(t) {
    console.log(`  OK   ${t}`)
  },
  aviso(t) {
    console.log(`  !    ${t}`)
  },
  erro(t) {
    console.log(`  X    ${t}`)
  },
  titulo(t) {
    console.log(`\n${t}`)
  },
}

/** Carrega package.json da raiz, se existir. */
export function readPackage(root) {
  const raw = readText(path.join(root, 'package.json'))
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { __invalido: true }
  }
}
