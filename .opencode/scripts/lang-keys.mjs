// Compara as chaves de idioma: entre ficheiros, e com as usadas em index.js.
//
// Uso:
//   node .opencode/scripts/lang-keys.mjs            // relatório completo
//   node .opencode/scripts/lang-keys.mjs --falta    // só o que está em falta
//   node .opencode/scripts/lang-keys.mjs --json
//
// Saída: 0 = coerente, 1 = chaves em falta, duplicadas ou linhas inválidas.

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot, parseLang, usedLangKeys, readText, listFiles, out } from './lib/util.mjs'

const args = process.argv.slice(2)
const comoJson = args.includes('--json')
const soFalta = args.includes('--falta')
const root = repoRoot()

// Chaves que o bot não pode perder (arranque e comandos base).
const OBRIGATORIAS = [
  'login_success',
  'bot_has_arrived',
  'error_generic',
  'error_unknown_command',
  'help_header',
  'help_command_help',
]

function ficheirosLang() {
  const langDir = path.join(root, 'lang')
  if (!fs.existsSync(langDir)) return []
  return listFiles(root, langDir)
    .map((f) => path.join(root, f))
    .filter((f) => f.endsWith('.txt'))
    .sort()
}

const ficheiros = ficheirosLang()
if (ficheiros.length === 0) {
  if (comoJson) {
    console.log(JSON.stringify({ ok: false, motivo: 'sem lang/*.txt na raiz' }, null, 2))
  } else {
    out.erro('não encontrei lang/*.txt na raiz — o código do projeto ainda não foi restaurado')
  }
  process.exit(1)
}

const langs = ficheiros.map((f) => ({ nome: path.basename(f), ...parseLang(f) }))
const referencia = langs.reduce((a, b) => (a.keys.size >= b.keys.size ? a : b), langs[0])

const usadas = usedLangKeys(readText(path.join(root, 'index.js')) || '')

const porFicheiro = langs.map((lang) => {
  const faltamUsadas = [...usadas].filter((k) => !lang.keys.has(k))
  const soAqui = [...lang.keys].filter((k) => langs.every((o) => o === lang || !o.keys.has(k)))
  return {
    ficheiro: lang.nome,
    total: lang.keys.size,
    faltamUsadas,
    duplicadas: lang.duplicadas,
    invalidas: lang.invalidas,
    soAqui,
  }
})

const obrigatoriasEmFalta = OBRIGATORIAS.filter((k) => !referencia.keys.has(k))
const chavesOrfaas = usadas.size ? [...referencia.keys].filter((k) => !usadas.has(k)) : []
const problemas = porFicheiro.filter(
  (f) => f.faltamUsadas.length > 0 || f.duplicadas.length > 0 || f.invalidas.length > 0
)
const soAquiEmAlgum = porFicheiro.some((f) => f.soAqui.length > 0)
const ok = problemas.length === 0 && obrigatoriasEmFalta.length === 0

if (comoJson) {
  console.log(
    JSON.stringify(
      { ok, usadasNoCodigo: usadas.size, obrigatoriasEmFalta, chavesOrfaas, ficheiros: porFicheiro },
      null,
      2
    )
  )
  process.exit(ok ? 0 : 1)
}

out.titulo(`Chaves de idioma — referência ${referencia.nome} (${referencia.keys.size} chaves)`)
for (const f of porFicheiro) {
  const tags = []
  if (f.faltamUsadas.length) tags.push(`${f.faltamUsadas.length} em falta`)
  if (f.duplicadas.length) tags.push(`${f.duplicadas.length} duplicadas`)
  if (f.invalidas.length) tags.push(`${f.invalidas.length} linhas inválidas`)
  console.log(
    `  ${f.total === referencia.keys.size ? 'OK  ' : '!   '}${f.ficheiro} — ${f.total} chaves` +
      (tags.length ? ` (${tags.join(', ')})` : '')
  )
  for (const k of f.faltamUsadas) console.log(`       falta: ${k}`)
  for (const k of f.duplicadas) console.log(`       duplicada: ${k}`)
  for (const l of f.invalidas) console.log(`       linha ${l.linha} sem '=': ${l.texto}`)
  for (const k of f.soAqui) console.log(`       só existe neste ficheiro: ${k}`)
}

if (obrigatoriasEmFalta.length) {
  console.log(`\n  X    chaves obrigatórias em falta: ${obrigatoriasEmFalta.join(', ')}`)
}
if (chavesOrfaas.length && soFalta) {
  console.log(`\n  !    chaves sem uso no index.js: ${chavesOrfaas.join(', ')}`)
}
if (soAquiEmAlgum && soFalta) {
  console.log('  !    ficheiros de idioma com chaves diferentes — alinha-os com a skill `traducoes`')
}

console.log(
  ok
    ? '\nOK: chaves coerentes.'
    : '\nCorrige com a skill `traducoes` (ficheiros) ou `novo-comando` (código).'
)
process.exit(ok ? 0 : 1)
