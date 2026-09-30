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
