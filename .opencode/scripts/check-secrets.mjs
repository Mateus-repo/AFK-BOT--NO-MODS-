#!/usr/bin/env node
// Procura segredos e dados reais que nunca devem ser versionados.
//
// Uso:
//   node .opencode/scripts/check-secrets.mjs            # ficheiros do git (ou da raiz)
//   node .opencode/scripts/check-secrets.mjs --staged   # só o que está no stage
//   node .opencode/scripts/check-secrets.mjs --files    # ficheiros à não versionar
//   node .opencode/scripts/check-secrets.mjs --json
//
// Saída: 0 = nada suspeito, 1 = encontrado.
// Não escreve nada. Quem decide o que fazer é a skill `commit`.

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { repoRoot, listFiles, readText, out } from './lib/util.mjs'

const PADROES = [
  { nome: 'chave privada', re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { nome: 'token GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { nome: 'token npm', re: /\bnpm_[A-Za-z0-9]{30,}/ },
  { nome: 'token Discord', re: /[\w-]{24}\.[\w-]{6}\.[\w-]{27,}/ },
  { nome: 'chave de API aberta', re: /\bsk-[A-Za-z0-9]{20,}/ },
  { nome: 'senha explícita', re: /"?(?:password|passwd|senha|token|secret|api[_-]?key)"?\s*[:=]\s*"[^"$\s][^"]{3,}"?/gi },
  { nome: 'e-mail pessoal', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  { nome: 'credencial Mojang/Microsoft', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
]

// Ficheiros que são legados (não versionados) mas podem existir no disco.
const IGNORAR_NA_ANALISE = new Set([
  '.git/',
  'node_modules/',
  'logs/',
  'old-deprecated-10.1/',
  'nodeMsi/',
  '.idea/',
])

const args = process.argv.slice(2)
const modoStaged = args.includes('--staged')
const modoFiles = args.includes('--files')
const comoJson = args.includes('--json')
const root = repoRoot()

function git(argsGit) {
  try {
    return execFileSync('git', argsGit, { cwd: root, encoding: 'utf8' })
  } catch {
    return null
  }
}

function ficheiros() {
  if (modoStaged) {
    const out = git(['diff', '--cached', '--name-only', '--diff-filter=ACM'])
    return out ? out.split(/\r?\n/).filter(Boolean) : []
  }
  if (modoFiles) {
    return listFiles(root).filter((f) => /(settings|launcher_accounts)\.json$/.test(f))
  }
  const tracked = git(['ls-files'])
  if (tracked) return tracked.split(/\r?\n/).filter(Boolean)
  return listFiles(root)
}

const resultados = []
for (const rel of ficheiros()) {
  if ([...IGNORAR_NA_ANALISE].some((p) => rel.startsWith(p))) continue
  const abs = path.join(root, rel)
  const texto = readText(abs)
  if (texto === null) continue
  if (texto.length > 2_000_000) continue
  texto.split(/\r?\n/).forEach((linha, i) => {
    for (const { nome, re } of PADROES) {
      const r = new RegExp(re.source, re.flags)
      if (r.test(linha)) {
        const valor = linha.trim().slice(0, 90)
        resultados.push({ ficheiro: rel, linha: i + 1, tipo: nome, valor })
      }
    }
  })
}

if (comoJson) {
  console.log(JSON.stringify({ ok: resultados.length === 0, achados: resultados }, null, 2))
  process.exit(resultados.length === 0 ? 0 : 1)
}

if (resultados.length === 0) {
  out.ok('nenhum segredo encontrado')
  console.log('\nOK: nada a fazer.')
  process.exit(0)
}

out.erro(`${resultados.length} suspeita(s) — não commitar até resolver:`)
const vistos = new Set()
for (const r of resultados) {
  const chave = `${r.ficheiro}:${r.linha}:${r.tipo}`
  if (vistos.has(chave)) continue
  vistos.add(chave)
  console.log(`  ${r.ficheiro}:${r.linha}  [${r.tipo}]`)
  console.log(`    ${r.valor}`)
}
console.log(
  '\nFalsos positivos prováveis: links com @ (ex. <a@b.com>), palavras de exemplo ' +
    'nos READMEs e em default.json. Decide caso a caso e regista a decisão em PROGRESSO.md.'
)
process.exit(1)
