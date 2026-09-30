# Node antigo e o nosso Mineflayer

> Como o bot corre em Windows 7 (32 e 64 bits) mesmo usando um Mineflayer
> recente. Data: 2026-09-30.

## O problema

O Mineflayer oficial **4.39.0** é de hoje e funciona até ao Minecraft `26.1`. Mas:

| | Exigência do 4.39.0 |
|---|---|
| `engines.node` | `>=22` |
| Guarda no `index.js` | sai imediatamente se o Node for anterior a 18 |
| `minecraft-data` | `^3.114.0` |

E o Node **não corre no Windows 7** a partir da série 16. A última versão que
corre nativamente no Windows 7, de 32 e de 64 bits, é o **Node 14.21.3**.

Ou seja: o Mineflayer oficial e o Windows 7 não cabem juntos.

## A solução: o nosso Mineflayer

O código do 4.39.0 foi copiado para `vendor/mineflayer/` e o `package.json` passou
a apontar para essa cópia:

```json
"mineflayer": "file:vendor/mineflayer"
```

Passámos a controlar o código. Duas dependências foram copiadas e corrigidas da
mesma forma, em `vendor/patches/`:

```json
"prismarine-block": "file:vendor/patches/prismarine-block",
"minecraft-protocol": "file:vendor/patches/minecraft-protocol"
```

> `overrides` do npm **não** serve para isto: com `file:` dentro de `overrides` o
> npm chega a remover o pacote. Dependências `file:` declaradas directamente
> funcionam, porque o npm instala-as na raiz e o Mineflayer resolve-as a partir
> de lá.

## As correcções

Todas em `docs/PATCHES-NODE-LEGADO.json`, com a razão de cada uma.

| Ficheiro | O que era | Porquê |
|---|---|---|
| `vendor/mineflayer/lib/plugins/entities.js` | `x ??= y` | `??=` só existe no Node 15 |
| `vendor/mineflayer/lib/plugins/sound.js` | `x ??= y` | idem |
| `vendor/mineflayer/lib/plugins/scoreboard.js` | `Object.hasOwn(a, b)` | só existe no Node 16.9 |
| `vendor/mineflayer/index.js` | saía se o Node fosse < 18 | passou a aceitar 14, avisando; `AFK_NODE_MIN` ajusta |
| `vendor/mineflayer/package.json` | `engines: >=22` | passou a `>=14.21.3` |
| `vendor/patches/prismarine-block/index.js` | `x ??= y` | `??=` só existe no Node 15 |
| `vendor/patches/minecraft-protocol/src/server.js` | `x \|\|= y` (2 sítios) | `\|\|=` só existe no Node 15 |

`performance.now()` que o Mineflayer usa vem de `perf_hooks`, que existe desde o
Node 8.5 — não precisou de nada.

## O que está verificado, e o que não

**Verificado a correr** (2026-09-30):

- O Mineflayer vendorizado **carrega** no Node 14.21.3 (x64) — 244 ms.
- Também carrega no Node 22, sem diferenças.
- `latestSupportedVersion` = `26.1`; 28 versões testadas, de 1.8.8 a 26.1.
- O **patch do 26.3 aplica-se** nos dois Node, porque a `minecraft-data` 3.117 já
  conhece o 26.1.
- A criação do bot chega ao socket (falha com `ECONNREFUSED`, como esperado,
  contra uma porta fechada).
- A cadeia de autenticação (`prismarine-auth`, `@azure/msal-node`,
  `yggdrasil`) **carrega** no Node 14.
- Todo o código em `vendor/` e nos pacotes corrigidos **compila** com o Node
  14.21.3.

**Não verificado:**

- Que o bot **entre num servidor** com o Node 14. Carregar é uma coisa; falar o
  protocolo é outra, e pode apanhar APIs que só existem em Node recente dentro
  de funções que ainda não foram chamadas.
- A **autenticação Microsoft** a correr no Node 14. Os pacotes carregam, mas o
  `engines` pede 16 e ninguém testou o fluxo.
- O Node 14 de **32 bits**. Só testámos x64. Não há nada no código que pressuponha
  x64, mas também não foi provado.

## A política que resulted

| | Node 14.21.3 (Windows 7) | Node 18 ou 22 |
|---|---|---|
| Servidores vanilla 1.8 – 26.1 | deve funcionar, por testar | funciona |
| `auth: offline` | deve funcionar, por testar | funciona |
| `auth: mojang` | deve funcionar, por testar | funciona |
| `auth: microsoft` | **não recomendado** | funciona |

O `verificar-node.mjs` mantém isto honesto: dá **erro** se algum pacote de
execução pedir mais do que o mínimo, e **aviso** para os dois pacotes que só a
autenticação Microsoft usa.

## Actualizar para uma versão nova do Mineflayer

1. Copia o código novo para uma pasta à parte e compara com `vendor/mineflayer`.
2. Aplica de novo as correcções de `docs/PATCHES-NODE-LEGADO.json` (ou as
   actualiza, se o upstream já tiver resolvido).
3. `node .opencode/scripts/verificar-node.mjs` tem de dar 0 erros.
4. `npm test` tem de passar tudo.
5. Actualiza este documento com o que mudou.
