'use strict'

// Deteção do servidor: perguntar a que versão responde, sem ligar o bot.
//
// Faz o pedido de estado (status ping) num socket normal, sem dependências.
// Tudo o que toca na rede entra por injecção, para os testes não precisarem de
// servidor nenhum.

const net = require('net')

/**
 * Pacote de pedido de estado (protocolo moderno):
 *   packet id 0x00 (handshake) · varint estado 1 (status) · varint protocolo
 *   string endereço · unsigned short porta · varint estado seguinte (1 = status)
 */
function pedidoEstado() {
  return Buffer.from([0x00, 0x00, 0x01, 0x08, 0x00, 0x00, 0x00, 0x01])
}

/** Lê uma string com comprimento variável em varint. */
function lerVarint(buffer, posicao) {
  let valor = 0
  let tamanho = 0
  let pos = posicao
  while (pos < buffer.length) {
    const byte = buffer[pos]
    valor |= (byte & 0x7f) << (7 * tamanho)
    pos += 1
    tamanho += 1
    if ((byte & 0x80) === 0) return { valor, bytes: tamanho }
  }
  return { valor: 0, bytes: 0 }
}

/**
 * Tira a informação útil de uma resposta de estado.
 * Formato moderno: JSON. Formato antigo (1.6 e anteriores): strings com
 * comprimento. Devolve sempre um objecto, nunca lança.
 */
function analisarResposta(buffer) {
  const bruto = Buffer.isBuffer(buffer) ? buffer : Buffer.from(String(buffer), 'utf8')
  if (!bruto.length) {
    return { formato: 'vazio', nome: null, protocolo: null, jogadores: null, maxJogadores: null }
  }

  // Tenta JSON a partir do primeiro '{'
  const inicio = bruto.indexOf(0x7b) // '{'
  if (inicio >= 0) {
    try {
      const dados = JSON.parse(bruto.slice(inicio).toString('utf8'))
      if (dados && dados.version) {
        return {
          formato: 'json',
          nome: dados.version.name || null,
          protocolo: dados.version.protocol === undefined ? null : Number(dados.version.protocol),
          jogadores: dados.players ? dados.players.online : null,
          maxJogadores: dados.players ? dados.players.max : null,
          motd: typeof dados.description === 'string' ? dados.description : null
        }
      }
    } catch {
      // segue para o formato antigo
    }
  }

  // Formato antigo: packet id + varint tamanho + string versão
  let pos = 0
  if (bruto[0] === 0x00 || bruto[0] === 0x01) pos = 1
  const tamanho = lerVarint(bruto, pos)
  if (tamanho.bytes > 0 && tamanho.valor > 0 && pos + tamanho.bytes < bruto.length) {
    const inicioString = pos + tamanho.bytes
    const nome = bruto.slice(inicioString, inicioString + tamanho.valor).toString('utf8').trim()
    if (nome) {
      return { formato: 'antigo', nome, protocolo: null, jogadores: null, maxJogadores: null, motd: null }
    }
  }

  return { formato: 'desconhecido', nome: null, protocolo: null, jogadores: null, maxJogadores: null }
}

/**
 * Ping de estado. \`ligar(host, porta)\` devolve um socket (por omissão, net.connect).
 * Nunca lança: resolve sempre com \`{ ok, ... }\`.
 */
function criarPinger({ ligar, timeoutMs = 5000 } = {}) {
  const abrir = ligar || ((host, porta) => net.connect({ host, port: porta }))

  return function pingar(host, porta) {
    return new Promise((resolve) => {
      let socket = null
      let resolvido = false
      let temporizador = null
      const partes = []

      const terminar = (resultado) => {
        if (resolvido) return
        resolvido = true
        if (temporizador) clearTimeout(temporizador)
        try {
          if (socket) socket.destroy()
        } catch {
          // já está fechado
        }
        resolve(resultado)
      }

      try {
        socket = abrir(host, porta)
      } catch (err) {
        resolve({ ok: false, motivo: err.message })
        return
      }
      if (!socket) {
        resolve({ ok: false, motivo: 'não foi possível abrir a ligação' })
        return
      }

      temporizador = setTimeout(
        () => terminar({ ok: false, motivo: 'sem resposta a tempo' }),
        timeoutMs
      )

      socket.on('data', (dados) => {
        partes.push(Buffer.from(dados))
        const tudo = Buffer.concat(partes)
        const r = analisarResposta(tudo)
        if (r.formato === 'json') {
          const nomeCurto = r.nome ? String(r.nome).split(' ')[0] : null
          terminar({ ok: true, ...r, nomeCurto })
        }
      })

      socket.on('error', (err) => {
        if (temporizador) clearTimeout(temporizador)
        terminar({ ok: false, motivo: err.message })
      })

      socket.on('close', () => {
        if (resolvido) return
        const r = analisarResposta(Buffer.concat(partes))
        if (r.formato === 'antigo' || r.formato === 'json') {
          const nomeCurto = r.nome ? String(r.nome).split(' ')[0] : null
          terminar({ ok: true, ...r, nomeCurto })
        } else {
          terminar({ ok: false, motivo: 'ligação fechada sem resposta' })
        }
      })

      try {
        socket.write(pedidoEstado())
      } catch (err) {
        terminar({ ok: false, motivo: err.message })
      }
    })
  }
}

/** Versões que a biblioteca conhece, da mais antiga para a mais recente. */
function versoesConhecidas() {
  try {
    const data = require('minecraft-data/data.js')
    return Object.keys(data.pc || {})
  } catch {
    return []
  }
}

/**
 * Decide com que versão falar com o servidor. Função pura.
 * \`configurada\` pode ser uma versão, 'auto', ou null/vazia.
 */
function escolherVersao({ configurada, protocoloServidor, conhecidas } = {}) {
  const lista = conhecidas || []

  if (configurada && configurada !== 'auto') {
    return {
      versao: configurada,
      origem: 'configuracao',
      suportada: lista.includes(configurada),
      motivo: lista.includes(configurada) ? null : `a biblioteca não conhece a versão ${configurada}`
    }
  }

  if (!protocoloServidor) {
    return {
      versao: null,
      origem: 'auto',
      suportada: false,
      motivo: 'não foi possível detectar a versão do servidor'
    }
  }

  let escolhida = null
  try {
    const data = require('minecraft-data/data.js')
    for (const v of lista) {
      const info = data.pc[v]
      if (info && info.version && Number(info.version.majorVersion ? info.version : info.version) !== null) {
        // data.pc[v].version tem {minecraftVersion, version}
        const protocolo = info.version.version
        if (Number(protocolo) === Number(protocoloServidor)) {
          escolhida = v
          break
        }
      }
    }
  } catch {
    escolhida = null
  }

  return {
    versao: escolhida,
    origem: 'auto',
    suportada: !!escolhida,
    motivo: escolhida ? null : `nenhuma versão conhecida usa o protocolo ${protocoloServidor}`
  }
}

/** Junta o resultado do ping com a decisão, para uma linha de diagnóstico. */
function descreverServidor(ping) {
  if (!ping || !ping.ok) {
    return { titulo: null, protocolo: null, suportada: false, motivo: (ping && ping.motivo) || 'sem resposta' }
  }
  return {
    titulo: ping.nome || null,
    protocolo: ping.protocolo,
    jogadores: ping.jogadores,
    maxJogadores: ping.maxJogadores,
    suportada: ping.protocolo !== null,
    motivo: null
  }
}

module.exports = {
  pedidoEstado,
  lerVarint,
  analisarResposta,
  criarPinger,
  versoesConhecidas,
  escolherVersao,
  descreverServidor
}
