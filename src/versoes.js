'use strict'

// Compatibilidade com versões do Minecraft que a biblioteca minecraft-data ainda
// não conhece. A ideia é remapear os identificadores de pacote do protocolo.
//
// Isto é uma porta do branch `Tests` (código do outro autor), reescrita para ser
// testável: a matemática do remapeamento está isolada em funções puras e o resto
// só mexe em objectos que recebe, por isso os testes não precisam da biblioteca.
//
// IMPORTANTE: remapear pacotes à mão parte quando o formato muda. Isto não está
// testado contra um servidor real — ver docs/versoes.md.

/** Pacotes do estado de configuração na 26.3, na ordem. */
const PACOTES_CONFIGURATION_26_3 = [
  'cookie_request',
  'custom_payload',
  'disconnect',
  'finish_configuration',
  'keep_alive',
  'ping',
  'reset_chat',
  'registry_data',
  'remove_resource_pack',
  'add_resource_pack',
  'store_cookie',
  'transfer',
  'unknown_0x0c',
  'feature_flags',
  'tags',
  'select_known_packs',
  'custom_report_details',
  'server_links',
  'clear_dialog',
  'show_dialog',
  'code_of_conduct'
]

/** Pacotes novos que a 26.3 acrescenta em posições fixas. */
const PACOTES_DESVIADOS_26_3 = {
  '0x23': 'unknown_0x23',
  '0x5f': 'unknown_0x5f',
  '0x7a': 'unknown_0x7a',
  '0x7b': 'unknown_0x7b'
}

/** Onde é que cada identificador desliza: até 0x22 fica, depois vai subindo. */
function deslocarPacote(num) {
  if (num <= 0x22) return num
  if (num <= 0x5d) return num + 1
  if (num <= 0x77) return num + 2
  return num + 3
}

function paraHexa(num) {
  return '0x' + num.toString(16).padStart(2, '0')
}

/**
 * Remapeia os identificadores de um mapa { '0x00': 'nome' } para a 26.3.
 * Função pura: devolve um mapa novo e não toca no original.
 */
function remapearPacotes(mapeamento) {
  const novo = {}
  for (const [id, nome] of Object.entries(mapeamento || {})) {
    novo[paraHexa(deslocarPacote(parseInt(id, 16)))] = nome
  }
  for (const [id, nome] of Object.entries(PACOTES_DESVIADOS_26_3)) {
    novo[id] = nome
  }
  return novo
}

/** Mapa de identificadores para a lista de pacotes do estado de configuração. */
function mapaConfiguration() {
  const mapa = {}
  PACOTES_CONFIGURATION_26_3.forEach((nome, i) => {
    mapa[paraHexa(i)] = nome
  })
  return mapa
}

/** Constrói o pacote teleport_confirm, que na 26.3 passou a levar coordenadas. */
function pacoteTeleportConfirm() {
  return [
    'container',
    [
      { name: 'teleportId', type: 'varint' },
      { name: 'x', type: 'f64' },
      { name: 'y', type: 'f64' },
      { name: 'z', type: 'f64' },
      { name: 'yRot', type: 'f32' },
      { name: 'xRot', type: 'f32' }
    ]
  ]
}

/**
 * Torna a versão `alvo` conhecida da biblioteca, a partir de `base`.
 * Devolve { aplicada, motivo } e nunca lança: uma falha aqui não pode impedir
 * o bot de arrancar.
 */
function instalar({ alvo, base, data, minecraftData, mineflayerVersion, log, t }) {
  const versao = {
    minecraftVersion: alvo,
    version: alvo === '26.3' ? 777 : undefined,
    dataVersion: alvo === '26.3' ? 5023 : undefined,
    usesNetty: true,
    majorVersion: alvo,
    releaseType: 'release'
  }

  try {
    if (!data || !data.pc) return { aplicada: false, motivo: 'sem dados de versões' }
    if (data.pc[alvo]) return { aplicada: false, motivo: 'a biblioteca já conhece esta versão' }
    if (!data.pc[base]) return { aplicada: false, motivo: `a biblioteca não conhece a versão base ${base}` }

    const protocolo = JSON.parse(JSON.stringify(data.pc[base].protocol))

    // Estado de configuração: lista de pacotes nova
    const configToClient = protocolo.configuration.toClient.types.packet[1][0].type[1]
    configToClient.mappings = mapaConfiguration()
    protocolo.configuration.toClient.types.packet_unknown_0x0c = ['container', []]

    // Estado de jogo: identificadores deslocados
    const playToClient = protocolo.play.toClient.types.packet[1][0].type[1]
    playToClient.mappings = remapearPacotes(playToClient.mappings)
    for (const nome of ['unknown_0x23', 'unknown_0x5f', 'unknown_0x7a', 'unknown_0x7b']) {
      protocolo.play.toClient.types[`packet_${nome}`] = ['container', []]
    }

    // teleport_confirm passa a levar coordenadas
    protocolo.play.toServer.types.packet_teleport_confirm = pacoteTeleportConfirm()

    data.pc[alvo] = { ...data.pc[base], protocol: protocolo }
    Object.defineProperty(data.pc[alvo], 'version', {
      get: () => versao,
      enumerable: true,
      configurable: true
    })

    if (minecraftData && minecraftData.supportedVersions && !minecraftData.supportedVersions.pc.includes(alvo)) {
      minecraftData.supportedVersions.pc.push(alvo)
    }
    if (mineflayerVersion && !mineflayerVersion.testedVersions.includes(alvo)) {
      mineflayerVersion.testedVersions.push(alvo)
      mineflayerVersion.latestSupportedVersion = alvo
    }

    if (log && t) log(t('version_patch_applied'), 'INFO')
    return { aplicada: true, motivo: null }
  } catch (err) {
    if (log && t) log(`${t('version_patch_failed')} ${err.message}`, 'WARN')
    return { aplicada: false, motivo: err.message }
  }
}

/** Faz a conversa parecer mais recente, para o Mineflayer não recusar a conta. */
function registarFisicas(prismarinePhysics, alvo, base) {
  try {
    const features = require(prismarinePhysics)
    for (const item of features) {
      if (item.versions.includes(base) && !item.versions.includes(alvo)) {
        item.versions.push(alvo)
      }
    }
    return true
  } catch {
    return false
  }
}

/**
 * Atalho para o arranque: usa a biblioteca real e nunca lança.
 * Chamar isto ANTES de `require('mineflayer')`, senão o Mineflayer já carregou
 * a lista de versões sem a versão nova.
 */
function instalarVersaoPadrao({ alvo = '26.3', base = '26.1' } = {}) {
  try {
    const data = require('minecraft-data/data.js')
    const minecraftData = require('minecraft-data')
    let mineflayerVersion = null
    try {
      mineflayerVersion = require('mineflayer/lib/version')
    } catch {
      mineflayerVersion = null
    }
    return instalar({ alvo, base, data, minecraftData, mineflayerVersion })
  } catch (err) {
    return { aplicada: false, motivo: `biblioteca indisponível: ${err.message}` }
  }
}

module.exports = {
  instalar,
  instalarVersaoPadrao,
  remapearPacotes,
  deslocarPacote,
  mapaConfiguration,
  pacoteTeleportConfirm,
  registarFisicas,
  PACOTES_CONFIGURATION_26_3,
  PACOTES_DESVIADOS_26_3
}
