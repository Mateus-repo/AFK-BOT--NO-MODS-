// Verificação do estado do projeto. Só lê: não escreve, não altera nada.
//
// Uso:
//   node .opencode/scripts/verificar.mjs           // relatório legível
//   node .opencode/scripts/verificar.mjs --json    // saída para ferramentas
//   node .opencode/scripts/verificar.mjs --rapido  // só erros
//
// Saída: 0 = sem erros (avisos são permitidos), 1 = há erros.
//
// Erro (bloqueia o commit): sintaxe partida, pacote incoerente, chaves de idioma
//      em falta, segredos, dados reais versionados, AGENTS.md fora de sintonia
//      com as skills existentes.
// Aviso (não bloqueia): dívida, dados a limpar, documentação desatualizada.

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import {
  repoRoot,
  listFiles,
  readText,
  readPackage,
  parseLang,
  usedLangKeys,
  commandsInIndex,
  syntaxError,
  out,
} from './lib/util.mjs'

const args = process.argv.slice(2)
const comoJson = args.includes('--json')
const rapido = args.includes('--rapido')
const root = repoRoot()

const erros = []
const avisos = []
const nota = (nivel, id, msg) => (nivel === 'erro' ? erros : avisos).push({ id, msg })
const temErro = (id) => erros.some((e) => e.id === id)

function gitLsFiles() {
  try {
    return execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split(/\r?\n/)
      .filter(Boolean)
  } catch {
    return null
  }
}

// ------------------------------------------------------------- 1. estrutura
if (fs.existsSync(path.join(root, '.git'))) out.ok('repositório git presente')
else nota('erro', 'git', 'sem .git — a skill `commit` precisa de um repositório')

const pkg = readPackage(root)
if (!pkg) {
  nota('erro', 'package', 'sem package.json na raiz: o código do projeto ainda não foi restaurado')
} else if (pkg.__invalido) {
  nota('erro', 'package', 'package.json não é JSON válido')
} else {
  out.ok(`package.json ${pkg.name} v${pkg.version}`)
  if (pkg.main && !fs.existsSync(path.join(root, pkg.main))) {
    nota('erro', 'package', `"main": "${pkg.main}" aponta para um ficheiro inexistente`)
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version))) {
    nota('aviso', 'package', `versão "${pkg.version}" não é X.Y.Z`)
  }
  if (!pkg.license) nota('aviso', 'package', 'package.json sem campo "license"')
  if (pkg.dependencies) {
    if (!fs.existsSync(path.join(root, 'package-lock.json'))) {
      nota('aviso', 'deps', 'dependências declaradas mas sem package-lock.json')
    }
    if (!fs.existsSync(path.join(root, 'node_modules'))) {
      nota('aviso', 'deps', 'node_modules ausente — `npm install` antes de testar o bot')
    }
  }
}

// ------------------------------------------------------------ 2. sintaxe JS
{
  const js = listFiles(root).filter((f) => f.endsWith('.js') && !f.startsWith('.opencode/'))
  if (js.length === 0) nota('aviso', 'sintaxe', 'nenhum ficheiro .js na raiz — nada para verificar')
  for (const f of js) {
    const err = syntaxError(readText(path.join(root, f)), f)
    if (err) nota('erro', 'sintaxe', `${f}: ${err}`)
  }
  if (js.length && !temErro('sintaxe')) out.ok(`sintaxe de ${js.length} ficheiro(s) JavaScript`)
}

// ------------------------------------------------------------ 3. segredos
{
  let stdout = '{}'
  try {
    stdout = execFileSync(
      process.execPath,
      [path.join(root, '.opencode/scripts/check-secrets.mjs'), '--json'],
      { cwd: root, encoding: 'utf8' }
    )
  } catch (err) {
    stdout = err.stdout || '{}'
  }
  try {
    const achados = (JSON.parse(stdout || '{}').achados || []).filter(
      (a) => a.tipo !== 'e-mail pessoal'
    )
    if (achados.length === 0) out.ok('nenhum segredo suspeito')
    else {
      for (const a of achados.slice(0, 10)) nota('erro', 'segredos', `${a.ficheiro}:${a.linha} [${a.tipo}]`)
      if (achados.length > 10) nota('erro', 'segredos', `...e mais ${achados.length - 10}`)
    }
  } catch {
    nota('aviso', 'segredos', 'não consegui interpretar o resultado de check-secrets')
  }
}

// ------------------------------------------------------- 4. chaves de idioma
{
  const langDir = path.join(root, 'lang')
  const ficheiros = fs.existsSync(langDir)
    ? listFiles(root, langDir)
        .map((f) => path.join(root, f))
        .filter((f) => f.endsWith('.txt'))
    : []

  if (ficheiros.length === 0) {
    nota('aviso', 'lang', 'sem lang/*.txt na raiz (ficheiros são da skill `traducoes`)')
  } else {
    const langs = ficheiros.map((f) => ({ nome: path.basename(f), ...parseLang(f) }))
    const usadas = usedLangKeys(readText(path.join(root, 'index.js')) || '')
    for (const lang of langs) {
      const faltam = [...usadas].filter((k) => !lang.keys.has(k))
      if (faltam.length) {
        nota('erro', 'lang', `${lang.nome}: ${faltam.length} chave(s) em falta — ${faltam.slice(0, 5).join(', ')}`)
      }
      if (lang.duplicadas.length) {
        nota('aviso', 'lang', `${lang.nome}: chave(s) duplicada(s): ${lang.duplicadas.join(', ')}`)
      }
      if (lang.invalidas.length) {
        nota('erro', 'lang', `${lang.nome}: ${lang.invalidas.length} linha(s) sem '=' (ex.: linha ${lang.invalidas[0].linha})`)
      }
      const soAqui = [...lang.keys].filter((k) => langs.every((o) => o === lang || !o.keys.has(k)))
      if (soAqui.length) {
        nota('aviso', 'lang', `${lang.nome}: chave(s) só nesse ficheiro: ${soAqui.join(', ')}`)
      }
    }
    if (!temErro('lang')) out.ok(`${langs.length} ficheiro(s) de idioma coerentes`)
  }
}

// ------------------------------------------- 5. higiene do que é versionado
{
  const gitignore = readText(path.join(root, '.gitignore')) || ''
  for (const [padrao, porque] of [
    ['settings.json', 'o bot reescreve-o com servidor e conta reais'],
    ['launcher_accounts.json', 'contas do launcher'],
    ['logs/', 'logs com servidores reais'],
    ['node_modules/', 'dependências'],
  ]) {
    if (!gitignore.includes(padrao)) {
      nota('aviso', 'gitignore', `falta "${padrao}" no .gitignore (${porque})`)
    }
  }

  const tracked = gitLsFiles()
  if (tracked) {
    for (const f of tracked) {
      for (const [re, porque] of [
        [/(^|\/)logs\//, 'logs de execução'],
        [/(^|\/)node_modules\//, 'dependências'],
        [/\.exe$/i, 'binário compilado'],
        [/\.msi$/i, 'instalador do Node'],
        [/(^|\/)node_installed\.flag$/, 'marca gerada pelo launcher'],
        [/(^|\/)\.idea\//, 'configuração de IDE'],
      ]) {
        if (re.test(f)) nota('erro', 'higiene', `versionado mas nunca devia: ${f} (${porque})`)
      }
      if (/(^|\/)(settings|launcher_accounts)\.json$/.test(f)) {
        nota('erro', 'higiene', `${f} está versionado — pode conter dados reais (precisa de \`git rm --cached\`, com aprovação)`)
      }
    }
    if (!temErro('higiene')) out.ok(`higiene do repositório (${tracked.length} ficheiros versionados)`)
  }
}

// ------------------------------------- 6. documentação vs comandos reais
{
  const source = readText(path.join(root, 'index.js'))
  const readme = readText(path.join(root, 'README.md'))
  if (source && readme) {
    const comandos = commandsInIndex(source)
    const naoDocumentados = [...comandos].filter((c) => !readme.includes(`/${c}`))
    if (naoDocumentados.length) {
      nota('aviso', 'docs', `comandos sem menção no README: ${naoDocumentados.map((c) => '/' + c).join(', ')}`)
    } else {
      out.ok(`README cobre os ${comandos.size} comandos de index.js`)
    }
    if (fs.existsSync(path.join(root, 'lang'))) {
      const idiomas = listFiles(root, path.join(root, 'lang'))
        .filter((f) => f.endsWith('.txt'))
        .map((f) => path.basename(f, '.txt'))
      const noReadme = [...readme.matchAll(/lang\/([\w-]+)\.txt/g)].map((m) => m[1])
      const porDocumentar = idiomas.filter((n) => !noReadme.includes(n))
      if (porDocumentar.length) {
        nota('aviso', 'docs', `README não menciona o ficheiro de idioma: ${porDocumentar.join(', ')}`)
      }
    }
  }
}

// ------------------------------------- 7. camada de agente (AGENTS.md + skills)
{
  const agents = readText(path.join(root, 'AGENTS.md'))
  const skillsDir = path.join(root, '.opencode', 'skills')
  const skills = fs.existsSync(skillsDir)
    ? fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, 'SKILL.md')))
        .map((d) => d.name)
        .sort()
    : []

  if (!agents) {
    nota('erro', 'agentes', 'sem AGENTS.md — é a entrada de todas as skills')
  } else {
    const naoDocumentadas = skills.filter((s) => !agents.includes(s))
    if (naoDocumentadas.length) {
      nota(
        'erro',
        'agentes',
        `skills sem menção no AGENTS.md: ${naoDocumentadas.join(', ')} — a skill \`organizar-projeto\` atualiza o AGENTS.md na mesma alteração`
      )
    } else if (skills.length) {
      out.ok(`AGENTS.md cobre ${skills.length} skill(s)`)
    }
    for (const doc of ['PROGRESSO.md', 'IDEIAS.md']) {
      if (!fs.existsSync(path.join(root, doc))) {
        nota('aviso', 'agentes', `sem ${doc} (skills \`progresso\` e \`ideias\` mantêm-no)`)
      }
    }
  }
}

// -------------------------------- 8. compatibilidade com a versão mínima de Node
{
  // A verificação completa (que precisa de rede) corre à parte:
  //   node .opencode/scripts/verificar-node.mjs
  let saida = '{}'
  let correu = false
  try {
    saida = execFileSync(
      process.execPath,
      [path.join(root, '.opencode/scripts/verificar-node.mjs'), '--rapido', '--json'],
      { cwd: root, encoding: 'utf8' }
    )
    correu = true
  } catch (err) {
    saida = err.stdout || '{}'
    correu = true
  }
  if (correu) {
    try {
      const dados = JSON.parse(saida || '{}')
      if (!dados.minimo) {
        nota('aviso', 'node', 'sem "engines": { "node": ">=X.Y.Z" } no package.json — não há versão mínima declarada')
      } else if (dados.dependencias && dados.dependencias.length) {
        for (const d of dados.dependencias.slice(0, 8)) {
          nota('erro', 'node', `${d.nome} exige Node ${d.menor} (engines.node="${d.engines}") e o mínimo do projecto é ${dados.minimo}`)
        }
        if (dados.dependencias.length > 8) {
          nota('erro', 'node', `...e mais ${dados.dependencias.length - 8} pacote(s)`)
        }
      } else {
        out.ok(`dependências compatíveis com Node ${dados.minimo} (${dados.pacotesAnalisados} pacotes)`)
      }
    } catch {
      nota('aviso', 'node', 'não consegui interpretar o resultado de verificar-node')
    }
  } else {
    nota('aviso', 'node', 'verificar-node.mjs não devolveu nada')
  }
}

// ------------------------------------------- 9. testes (npm test)
{
  const temTestes = fs.existsSync(path.join(root, 'test', 'testes.js'))
  if (!temTestes) {
    nota('aviso', 'testes', 'sem test/testes.js — não há caracterização do comportamento')
  } else {
    try {
      const r = execFileSync(process.execPath, [path.join(root, 'test', 'testes.js')], {
        cwd: root,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 60000
      })
      const resumo = (r.match(/(\d+) passaram, (\d+) falharam/) || [])[0] || ''
      out.ok(`testes: ${resumo || 'sem resumo'}`)
    } catch (err) {
      const saida = `${err.stdout || ''}${err.stderr || ''}`
      const linhas = saida.split(/\r?\n/).filter((l) => l.includes('FALHA'))
      for (const l of linhas.slice(0, 6)) nota('erro', 'testes', l.trim())
      if (!linhas.length) nota('erro', 'testes', 'os testes falharam (ver node test/testes.js)')
    }
  }
}

// ------------------------------------------------------------------- saída
if (comoJson) {
  console.log(
    JSON.stringify({ raiz: root, erros, avisos, resumo: { erros: erros.length, avisos: avisos.length } }, null, 2)
  )
  process.exit(erros.length ? 1 : 0)
}

console.log(`\nVerificação de ${root}`)
console.log('='.repeat(62))
const mostrar = (nivel, lista) => {
  const visiveis = rapido && nivel === 'aviso' ? [] : lista
  if (!visiveis.length) return
  console.log(`\n${nivel === 'erro' ? 'ERROS' : 'AVISOS'} (${visiveis.length})`)
  const porId = new Map()
  for (const e of visiveis) {
    if (!porId.has(e.id)) porId.set(e.id, [])
    porId.get(e.id).push(e.msg)
  }
  for (const [id, msgs] of porId) {
    console.log(`\n  [${id}]`)
    for (const m of msgs) console.log(`    - ${m}`)
  }
}
mostrar('erro', erros)
mostrar('aviso', avisos)

console.log('\n' + '='.repeat(62))
if (!erros.length && !avisos.length) console.log('Tudo limpo.')
else if (!erros.length) console.log(`Sem erros, ${avisos.length} aviso(s).`)
else console.log(`${erros.length} erro(s) e ${avisos.length} aviso(s). Não commitar com erros.`)
process.exit(erros.length ? 1 : 0)
