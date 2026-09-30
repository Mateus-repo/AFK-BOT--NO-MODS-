// Arranca (ou pára) um servidor de testes.
//
//   node servidores/arrancar.mjs <versao>        arranca
//   node servidores/arrancar.mjs <versao> stop   manda parar e espera
//
// O Paper foi deixado com stdin fechado para não roubar o terminal: escreve
// "stop" no stdin do processo.

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const RAIZ = path.resolve(__dirname, '..')
const versao = process.argv[2]
const accao = process.argv[3] === 'stop' ? 'stop' : 'start'

function pastaDoServidor() {
  if (!versao) {
    const pastas = fs
      .readdirSync(__dirname, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('paper-'))
      .map((d) => d.name)
    if (!pastas.length) {
      console.log('Não há nenhum servidor. Corre primeiro: node servidores/baixar-paper.mjs')
      process.exit(1)
    }
    return path.join(__dirname, pastas.sort().pop())
  }
  return path.join(__dirname, `paper-${versao}`)
}

function encontrarJar(pasta) {
  const candidatos = fs
    .readdirSync(pasta)
    .filter((f) => f.endsWith('.jar'))
    .filter((f) => !f.includes('sources') && !f.includes('javadoc'))
  if (!candidatos.length) {
    console.log(`Não há jar em ${pasta}. Corre: node servidores/baixar-paper.mjs ${versao || ''}`.trim())
    process.exit(1)
  }
  return path.join(pasta, candidatos[0])
}

const pasta = pastaDoServidor()
const jar = encontrarJar(pasta)
const infoPath = path.join(pasta, 'versao.json')
const versaoInstalada = fs.existsSync(infoPath) ? JSON.parse(fs.readFileSync(infoPath, 'utf8')).versao : '?'

if (accao === 'stop') {
  const ficheiroPid = path.join(pasta, 'servidor.pid')
  if (!fs.existsSync(ficheiroPid)) {
    console.log('Não há PID registado: o servidor não parece estar a correr a partir daqui.')
    process.exit(0)
  }
  const pid = Number(fs.readFileSync(ficheiroPid, 'utf8').trim())
  try {
    process.kill(pid, 'SIGINT') // no Windows isto é TerminateProcess
    console.log(`Mandado parar o servidor (pid ${pid}).`)
  } catch (err) {
    console.log(`Não consegui parar o pid ${pid}: ${err.message}`)
  }
  fs.unlinkSync(ficheiroPid)
  process.exit(0)
}

const memoria = process.env.AFK_MEMORIA || '1G'
console.log(`A arrancar o Paper ${versaoInstalada} em ${path.relative(RAIZ, pasta)} (${memoria})...`)
console.log('Para parar, Ctrl+C, ou noutra janela: node servidores/arrancar.mjs ' + (versao || '') + ' stop')
console.log('')

const proc = spawn('java', ['-Xms512M', `-Xmx${memoria}`, '-jar', jar, 'nogui'], {
  cwd: pasta,
  stdio: ['pipe', 'inherit', 'inherit']
})

fs.writeFileSync(path.join(pasta, 'servidor.pid'), String(proc.pid))

proc.on('exit', (codigo) => {
  const ficheiroPid = path.join(pasta, 'servidor.pid')
  if (fs.existsSync(ficheiroPid)) fs.unlinkSync(ficheiroPid)
  console.log(`\nO servidor parou (código ${codigo}).`)
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('\nA parar o servidor... escreve "stop" quando o prompt aparecer.')
  // O Paper lê comandos do stdin; sem isto ficaria à espera para sempre.
  try {
    proc.stdin.write('stop\n')
  } catch {
    // já closed
  }
})
