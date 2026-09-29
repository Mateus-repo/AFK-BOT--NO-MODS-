// Compatibilidade com a versão mínima de Node do projecto.
// Verifica duas coisas:
//   1. algum pacote instalado declara um "engines.node" acima do mínimo
//   2. a sintaxe de cada ficheour do projecto é aceite pelo Node mínimo
//
//   node .opencode/scripts/verificar-node.mjs            // as duas
//   node .opencode/scripts/verificar-node.mjs --rapido   // só a 1 (sem rede)
//   node .opencode/scripts/verificar-node.mjs --minimo 14.21.3
//
// O mínimo vem do "engines.node" do package.json. A verificação 2 usa o
// `npx node@<versão>` e precisa de rede na primeira vez; sem rede é saltada
// com um aviso, não falha.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { repoRoot, listFiles, readText, out } from './lib/util.mjs'

const args = process.argv.slice(2)
const rapido = args.includes('--rapido')
const comoJson = args.includes('--json')
const indiceMin = args.indexOf('--minimo')
const minimoForcado = indiceMin >= 0 ? args[indiceMin + 1] : null
const root = repoRoot()

function lerMinimo() {
  if (minimoForcado) return minimoForcado
  const pkg = readText(path.join(root, 'package.json'))
  if (!pkg) return null
  try {
    const engines = JSON.parse(pkg).engines
    if (!engines || !engines.node) return null
    const m = engines.node.match(/(\d+(?:\.\d+)*)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

const MINIMO = lerMinimo()
if (!MINIMO) {
  out.erro('não sei qual é a versão mínima de Node: põe "engines": { "node": ">=X.Y.Z" } no package.json')
  process.exit(1)
}

const min = MINIMO.split('.').map(Number)
const comparar = (v) => v.split('.').map(Number)
const acima = (versao) => {
  const v = comparar(versao)
  for (let i = 0; i < 3; i++) {
    const a = v[i] || 0
    const b = min[i] || 0
    if (a > b) return true
    if (a < b) return false
  }
  return false
}

/** Menor versão declarada numa expressão de engines (aproximação). */
function menorDeclarado(expr) {
  const versoes = (expr.match(/\d+(?:\.\d+)*/g) || []).map(comparar)
  if (!versoes.length) return null
  return versoes.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2])[0].join('.')
}

// ------------------------------------------------------- 1. dependências
const modulos = path.join(root, 'node_modules')
const dependencias = []
let total = 0
let comEngines = 0

function verPasta(pasta, nome) {
  const pkgPath = path.join(pasta, 'package.json')
  if (!fs.existsSync(pkgPath)) return
  let pkg
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  } catch {
    return
  }
  total++
  const engines = pkg.engines && pkg.engines.node
  if (engines) {
    comEngines++
    const menor = menorDeclarado(engines)
    if (menor && acima(menor)) dependencias.push({ nome, engines, menor })
  }
  for (const dep of Object.keys(pkg.dependencies || {})) {
    const sub = path.join(pasta, 'node_modules', dep)
    if (fs.existsSync(sub)) verPasta(sub, `${nome} > ${dep}`)
  }
}

if (fs.existsSync(modulos)) {
  for (const entrada of fs.readdirSync(modulos, { withFileTypes: true })) {
    if (!entrada.isDirectory() || entrada.name === '.bin') continue
    if (entrada.name.startsWith('@')) {
      const pasta = path.join(modulos, entrada.name)
      for (const sub of fs.readdirSync(pasta)) verPasta(path.join(pasta, sub), `${entrada.name}/${sub}`)
      continue
    }
    verPasta(path.join(modulos, entrada.name), entrada.name)
  }
} else {
  out.aviso('node_modules não existe — corra npm install para esta verificação ter dados')
}

// ------------------------------------------------------- 2. sintaxe no Node mínimo
const sintaxe = { executado: false, motivo: null, ficheiros: [], falhas: [] }
if (!rapido) {
  const ficheiros = listFiles(root).filter((f) => f.endsWith('.js') || f.endsWith('.mjs'))
  // No Windows o npx é um .cmd, por isso precisa de shell para ser executado.
  const correr = (argsNpx) =>
    execFileSync('npx', argsNpx, { cwd: root, encoding: 'utf8', stdio: 'pipe', shell: true })
  try {
    correr(['-y', `node@${MINIMO}`, '--version'])
    sintaxe.executado = true
    for (const f of ficheiros) {
      try {
        correr(['-y', `node@${MINIMO}`, '--check', f])
        sintaxe.ficheiros.push(f)
      } catch (err) {
        sintaxe.falhas.push({ ficheiro: f, erro: (err.stderr || err.message || '').trim().split('\n')[0] })
      }
    }
  } catch (err) {
    sintaxe.motivo = `não consegui obter o Node ${MINIMO} pelo npx (sem rede?): ${(err.message || '').trim()}`
  }
}

// ------------------------------------------------------- saída
const relatorio = {
  minimo: MINIMO,
  pacotesAnalisados: total,
  comEngines,
  dependencias,
  sintaxe,
  ok: dependencias.length === 0 && sintaxe.falhas.length === 0,
}

if (comoJson) {
  console.log(JSON.stringify(relatorio, null, 2))
  process.exit(relatorio.ok ? 0 : 1)
}

out.titulo(`Compatibilidade com Node ${MINIMO}`)
console.log(`  pacotes analisados: ${total} (com "engines.node": ${comEngines})`)
if (!fs.existsSync(modulos)) {
  console.log('  !    node_modules ausente — nada a analisar')
} else if (dependencias.length === 0) {
  out.ok('nenhum pacote declara um mínimo acima do mínimo do projecto')
} else {
  out.erro(`${dependencias.length} pacote(s) acima do mínimo:`)
  for (const d of dependencias.sort((a, b) => a.nome.localeCompare(b.nome))) {
    console.log(`     ${d.nome}  engines.node="${d.engines}" (mínimo ${d.menor})`)
  }
}

console.log('')
if (rapido) {
  console.log('  (verificação de sintaxe saltada por --rapido)')
} else if (!sintaxe.executado) {
  console.log(`  !    sintaxe não verificada: ${sintaxe.motivo}`)
} else if (sintaxe.falhas.length === 0) {
  out.ok(`${sintaxe.ficheiros.length} ficheiro(s) compilam com Node ${MINIMO}`)
} else {
  out.erro(`${sintaxe.falhas.length} ficheiro(s) não compilam com Node ${MINIMO}:`)
  for (const f of sintaxe.falhas) console.log(`     ${f.ficheiro}: ${f.erro}`)
}

console.log(
  relatorio.ok
    ? '\nOK para a versão mínima declarada.'
    : '\nCorrige antes de dizer que o projecto funciona nessa versão.'
)
process.exit(relatorio.ok ? 0 : 1)
