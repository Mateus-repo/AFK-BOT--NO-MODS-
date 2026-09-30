// Versão mínima do Node.
//
// Este Mineflayer é vendorizado (ver docs/NODE-LEGADO.md) e foi corrigido para
// correr em Node 14.21.3, o último que corre nativamente no Windows 7 de 32 e
// 64 bits. Por omissão aceitamos, mas avisamos se for antigo de mais; com
// `AFK_NODE_MIN=14` (ou menos) aceitamos sem aviso.
const MINIMO_PADRAO = 14
const minimo = Number(process.env.AFK_NODE_MIN || MINIMO_PADRAO)
const majorAtual = parseInt(process.versions.node.split('.')[0], 10)
if (typeof process !== 'undefined' && !process.browser && process.platform !== 'browser' && majorAtual < minimo) {
  console.error('Este Mineflayer vendorizado exige Node >= ' + minimo + ', e está a correr com', process.versions.node)
  process.exit(1)
}
if (majorAtual < 18) {
  console.error('Aviso: Node ' + process.versions.node + ' é anterior ao 18. O Mineflayer oficial exige Node 22 ou mais; esta cópia foi corrigida para Node antigo e ainda não foi testada num servidor real.')
}

module.exports = require('./lib/loader.js')
