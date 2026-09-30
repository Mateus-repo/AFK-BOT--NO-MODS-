// Descarrega o Paper para uma pasta de servidor, usando a API do PaperMC.
//
//   node servidores/baixar-paper.mjs [versao]     (por omissão, a mais recente)
//
// Só usa o que vem com o Node: https, crypto e fs. Corre no Node 14.
//
// O jar NÃO é versionado (ver .gitignore): é um binário de ~50 MB que se
// descarrega outra vez quando for preciso.

const https = require('https')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { execFileSync } = require('child_process')

const RAIZ = path.resolve(__dirname, '..')
const MODELO = path.join(__dirname, 'modelo')
const PASTA_SERVIDORES = __dirname
const API = 'https://fill.papermc.io/v3/projects/paper'

function pedir(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'afk-bot-instalador' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return pedir(res.headers.location).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} em ${url}`))
        }
        let dados = ''
        res.on('data', (p) => {
          dados += p
        })
        res.on('end', () => resolve(dados))
      })
      .on('error', reject)
  })
}

function pedirJson(url) {
  return pedir(url).then((t) => JSON.parse(t))
}

function descarregar(url, destino) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'user-agent': 'afk-bot-instalador' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume()
          return descarregar(res.headers.location, destino).then(resolve, reject)
        }
        if (res.statusCode !== 200) {
          res.resume()
          return reject(new Error(`HTTP ${res.statusCode} ao descarregar o jar`))
        }
        const total = Number(res.headers['content-length'] || 0)
        let recebidos = 0
        const ficheiro = fs.createWriteStream(destino)
        res.on('data', (p) => {
          recebidos += p.length
          if (total) {
            const pc = Math.floor((recebidos / total) * 100)
            process.stdout.write(`\r   a descarregar... ${pc}% (${(recebidos / 1048576).toFixed(1)} MB)`)
          }
        })
        res.pipe(ficheiro)
        ficheiro.on('finish', () => {
          process.stdout.write('\n')
          resolve()
        })
        ficheiro.on('error', reject)
      })
      .on('error', reject)
  })
}

function sha256(ficheiro) {
  return crypto.createHash('sha256').update(fs.readFileSync(ficheiro)).digest('hex')
}

function copiarModelo(destino) {
  if (!fs.existsSync(MODELO)) return
  for (const nome of fs.readdirSync(MODELO)) {
    fs.copyFileSync(path.join(MODELO, nome), path.join(destino, nome))
  }
}

async function principal() {
  const versao = process.argv[2]
  console.log('A perguntar ao PaperMC as versões disponíveis...')
  const catalogo = await pedirJson(API)
  const ids = Object.keys(catalogo.versions || {})
  if (!ids.length) {
    console.log('A API não devolveu versões. Tenta mais tarde.')
    process.exit(1)
  }
  const escolhida = versao || ids[0]
  if (!ids.includes(escolhida)) {
    console.log(`A versão "${escolhida}" não existe. Disponíveis:`)
    console.log('  ' + ids.join(', '))
    process.exit(1)
  }

  console.log(`A obter o build mais recente do Paper ${escolhida}...`)
  const builds = await pedirJson(`${API}/versions/${escolhida}/builds`)
  const build = builds[0]
  const info = build.downloads['server:default']

  const pasta = path.join(PASTA_SERVIDORES, `paper-${escolhida}`)
  fs.mkdirSync(pasta, { recursive: true })
  copiarModelo(pasta)

  const jar = path.join(pasta, info.name)
  if (fs.existsSync(jar)) {
    console.log(`Já existe ${info.name}; a descarregar de novo para garantir a versão certa.`)
  }

  console.log(`A descarregar ${info.name} (${(info.size / 1048576).toFixed(1)} MB)...`)
  await descarregar(info.url, jar)

  const calculado = sha256(jar)
  if (calculado !== info.checksums.sha256) {
    console.log('ERRO: o jar não bate certo com a soma que o PaperMC enviou.')
    console.log(`  esperado: ${info.checksums.sha256}`)
    console.log(`  obtido:   ${calculado}`)
    process.exit(1)
  }
  console.log('Soma SHA256 confirmada.')

  fs.writeFileSync(
    path.join(pasta, 'versao.json'),
    JSON.stringify({ versao: escolhida, build: build.id, jar: info.name, data: new Date().toISOString() }, null, 2)
  )

  const temJava = (() => {
    try {
      execFileSync('java', ['-version'], { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  })()

  console.log('')
  console.log(`Pronto: ${path.relative(RAIZ, pasta)}`)
  if (temJava) {
    console.log(`Arranca com:  node servidores/arrancar.mjs ${escolhida}`)
    console.log('ou:          iniciar.bat  (na pasta do servidor)')
  } else {
    console.log('Não encontrei o Java. Instala o Java 21 ou mais novo e depois arranca o servidor.')
  }
}

principal().catch((err) => {
  console.log('Não consegui preparar o servidor: ' + err.message)
  process.exit(1)
})
