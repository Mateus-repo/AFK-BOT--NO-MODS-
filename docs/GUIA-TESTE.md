# Como testar o bot a sério

> Não precisas de instalar nada à mão. Este guia usa o servidor Paper que vive
> dentro do projecto, em `servidores/`. Data: 2026-09-30.

## O caminho curto

Noutra janela, arranca o servidor:

```bash
node servidores/arrancar.js 26.3
```

Noutra, corre o teste de ligação:

```bash
node test/servidor-real.js
```

E, se o teste passar, o bot a sério:

```bash
node index.js
```

## O que o `arrancar.js` faz

- Arranca o Paper com 1 GB de memória (muda com `AFK_MEMORIA=2G`).
- Deixa o terminal livre: o Paper lê comandos do teclado, que roubaria a janela.
- Para parar: `Ctrl+C`, ou `node servidores/arrancar.js 26.3 stop`.

## O que precisa de estar instalado

| Precisa de | Porquê |
|---|---|
| **Node** (14.21.3 ou mais recente) | o bot |
| **Java 21 ou mais recente** | o servidor Paper |
| Nada mais | o resto vem no `package.json` |

O Java 8 é o último que corre no Windows 7, mas o Paper actual **não** corre
em Java 8. Ver *Testar no Windows 7* abaixo.

## E se quiser outra versão

```bash
node servidores/baixar-paper.js 1.21.4
node servidores/arrancar.js 1.21.4
node test/servidor-real.js
```

O script pergunta ao PaperMC a versão mais recente de cada build e confirma a
soma SHA256 do jar antes de o dar como bom.

## O `settings.json` para o servidor local

```json
{
  "server": "127.0.0.1",
  "port": 25565,
  "type": "offline",
  "version": "26.3",
  "username": "bot_teste"
}
```

- `"type": "offline"` é o que permite ligar sem conta premium. O servidor tem
  `online-mode=false`.
- `"version": "26.3"` diz ao bot que versão falar. `"auto"` pergunta ao servidor
  primeiro — bom para experimentar, mas o patch do 26.3 tem de estar aplicado, e
  o `/diagnostico` diz-te o que ele escolheu.
- Uma conta real é `"type": "mojang"` ou `"type": "microsoft"`. **Nunca** metas
  a password no `settings.json`; o bot pede-a no terminal.

## O teste de ligação a sério

`test/servidor-real.js` é diferente dos outros testes: precisa de um servidor a
correr, por isso fica fora da verificação automática (traz a marca
`REQUER_SERVIDOR`) e corre-se à mão.

Só aceita servidores locais. Não é movies: corre sem pedir nada a ninguém e
usa autenticação offline, mas mesmo assim não deve poder ser apontado a um
servidor que não seja teu.

O que prova:

- que o pedido de estado do nosso código percebe um servidor real;
- que o Mineflayer entra na sessão e no mundo;
- que o movimento anti-AFK mexe mesmo no mundo;
- que a versão `26.3` é aceite depois do patch.

O que **não** prova: contas premium, anticheat, nem servidores com mods.

## Se correr mal

| O que aparece | O que significa |
|---|---|
| `não há nada a escutar` | o servidor não arrancou. Vê o `logs/latest.log` dentro de `servidores/paper-*/` |
| `No data available for version` | a versão não está instalada. `node servidores/baixar-paper.js` para a versão que o teste pede |
| `Outdated client!` | a versão do bot é mais antiga que a do servidor |
| `excepção solta: [Prismarine-chunk]` | uma biblioteca não conhece a versão. É o ponto em que o 26.3 está hoje |

## Testar contra um servidor 26.3

A `minecraft-data` **não conhece o 26.3** (a mais recente é a 3.117.0, e a mais
recente que inclui é a 26.1). O remapeamento de identificadores de pacote do
`src/versoes.js` chega a pôr o bot no mundo, mas o servidor expulsa-o logo a
seguir: `Invalid move player packet received`. Não tem a ver com mods nem com
Fabric — acontece igual num servidor vanilla.

A saída é o **ViaVersion**, que traduz o protocolo no servidor. Com ele, o bot
fala uma versão que já conhece e nunca precisa de remapear nada:

```bash
AFK_TESTE_HOST=exemplo.aternos.me \
AFK_TESTE_PORTA=64083 \
AFK_TESTE_VERSAO=1.21 \
AFK_TESTE_PERMITIR_REMOTO=1 \
node test/servidor-real.js
```

- `AFK_TESTE_VERSAO` é **a versão que nós falamos**, não a do servidor. O
  pedido de estado mostra a versão real do servidor; se for mais recente, é
  ViaVersion a traduzir.
- `AFK_TESTE_PERMITIR_REMOTO=1` é obrigatório para qualquer coisa que não seja
  `localhost`. Sem ele o teste recusa-se: apontar isto para um servidor alheio
  não pode ser uma omissão.
- Num servidor **Fabric** o Via tem de ser o **ViaFabric** (o ViaFabricPlus é
  só para clientes — o `fabric.mod.json` dele diz `"environment": "client"`).
  Com o ViaFabric só, aceitam-se clientes *mais recentes* que a versão do
  servidor, que não existem, por isso convém juntar o **ViaBackwards** (1.9+)
  e o **ViaRewind** (1.7/1.8).
- Num servidor **Paper/Bukkit/Spigot** usa-se o **ViaVersion** normal, em vez do
  ViaFabric.

O `online-mode` importa: com `online-mode=true` o servidor exige uma conta
verificada e rejeita o bot com `unverified_username`. Para testes, um servidor
em modo offline chega.

### Servidores grátis (Aternos e afins)

Estes servidores **cortam quando ficam vazios** e reiniciam com um mundo novo,
por isso:

- o teste tem de arrancar logo a seguir ao servidor ficar de pé;
- o mundo pode mudar a meio da execução. O teste trata isso como o que é — um
  teleporte do servidor — e recomeça a medir a partir daí, em vez de dar o
  movimento por teletransporte do bot.

## Testar no Windows 7

O Windows 7 é o problema conhecido do projecto: lá o Java 8 é o último que
c corre, e o Paper actual precisa de Java 21. **Não cabem os dois.**

Duas saídas, por decidir com o dono do projecto:

1. Testar o bot contra o Paper noutra máquina da rede, e em Windows 7 usar um
   servidor mais antigo (1.12.2, que corre em Java 8) — a biblioteca conhece
   essa versão, por isso o bot entra sem patches.
2. Aceitar que o Windows 7 fica para o bot e o Paper fica para o resto.

A opção 1 é a que dá menos trabalho e mais prova. Até lá, o `docs/NODE-LEGADO.md`
diz o que está verificado no Node 14.21.3 e o que não.
