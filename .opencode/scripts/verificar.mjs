//!/usr/bin/env node
// Verificação do estado do projeto. Só lê: não escreve, não altera nada.
//
// Uso:
//   node .opencode/scripts/verificar.mjs          # relatório legível
//   node .opencode/scripts/verificar.mjs --json   # saída para ferramentas
//   node .opencode/scripts/verificar.mjs --rapido # só erros
//
// Saída: 0 = sem erros (avisos são permitidos), 1 = há erros.
//
// Erro   (bloqueia o commit): sintaxe partida, pacote incoerente, chaves de
//         idioma em falta, segredos, ficheiros de dados reais versionados,
//         AGENTS.md fora de sintonia com as skills existentes.
// Aviso  (não bloqueia): coisas a arrumar, dívida, documentação desatualizada.

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
  parseTableRow,
  out,
} from './lib/util.mjs'

const args = process.argv.slice(2)
const comoJson = args.includes('--json')
const rapido = args.includes('--rapido')
const root = repoRoot()

const erros = []
const avisos = []
const nota = (nivel, id, msg) => (nivel === 'erro' ? erros : avisos).push({ id, msg })

// ---------------------------------------------------------------- 1. estrutura
{
  const temGit = fs.existsSync(path.join(root, '.git'))
  if (temGit) out.ok('repositório git presente')
  else nota('erro', 'git', 'sem .git — a skill `commit` precisa de um repositório')
}

const pkg = readPackage(root)
if (!pkg) {
  nota('erro', 'package', 'sem package.json na raiz: o projeto não foi restaurado')
} else if (pkg.__invalido) {
  nota('erro', 'package', 'package.json não é JSON válido')
} else {
  out.ok(`package.json ${pkg.name} v${pkg.version}`)
  if (pkg.main && !fs.existsSync(path.join(root, pkg.main))) {
    nota('erro', 'package', `"main": "${pkg.main}" aponta para um ficheiro que não existe`)
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version))) {
    nota('aviso', 'package', `versão "${pkg.version}" não é X.Y.Z — a skill \`lancar-versao\` usa esse formato`)
  }
  if (!pkg.license) nota('aviso', 'package', 'package.json sem campo "license"')
  if (pkg.dependencies) {
    const lock = fs.existsSync(path.join(root, 'package-lock.json'))
    if (!lock) nota('aviso', 'deps', 'dependências declaradas mas sem package-lock.json')
    const mod = fs.existsSync(path.join(root, 'node_modules'))
    if (!mod) nota('aviso', 'deps', 'node_modules ausente — corre `npm install` antes de testar o bot')
  }
}

// ------------------------------------------------------- 2. sintaxe do código
{
  const js = listFiles(root).filter((f) => f.endsWith('.js') && !f.includes('/.opencode/'))
  if (js.length === 0) {
    nota('aviso', 'sintaxe', 'nenhum ficheiro .js na raiz — nada para verificar')
  }
  for (const f of js) {
    const err = syntaxError(readText(path.join(root, f)), f)
    if (err) nota('erro', 'sintaxe', `${f}: ${err}`)
  }
  if (js.length && !erros.some((e) => e.id === 'sintaxe')) {
    out.ok(`sintaxe de ${js.length} ficheiro(s) JavaScript`)
  }
}

// ------------------------------------------------------------- 3. segredos
{
  let stdout = ''
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
    const dados = JSON.parse(stdout || '{}')
    const achados = (dados.achados || []).filter((a) => a.tipo !== 'e-mail pessoal')
    if (achados.length === 0) out.ok('nenhum segredo suspeito')
    else {
      for (const a of achados.slice(0, 10)) {
        nota('erro', 'segredos', `${a.ficheiro}:${a.linha} [${a.tipo}]`)
      }
      if (achados.length > 10) nota('erro', 'segredos', `...e mais ${achados.length - 10}`)
    }
  } catch {
    nota('aviso', 'segredos', 'não consegui interpretar o resultado de check-secrets')
  }
}

// ------------------------------------------------- 4. chaves de idioma
{
  const langDir = path.join(root, 'lang')
  const ficheiros = fs.existsSync(langDir)
    ? listFiles(root, langDir)
        .map((f) => path.join(root, f))
        .filter((f) => f.endsWith('.txt'))
    : []

  if (ficheiros.length === 0) {
    nota('aviso', 'lang', 'sem lang/*.txt na raiz (a skill `traducoes` trata deste ficheiro)')
  } else {
    const langs = ficheiros.map((f) => ({ nome: path.basename(f), ...parseLang(f) }))
    const referencia = langs.reduce((a, b) => (a.keys.size >= b.keys.size ? a : b), langs[0])
    const usadas = usedLangKeys(readText(path.join(root, 'index.js')) || '')
    for (const lang of langs) {
      const faltam = [...usadas].filter((k) => !lang.keys.has(k))
      if (faltam.length) nota('erro', 'lang', `${lang.nome}: ${faltam.length} chave(s) em falta — ${faltam.slice(0, 5).join(', ')}`)
      if (lang.duplicadas.length) nota('aviso', 'lang', `${lang.nome}: chave(s) duplicada(s) ${lang.duplicadas.join(', ')}`)
      if (lang.invalidas.length) nota('erro', 'lang', `${lang.nome}: ${lang.invalidas.length} linha(s) sem '=' (ex.: linha ${lang.invalidas[0].linha})`)
      const soAqui = [...lang.keys].filter((k) => langs.every((o) => o === lang || !o.keys.has(k)))
      if (soAqui.length) nota('aviso', 'lang', `${lang.nome}: chave(s) só neste ficheiro — ${soAqui.join(', ')}`)
    }
    if (!erros.some((e) => e.id === 'lang')) out.ok(`${langs.length} ficheiro(s) de idioma, ${referencia.keys.size} chaves`)
  }
}

// ------------------------------------------- 5. dados reais e lixo no git
{
  const gitignore = readText(path.join(root, '.gitignore')) || ''
  const precisaIgnorar = [
    ['settings.json', 'o bot reescreve-o com o servidor e a conta reais'],
    ['launcher_accounts.json', 'contas do launcher'],
    ['logs/', 'logs com servidores reais'],
    ['node_modules/', 'dependências'],
  ]
  for (const [padrao, porque] of precisaIgnorar) {
    if (!gitignore.includes(padrao)) nota('aviso', 'gitignore', `falta "${padrao}" no .gitignore (${porque})`)
  }

  const nuncaVersionar = [
    [/^logs\//, 'logs de execução'],
    [/^node_modules\//, 'dependências'],
    [/\.exe$/i, 'binário compilado'],
    [/\.msi$/i, 'instalador do Node'],
    [/^node_installed\.flag$/, 'marca gerada pelo launcher'],
    [/\.idea\//, 'configuração de IDE'],
  ]
  let temGit = fs.existsSync(path.join(root, '.git'))
  if (temGit) {
    let tracked = []
    try {
      tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
        .split(/\r?\n/)
        .filter(Boolean)
    } catch {
      temGit = false
    }
    for (const f of tracked) {
      for (const [re, porque] of nuncaVersionar) {
        if (re.test(f)) nota('erro', 'higiene', `versionado mas nunca devia: ${f} (${porque})`)
      }
      if (/^(settings|launcher_accounts)\.json$/.test(f)) {
        nota('erro', 'higiene', `${f} está versionado — pode conter dados reais (usa \`git rm --cached\`, com aprovação)`)
      }
    }
    if (temGit && !erros.some((e) => e.id === 'higiene')) out.ok(`higiene do repositório (${tracked.length} ficheiros versionados)`)
  }
}

// ------------------------------------- 6. documentação vs comandos reais
{
  const source = readText(path.join(root, 'index.js'))
  const readme = readText(path.join(root, 'README.md'))
  if (source && readme) {
    const comandos = commandsInIndex(source)
    const naoDocumentados = [...comandos].filter(
      (c) => !readme.includes(`/${c}`) && c !== 'default'
    )
    if (naoDocumentados.length) {
      nota('aviso', 'docs', `comandos sem README: ${naoDocumentados.map((c) => '/' + c).join(', ')}`)
    } else {
      out.ok(`README documenta os ${comandos.size} comandos de index.js`)
    }
    const langs = fs.existsSync(path.join(root, 'lang'))
      ? listFiles(root, path.join(root, 'lang')).filter((f) => f.endsWith('.txt'))
      : []
    const documentados = [...readme.matchAll(/lang\/([\w-]+)\.txt/g)].map((m) => m[1])
    const porDocumentar = langs.map((f) => path.basename(f, '.txt')).filter((n) => !documentados.includes(n))
    if (porDocumentar.length) nota('aviso', 'docs', `README não menciona o idioma: ${porDocumentar.join(', ')}`)
  }
}

// --------------------------------------- 7. camada de agente (AGENTS/skills)
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
      nota('erro', 'agentes', `skills sem menção no AGENTS.md: ${naoDocumentadas.join(', ')} — a skill \`organizar-projeto\` atualiza o AGENTS.md na mesma alteração`)
    }
    for (const doc of ['PROGRESSO.md', 'IDEIAS.md']) {
      if (!fs.existsSync(path.join(root, doc))) nota('aviso', 'agentes', `sem ${doc} (skills \`progresso\` e \`ideias\` mantêm-no)`)
    }
    if (skills.length && !naoDocumentadas.length) out.ok(`AGENTS.md cobre ${skills.length} skill(s)`)
  }
}

// ------------------------------------------------------------------- saída
const relatorio = { raiz: root, erros, avisos, resumo: { erros: erros.length, avisos: avisos.length } }

if (comoJson) {
  console.log(JSON.stringify(relatorio, null, 2))
  process.exit(erros.length ? 1 : 0)
}

console.log(`\nVerificação de ${root}`)
console.log('='.repeat(60))
const mostrar = (nivel, lista) => {
  const visiveis = rapido && nivel === 'aviso' ? [] : lista
  if (!visiveis.length) return
  out.titulo(nivel === 'erro' ? `ERROS (${visiveis.length})` : `AVISOS (${visiveis.length})`)
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

console.log('\n' + '='.repeat(60))
if (erros.length === 0 && avisos.length === 0) {
  console.log('Tudo limpo.')
} else if (erros.length === 0) {
  console.log(`Sem erros, ${avisos.length} aviso(s).`)
} else {
  console.log(`${erros.length} erro(s) e ${avisos.length} aviso(s). Não faças commit com erros.`)
}
process.exit(erros.length ? 1 : 0)
