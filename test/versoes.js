'use strict'

// Testes da compatibilidade com versões do Minecraft que a biblioteca ainda não
// conhece (src/versoes.js). A matemática do remapeamento de pacotes é testada
// com objectos falsos, sem depender da biblioteca.
//
//   node test/versoes.js

const assert = require('assert')
const versoes = require('../src/versoes')

let passou = 0
let falhou = 0
const falhas = []

const fila = []
function teste(nome, fn) {
  fila.push(
    (async () => {
      try {
        await fn()
        passou += 1
        console.log(`  ok    ${nome}`)
      } catch (err) {
        falhou += 1
        falhas.push({ nome, err })
        console.log(`  FALHA ${nome}`)
        console.log(`        ${err.message}`)
      }
    })()
  )
  return fila[fila.length - 1]
}

console.log('\nversões')

// ------------------------------------------------------- deslocamento de ids
teste('até 0x22 os identificadores ficam onde estão', () => {
  assert.strictEqual(versoes.deslocarPacote(0x00), 0x00)
  assert.strictEqual(versoes.deslocarPacote(0x10), 0x10)
  assert.strictEqual(versoes.deslocarPacote(0x22), 0x22)
})

teste('de 0x23 a 0x5d deslizam uma casa', () => {
  assert.strictEqual(versoes.deslocarPacote(0x23), 0x24)
  assert.strictEqual(versoes.deslocarPacote(0x40), 0x41)
  assert.strictEqual(versoes.deslocarPacote(0x5d), 0x5e)
})

teste('de 0x5e a 0x77 deslizam duas casas', () => {
  assert.strictEqual(versoes.deslocarPacote(0x5e), 0x60)
  assert.strictEqual(versoes.deslocarPacote(0x70), 0x72)
  assert.strictEqual(versoes.deslocarPacote(0x77), 0x79)
})

teste('a partir de 0x78 deslizam três casas', () => {
  assert.strictEqual(versoes.deslocarPacote(0x78), 0x7b)
  assert.strictEqual(versoes.deslocarPacote(0x90), 0x93)
  assert.strictEqual(versoes.deslocarPacote(0xff), 0x102)
})

// ------------------------------------------------------------- remapeamento
teste('remapear não mexe no mapa original', () => {
  const original = { '0x00': 'a', '0x30': 'b' }
  const copia = JSON.parse(JSON.stringify(original))
  versoes.remapearPacotes(original)
  assert.deepStrictEqual(original, copia)
})

teste('os pacotes desviados ocupam os sítios certos', () => {
  const novo = versoes.remapearPacotes({ '0x00': 'login' })
  assert.strictEqual(novo['0x00'], 'login')
  assert.strictEqual(novo['0x23'], 'unknown_0x23')
  assert.strictEqual(novo['0x5f'], 'unknown_0x5f')
  assert.strictEqual(novo['0x7a'], 'unknown_0x7a')
  assert.strictEqual(novo['0x7b'], 'unknown_0x7b')
})

teste('os identificadores ficam em hexadecimal com dois dígitos', () => {
  const novo = versoes.remapearPacotes({ '0x05': 'cinco' })
  assert.ok(Object.keys(novo).every((k) => /^0x[0-9a-f]{2,}$/.test(k)), Object.keys(novo).join(','))
})

// ---------------------------------------------------- mapa de configuração
teste('o mapa de configuração vai de 0x00 a 0x14', () => {
  const mapa = versoes.mapaConfiguration()
  assert.strictEqual(mapa['0x00'], 'cookie_request')
  assert.strictEqual(mapa['0x14'], 'code_of_conduct')
  assert.strictEqual(Object.keys(mapa).length, versoes.PACOTES_CONFIGURATION_26_3.length)
})

teste('teleport_confirm leva coordenadas', () => {
  const pacote = versoes.pacoteTeleportConfirm()
  assert.strictEqual(pacote[0], 'container')
  assert.deepStrictEqual(
    pacote[1].map((c) => c.name),
    ['teleportId', 'x', 'y', 'z', 'yRot', 'xRot']
  )
})

// --------------------------------------------------------------- instalação
function pacoteFalso(mapeamento) {
  return [null, [{ type: [null, { mappings: mapeamento }] }]]
}

function baseFalsa() {
  return {
    pc: {
      '26.1': {
        protocol: {
          configuration: { toClient: { types: { packet: pacoteFalso({ '0x00': 'antigo' }) } } },
          play: {
            toClient: { types: { packet: pacoteFalso({ '0x00': 'spawn_entity', '0x30': 'chat' }) } },
            toServer: { types: {} }
          }
        }
      }
    }
  }
}

teste('instala a versão nova a partir da base', () => {
  const data = baseFalsa()
  const minecraftData = { supportedVersions: { pc: ['26.1'] } }
  const versaoMineflayer = { testedVersions: ['26.1'], latestSupportedVersion: '26.1' }

  const r = versoes.instalar({
    alvo: '26.3',
    base: '26.1',
    data,
    minecraftData,
    mineflayerVersion: versaoMineflayer
  })

  assert.strictEqual(r.aplicada, true, r.motivo || '')
  assert.ok(data.pc['26.3'], 'a versão nova tem de existir nos dados')
  assert.strictEqual(data.pc['26.3'].version.minecraftVersion, '26.3')
  assert.strictEqual(data.pc['26.3'].version.version, 777)
  assert.ok(minecraftData.supportedVersions.pc.includes('26.3'))
  assert.ok(versaoMineflayer.testedVersions.includes('26.3'))
  assert.strictEqual(versaoMineflayer.latestSupportedVersion, '26.3')
})

teste('a versão instalada tem os pacotes remapeados', () => {
  const data = baseFalsa()
  versoes.instalar({ alvo: '26.3', base: '26.1', data })
  const mappings = data.pc['26.3'].protocol.play.toClient.types.packet[1][0].type[1].mappings
  assert.strictEqual(mappings['0x00'], 'spawn_entity')
  assert.strictEqual(mappings['0x31'], 'chat', '0x30 tinha de deslizar para 0x31')
})

teste('a versão base fica intacta', () => {
  const data = baseFalsa()
  versoes.instalar({ alvo: '26.3', base: '26.1', data })
  const base = data.pc['26.1'].protocol.play.toClient.types.packet[1][0].type[1].mappings
  assert.deepStrictEqual(base, { '0x00': 'spawn_entity', '0x30': 'chat' })
  assert.strictEqual(data.pc['26.1'].version, undefined)
})

teste('teleport_confirm é substituído na versão nova', () => {
  const data = baseFalsa()
  versoes.instalar({ alvo: '26.3', base: '26.1', data })
  const tipos = data.pc['26.3'].protocol.play.toServer.types
  assert.ok(tipos.packet_teleport_confirm, 'o pacote tem de existir')
  assert.strictEqual(tipos.packet_teleport_confirm[1].length, 6)
})

teste('não instala se a base não existir', () => {
  const r = versoes.instalar({ alvo: '26.3', base: '99.9', data: { pc: {} } })
  assert.strictEqual(r.aplicada, false)
  assert.ok(r.motivo.includes('99.9'), r.motivo)
})

teste('não instala se a biblioteca já conhece a versão', () => {
  const data = baseFalsa()
  data.pc['26.3'] = { ja: 'la' }
  const r = versoes.instalar({ alvo: '26.3', base: '26.1', data })
  assert.strictEqual(r.aplicada, false)
  assert.ok(r.motivo.includes('já conhece'), r.motivo)
})

teste('dados partidos não rebentam o arranque', () => {
  const data = { pc: { '26.1': {} } }
  let r
  assert.doesNotThrow(() => {
    r = versoes.instalar({ alvo: '26.3', base: '26.1', data })
  })
  assert.strictEqual(r.aplicada, false)
  assert.ok(r.motivo, 'tem de haver um motivo')
})

teste('sem dados também não rebenta', () => {
  const r = versoes.instalar({ alvo: '26.3', base: '26.1', data: null })
  assert.strictEqual(r.aplicada, false)
  assert.ok(r.motivo.includes('sem dados'), r.motivo)
})

// ---------------------------------------------------------------------- fim
Promise.all(fila).then(() => {
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  if (falhou) process.exit(1)
})
