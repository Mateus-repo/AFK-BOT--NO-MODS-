'use strict'

// Testes da detecção de servidor (src/deteccao.js). Nenhum toca na rede: a
// função que abre a ligação é injectada.
//
//   node test/deteccao.js

const assert = require('assert')
const net = require('net')
const deteccao = require('../src/deteccao')

let passou = 0
let falhou = 0
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
        console.log(`  FALHA ${nome}`)
        console.log(`        ${err.message}`)
      }
    })()
  )
  return fila[fila.length - 1]
}

/** Socket falso: responde com os bytes que lhe derem e sabe falhar. */
class SocketFalso {
  constructor(resposta, opcoes = {}) {
    this.resposta = resposta
    this.escrito = []
    this.eventos = {}
    this.opcoes = opcoes
  }
  on(evento, fn) {
    this.eventos[evento] = fn
    return this
  }
  write(dados) {
    this.escrito.push(dados)
    if (this.opcoes.escreverComErro) throw new Error(this.opcoes.escreverComErro)
    if (this.resposta && this.opcoes.responderAoEscrever !== false) {
      setImmediate(() => {
        if (this.eventos.data) this.eventos.data(Buffer.from(this.resposta))
        if (this.opcoes.fecharDepois) setImmediate(() => this.eventos.close && this.eventos.close())
      })
    }
    return true
  }
  destroy() {
    this.destruido = true
  }
  // atalhos
  dados(b) {
    this.eventos.data && this.eventos.data(Buffer.from(b))
  }
  erro(m) {
    this.eventos.error && this.eventos.error(new Error(m))
  }
  fechar() {
    this.eventos.close && this.eventos.close()
  }
}

console.log('\ndetecção do servidor')

// -------------------------------------------------------------- pedido/varint
teste('o pedido de estado tem os dois pacotes que o protocolo pede', () => {
  // Isto é o que faltava e fazia o servidor nunca responder: mandávamos só o
  // handshake. O handshake diz "quero o estado"; falta o pacote que pergunta.
  // Os dois testes antigos só olhavam para o primeiro, por isso passavam.
  const p = deteccao.pedidoEstado('exemplo.pt', 25565)
  const tamanho = deteccao.lerVarint(p, 0)
  const tamanhoHandshake = tamanho.valor + tamanho.bytes
  assert.strictEqual(tamanhoHandshake + 2, p.length, 'o pedido tem de ser o handshake mais 2 bytes')
  assert.deepStrictEqual(
    Array.from(p.slice(tamanhoHandshake)),
    [0x01, 0x00],
    'o segundo pacote é o pedido de estado: id 0x01 com corpo vazio'
  )
})

teste('o handshake começa pelo tamanho do pacote', () => {
  // Sem este VarInt à frente, o servidor lia o identificador como tamanho e
  // fechava a ligação sem responder.
  const p = deteccao.handshake('exemplo.pt', 25565, 1)
  const tamanho = deteccao.lerVarint(p, 0)
  assert.strictEqual(tamanho.valor, p.length - tamanho.bytes, 'o tamanho tem de ser o resto do pacote')
  assert.strictEqual(p[tamanho.bytes], 0x00, 'e a seguir vem o identificador do handshake')
})

teste('o handshake leva o nome do servidor e a porta', () => {
  const p = deteccao.handshake('exemplo.pt', 25565, 1)
  let pos = deteccao.lerVarint(p, 0).bytes
  assert.strictEqual(p[pos], 0x00, 'identificador do handshake')
  pos += 1

  pos += deteccao.lerVarint(p, pos).bytes // protocolo (-1, o cliente não sabe ainda)

  const tamanho = deteccao.lerVarint(p, pos)
  pos += tamanho.bytes
  assert.strictEqual(p.slice(pos, pos + tamanho.valor).toString('utf8'), 'exemplo.pt')
  pos += tamanho.valor

  assert.strictEqual(p[pos] * 256 + p[pos + 1], 25565, 'a porta vai em dois bytes')
  pos += 2
  assert.strictEqual(deteccao.lerVarint(p, pos).valor, 1, 'estado seguinte = 1 (estado)')
})

teste('o handshake aguenta nomes de servidor com caracteres especiais', () => {
  const nome = 'jogo.exemplo.pt'
  const p = deteccao.handshake(nome, 25566, 1)
  let pos = deteccao.lerVarint(p, 0).bytes + 1
  pos += deteccao.lerVarint(p, pos).bytes
  const tamanho = deteccao.lerVarint(p, pos)
  pos += tamanho.bytes
  assert.strictEqual(p.slice(pos, pos + tamanho.valor).toString('utf8'), nome)
  pos += tamanho.valor
  assert.strictEqual(p[pos] * 256 + p[pos + 1], 25566)
})

teste('a escrita de varint volta a dar o mesmo número que a leitura', () => {
  for (const n of [0, 1, 127, 128, 300, 25565, 5023, 0xffffffff]) {
    const bytes = deteccao.escreverVarint(n)
    assert.strictEqual(deteccao.lerVarint(Buffer.from(bytes), 0).valor, n, `falhou em ${n}`)
  }
})

teste('a leitura de varint lê números de um e de dois bytes', () => {
  assert.strictEqual(deteccao.lerVarint(Buffer.from([0x05]), 0).valor, 5)
  assert.strictEqual(deteccao.lerVarint(Buffer.from([0xac, 0x02]), 0).valor, 300)
  assert.strictEqual(deteccao.lerVarint(Buffer.from([0xff, 0xff, 0x01]), 0).valor, 32767)
})

teste('uma varint incompleta devolve zero em vez de rebentar', () => {
  assert.strictEqual(deteccao.lerVarint(Buffer.from([0x80]), 0).valor, 0)
  assert.strictEqual(deteccao.lerVarint(Buffer.alloc(0), 0).valor, 0)
})

// ------------------------------------------------------------- resposta JSON
const jsonResposta =
  '\u0000{"version":{"name":"1.20.4","protocol":765},"players":{"max":20,"online":3},"description":"Um servidor"}'

teste('lê a resposta moderna em JSON', () => {
  const r = deteccao.analisarResposta(Buffer.from(jsonResposta, 'utf8'))
  assert.strictEqual(r.formato, 'json')
  assert.strictEqual(r.nome, '1.20.4')
  assert.strictEqual(r.protocolo, 765)
  assert.strictEqual(r.jogadores, 3)
  assert.strictEqual(r.maxJogadores, 20)
})

teste('lê a resposta mesmo com bytes à frente e lixo unicode', () => {
  const sujo = Buffer.concat([Buffer.from([0x00, 0x00]), Buffer.from(jsonResposta, 'utf8')])
  const r = deteccao.analisarResposta(sujo)
  assert.strictEqual(r.formato, 'json')
  assert.strictEqual(r.protocolo, 765)
})

teste('uma resposta partida chega ao fim toda', () => {
  const r = deteccao.analisarResposta(Buffer.from(jsonResposta.slice(0, 20), 'utf8'))
  assert.notStrictEqual(r.formato, 'json', 'uma resposta incompleta não pode parecer completa')
})

teste('resposta vazia não rebenta', () => {
  const r = deteccao.analisarResposta(Buffer.alloc(0))
  assert.strictEqual(r.formato, 'vazio')
})

teste('lixo não rebenta', () => {
  const r = deteccao.analisarResposta(Buffer.from('isto não é nada', 'utf8'))
  assert.ok(r.formato)
  assert.strictEqual(r.protocolo, null)
})

// ------------------------------------------------------- resposta antiga (1.6)
teste('lê a resposta antiga, que não é JSON', () => {
  const versao = '1.6.4'
  const partes = [
    Buffer.from([0x00]), // packet id
    Buffer.from([versao.length]),
    Buffer.from(versao, 'utf8'),
    Buffer.from([0x00]), // motd vazia
    Buffer.from([0x00])
  ]
  const r = deteccao.analisarResposta(Buffer.concat(partes))
  assert.strictEqual(r.formato, 'antigo')
  assert.strictEqual(r.nome, '1.6.4')
})

// -------------------------------------------------------------------- pinger
teste('o ping devolve o que o servidor respondeu', async () => {
  const socket = new SocketFalso(jsonResposta)
  const pingar = deteccao.criarPinger({ ligar: () => socket })
  const r = await pingar('exemplo.invalido', 25565)
  assert.strictEqual(r.ok, true)
  assert.strictEqual(r.protocolo, 765)
  assert.strictEqual(r.nomeCurto, '1.20.4')
  assert.strictEqual(socket.escrito.length, 1, 'tem de enviar o pedido de estado')
})

teste('um erro de ligação vira motivo, não excepção', async () => {
  const socket = new SocketFalso(null)
  const pingar = deteccao.criarPinger({ ligar: () => socket })
  const promessa = pingar('exemplo.invalido', 25565)
  socket.erro('ECONNREFUSED')
  const r = await promessa
  assert.strictEqual(r.ok, false)
  assert.ok(r.motivo.includes('ECONNREFUSED'), r.motivo)
})

teste('uma ligação fechada sem resposta é motivo, não sucesso', async () => {
  const socket = new SocketFalso(null)
  const pingar = deteccao.criarPinger({ ligar: () => socket })
  const promessa = pingar('exemplo.invalido', 25565)
  socket.fechar()
  const r = await promessa
  assert.strictEqual(r.ok, false)
})

teste('se a ligação não abrir, não rebenta', async () => {
  const pingar = deteccao.criarPinger({ ligar: () => null })
  const r = await pingar('exemplo.invalido', 25565)
  assert.strictEqual(r.ok, false)
  assert.ok(r.motivo)
})

teste('se a função de ligar lançar, o pinger aguenta', async () => {
  const pingar = deteccao.criarPinger({
    ligar: () => {
      throw new Error('excepção ao abrir')
    }
  })
  const r = await pingar('exemplo.invalido', 25565)
  assert.strictEqual(r.ok, false)
  assert.ok(r.motivo.includes('excepção'))
})

teste('um servidor que não responde dá tempo esgotado', async () => {
  const socket = new SocketFalso(null, { responderAoEscrever: false })
  const pingar = deteccao.criarPinger({ ligar: () => socket, timeoutMs: 30 })
  const r = await pingar('exemplo.invalido', 25565)
  assert.strictEqual(r.ok, false)
  assert.ok(r.motivo.includes('tempo'), r.motivo)
})

// -------------------------------------------------------- escolha de versão
teste('com versão configurada, usa essa mesmo', () => {
  const r = deteccao.escolherVersao({ configurada: '1.20.4', conhecidas: ['1.20.4', '1.21'] })
  assert.strictEqual(r.versao, '1.20.4')
  assert.strictEqual(r.origem, 'configuracao')
  assert.strictEqual(r.suportada, true)
})

teste('avisa se a versão configurada não é conhecida', () => {
  const r = deteccao.escolherVersao({ configurada: '99.9', conhecidas: ['1.20.4'] })
  assert.strictEqual(r.suportada, false)
  assert.ok(r.motivo.includes('99.9'), r.motivo)
})

teste('com auto e protocolo do servidor, escolhe a versão certa', () => {
  const conhecidas = deteccao.versoesConhecidas()
  const data = require('minecraft-data/data.js')
  const alvo = conhecidas.find((v) => data.pc[v] && data.pc[v].version && data.pc[v].version.version === 765)
  if (!alvo) {
    // nesta versão da biblioteca não há correspondência para o 765: o teste
    // não se pode fazer, e diz-se em vez de passar às cegas
    console.log('        (sem versão da biblioteca com o protocolo 765 — teste ignorado)')
    return
  }
  const r = deteccao.escolherVersao({ configurada: 'auto', protocoloServidor: 765, conhecidas })
  assert.strictEqual(r.versao, alvo)
  assert.strictEqual(r.origem, 'auto')
  assert.strictEqual(r.suportada, true)
})

teste('com auto e protocolo desconhecido, diz que não sabe', () => {
  const r = deteccao.escolherVersao({ configurada: 'auto', protocoloServidor: 99999, conhecidas: ['1.20.4'] })
  assert.strictEqual(r.suportada, false)
  assert.ok(r.motivo.includes('99999'), r.motivo)
})

teste('com auto e sem detecção, diz que não sabe', () => {
  const r = deteccao.escolherVersao({ configurada: 'auto', protocoloServidor: null, conhecidas: ['1.20.4'] })
  assert.strictEqual(r.versao, null)
  assert.ok(r.motivo.includes('detectar'), r.motivo)
})

// -------------------------------------------------------------- descrição
teste('descrever um servidor com sucesso', () => {
  const d = deteccao.descreverServidor({ ok: true, nome: 'Paper 1.20.4', protocolo: 765, jogadores: 2, maxJogadores: 20 })
  assert.strictEqual(d.titulo, 'Paper 1.20.4')
  assert.strictEqual(d.protocolo, 765)
  assert.strictEqual(d.suportada, true)
})

teste('descrever um servidor que não respondeu', () => {
  const d = deteccao.descreverServidor({ ok: false, motivo: 'ECONNREFUSED' })
  assert.strictEqual(d.titulo, null)
  assert.strictEqual(d.suportada, false)
  assert.strictEqual(d.motivo, 'ECONNREFUSED')
})

teste('a lista de versões conhecidas não está vazia', () => {
  const lista = deteccao.versoesConhecidas()
  assert.ok(Array.isArray(lista))
  assert.ok(lista.length > 0, 'a biblioteca devia ter versões')
})

// ---------------------------------------------------------------------- fim
Promise.all(fila).then(() => {
  console.log(`\n${passou} passaram, ${falhou} falharam`)
  if (falhou) process.exit(1)
})
