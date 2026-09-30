# Guia de teste a sério

> Os testes automáticos (123 verificações) correm com o Mineflayer **simulado**.
> Ninguém, até agora, ligou este bot a um servidor de verdade. Este documento é o
> procedimento completo.
>
> Actualizado: 2026-09-30

---

## 0. Antes de tudo: dois bloqueios conhecidos

### Bloqueio 1 — a biblioteca instalada é de 2019

O `package-lock.json` restaurado da v2.1 fixa versões antigas:

```
mineflayer 4.0.0  ·  minecraft-data 3.4.0  ·  minecraft-protocol 1.35.0
```

| | Suportado |
|---|---|
| `minecraft-data` conhece | 50 versões, **até 1.18.2** |
| `mineflayer` diz testar | **até 1.18.1** |

Consequências:

- Só dá para testar servidores de **1.8 a 1.18**.
- O **patch do 26.3 está inactivo**: ele copia a versão `26.1` da biblioteca, e
  essa versão não existe no `minecraft-data` 3.4.0. A função devolve «a
  biblioteca não conhece a versão base» e não faz nada.

O código-fonte do Mineflayer 4.39.0 está em `resources/mineflayer-source_code`.
Ver `ROADMAP.md` e `IDEIAS.md` para o plano de actualizar ou vendorizar.

### Bloqueio 2 — o bot não entra em servidores offline

O `settings.json` só aceita `"type": "mojang"` ou `"microsoft"`. Um servidor com
`online-mode=false` — quase todos os de teste — **não deixa o bot entrar sem uma
conta premium verdadeira**. Falta o tipo `offline` (o bot do outro autor usava
`auth: offline`).

---

## 1. Que ficheiros abrir

| Ficheiro | Para que serve | Quando |
|---|---|---|
| `settings.json` | configuração viva; **o único que vais editar** | antes de cada teste |
| `default.json` | modelo com todas as opções e valores por omissão | para saber o que existe |
| `docs/GUIA-TESTE.md` | este documento | durante o teste |
| `PROGRESSO.md` → *Problemas conhecidos* | o que **já** está mal, para não o descobrir outra vez | antes de testar |
| `README.pt.md` | comandos e respective efeito | quando te perderes |
| `logs/latest.log` | tudo o que o bot escreveu, com timestamp | quando algo correr mal |
| `docs/modded.md` | estado da compatibilidade com mods | para saber o que **não** está feito |

`settings.json` e `logs/` estão no `.gitignore` — nunca são versionados.

## 2. Que servidor criar

O caminho mais fiável é um **servidor na tua máquina**: sem latência, podes
reiniciá-lo à vontade e podes matá-lo para testar a reconexão.

| Opção | Versão do MC | Java | Quando usar |
|---|---|---|---|
| **Paper local** | 1.12.2 | Java 8 | primeira prova, a mais estável |
| **Paper local** | 1.16.5 | Java 17 | testar o `auto` a escolher versão |
| **Paper local** | 1.18.1 | Java 17 | o topo do que a biblioteca actual suporta |
| Aternos ou similar | 1.12–1.16 | o que a plataforma der | se não quiseres instalar Java |
| **Mods (Forge/Fabric)** | qualquer | Java 21 | **não testar ainda** |

### Como montar o servidor local (Paper)

1. Instala o Java certo (8 para 1.12, 17 para 1.16/1.18) e define `JAVA_HOME`.
2. Cria uma pasta vazia, por exemplo `C:\servidor-mc`.
3. Descarrega o `paper.jar` da versão escolhida para essa pasta.
4. Cria `eula.txt` com uma linha: `eula=true`
5. Cria `server.properties` com duas linhas que importam:
   ```
   online-mode=false
   level-type=flat
   ```
   `online-mode=false` é obrigatório sem conta premium. `level-type=flat` dá um
   chão plano, o cenário ideal para ver o movimento anti-AFK a circular.
6. Corre `java -Xmx1G -jar paper.jar nogui`
7. Na primeira vez pergunta o nível; aceita. Depois arranca directo.

Para testar versões antigas mais facilmente, mete o
[ViaVersion](https://viaversion.com) no Paper: um servidor só fala 1.18 e tu
testas 1.8, 1.12 e 1.16 contra o mesmo.

## 3. A configuração

`settings.json` na raiz do projecto:

```json
{
  "server": { "ip": "127.0.0.1", "port": 25565, "version": "1.12.2" },
  "bot-account": { "type": "mojang", "username": "bot_teste", "password": "" },
  "language": "pt-pt"
}
```

Arranca com:

```bash
node index.js
```

## 4. O que deves ver, mensagem a mensagem

Saídas exactas, como estão em `lang/pt-pt.txt`:

| Quando | O que deves ver | Se não vires |
|---|---|---|
| arranque | `📍 Bot entrou no mundo.` | o comando falhou antes |
| arranque | `🚶 Movimento anti-AFK ligado` | o `movement.enabled` está a `false` |
| `/diagnostico` | `  node: v22.17.1` | o diagnóstico não correu |
| `/diagnostico` | `  Sessões: 1` | há mais bots do que esperavas |
| `/pos` | coordenadas que **mudam** em segundos | o movimento não anda |
| queda | `🔄 A reconectar em 1s (motivo: ...)` | a reconexão não arrancou |
| volta a ligar | `📍 Bot entrou no mundo.` outra vez | o contador não reiniciou |
| 10 tentativas | `❌ Desisti de reconectar...` | é o limite, e é o esperado |

## 5. Os testes, por ordem

**T1 — arranque limpo.** Apaga o `settings.json` e arranca. Deves ver
`⚠️ settings.json não encontrado; a usar o default.json.` e depois
`📡 Por favor, insira o endereço do servidor`. Escreve `127.0.0.1:25565` e o bot
deve entrar. Se usares `/default`, ele deixa um `settings.json.bak`.

**T2 — diagnóstico.** Quando aparecer o `>`, escreve `/diagnostico` e guarda a
saída. **É a primeira coisa que me mandas.**

**T3 — movimento.** Deixa o bot 2 minutos e escreve `/pos` duas vezes com 30
segundos de intervalo. As coordenadas têm de mudar. Se ficar parado, o `radius`
(1.2) ou os ângulos estão errados para o teu mundo — é o ponto mais provável de
falhar, porque os valores vieram do código do outro autor e nunca foram testados.

**T4 — queda e reconexão.** Na consola do servidor, escreve `stop`. O bot deve
dizer `🔌 Conexão encerrada.` e `🔄 A reconectar em 1s`. Arranca o servidor outra
vez: o bot deve entrar sozinho e o contador reiniciar.

**T5 — versão automática.** Muda para `"version": "auto"` e reinicia.
Com o servidor ligado: `🔎 Versão do servidor detectada: 1.12.2`.
**O teste mais importante é o contrário:** com o servidor parado, o bot tem de
avisar `⚠️ Não consegui detectar a versão do servidor:` e **ligar na mesma** com a
versão mais recente da biblioteca. Se ficar à espera, é bug meu.

**T6 — comandos.** `help`, `server`, `typeinfo`, `pos`, `ping`, `chat olá`,
`bots`, `lang en`, `lang pt-pt`, `version 1.16.5`,
`changeserver 127.0.0.1:25565`, `andar off`, `andar on`, `stop`. Nenhum pode
crashar.

**T7 — multi-bot (opcional).** Acrescenta
`"bots": [{"username": "botxxxx"}, {"username": "botxxxx"}]` e confirma que
`/bots` lista dois nomes diferentes. Precisa do `offline` (bloqueio 2).

## 6. O que me mandas

1. A saída de `/diagnostico`, inteira.
2. O `logs/latest.log` desse arranque.
3. A versão do Java e a do Paper no servidor.
4. Uma frase sobre cada resultado: «entrou», «não entrou», «ficou parado»,
   «não voltou».

Com o `logs/latest.log` consigo quase sempre dizer o que aconteceu sem te fazer
mais perguntas.

## 7. O que não testar agora

- **Mods** — o sidecar Via não está implementado.
- **Versões acima de 1.18** — bloqueado pela biblioteca antiga (bloqueio 1).
- **Windows 7** — só depois das fases 2 e 3 fechadas.
