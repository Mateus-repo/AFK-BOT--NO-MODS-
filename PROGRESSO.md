# PROGRESSO

> Diário técnico do projeto. Memória entre sessões. Quem escreve aqui é a skill `progresso`.

## Estado atual

- **A v2.1 está restaurada na raiz**: `index.js`, `lang/` (3 idiomas), `package.json`, `package-lock.json`, `default.json`, `run.cpp`, `LICENSE`, `.replit`, `replit.nix`, `.github/dependabot.yml`.
- O repositório está limpo: `run.exe`, `nodeMsi/*.msi`, `.idea/`, `logs/`, o `settings.json` antigo e os READMEs HTML/TXT duplicados saíram do índice do git. `old-deprecated-10.1/` só tem ficheiros **não versionados**.
- `verificar.mjs` está com **0 erros e 3 avisos** (versão `2.1` fora de `X.Y.Z`, `node_modules` por instalar, chaves só do launcher em `en-us.txt`).
- Criada a camada de agente: `AGENTS.md`, 13 skills em `.opencode/skills/`, 4 scripts em `.opencode/scripts/`, `IDEIAS.md` e `ROADMAP.md`.
- **Requisitos transversais registados** (2026-09-29): correr em **Windows 7**, funcionar nas **versões mais recentes do Minecraft** e funcionar com **mods de qualquer loader**. Mínimo de Node **14.21.3**, declarado em `package.json` e verificado por `verificar-node.mjs`.
- **Fase 2 praticamente fechada**: configuração validada, gravação sem perder campos, reconexão automática, e a lógica de configuração/idiomas/log/reconexão extraída do `index.js` para `src/`. **35 testes que correm sem servidor** (`npm test`, integrado no `verificar.mjs`).
- **Nada disto foi testado a correr**: `node index.js` liga-se a servidores reais e não foi executado. `npm install` também não foi corrido.
- Decidido: compatibilidade com mods faz-se com **sidecar local Via** (ideia I-001 aprovada), a implementar na Fase 4.

- **Higiene das dependências**: o `express`, que nunca foi usado, saiu do `package.json`. As vulnerabilidades do `npm audit` baixaram de 15 para 11, e as dependências instaladas de 156 para 86 pacotes. As 11 que ficam vêm todas do Mineflayer (via de autenticação) e não se corrigem sem trocar a biblioteca.
- **Fase 3 começada**: `"version": "auto"` deteta o protocolo do servidor com um pedido de estado e escolhe a versão certa; o comando `/diagnostico` mostra tudo. **Por testar contra servidores reais.**
- **Base decidida**: este branch. **Já portei tudo o que havia de aproveitável no outro branch**: patch do Minecraft 26.3 (`src/versoes.js`), movimento anti-AFK (`src/movimento.js`, `/andar`) e multi-bot (`src/sessoes.js`, `/bots`). **Por testar contra um servidor real** — nem o remapeamento de pacotes nem o movimento têm teste de integração.
- **O `settings.json` do branch `Tests` está versionado** com o endereço de um servidor a sério. Não é copiado para aqui, e o branch não é nosso.

- **Mineflayer vendorizado e corrigido para Node antigo** (2026-09-30): `vendor/mineflayer` (4.39.0) e cópias corrigidas de `prismarine-block` e `minecraft-protocol`. Carrega no Node 14.21.3 e no Node 22, e o patch do 26.3 aplica-se nos dois. Ver `docs/NODE-LEGADO.md`.
- **Conta `offline` suportada** — já não é preciso uma conta premium para testar num servidor com `online-mode=false`.

## Em curso

Fase 2 quase fechada. Falta mover `createBot()` e os comandos para módulos próprios, e um teste a correr contra um servidor a sério.

## Próximos passos

- [ ] `npm install` e um teste manual do bot num servidor de testes, com o procedimento registado aqui — `progresso`
- [ ] (Fase 2) Separar o `index.js` monolítico em módulos (configuração, idiomas, log, ligação, comandos)
- [ ] (Fase 2) Testar o **multi-bot** num servidor a sério (nomes repetidos, kicked, limites de jogadores)
- [ ] (Fase 2) Testar o **movimento anti-AFK** num servidor a sério: os ângulos e o raio são um palpite até haver jogo
- [ ] Testar o patch do 26.3 contra um servidor a sério — **é o requisito R2 e ainda ninguém o confirmou**
- [ ] (Fase 2) **Testar contra um servidor a sério** — os testes usam Mineflayer simulado; falta alguém ver o bot a ligar-se de facto
- [ ] (Fase 2) Mover `createBot()` e os comandos para `src/ligacao.js` e `src/comandos.js`
- [ ] (Fase 2) Rever `run.cpp`: o `/default` agora deixa um `settings.json.bak`
- [ ] (Fase 2) `replit.nix`: trocar `nodejs-14_x` por uma versão suportada
- [ ] (Fase 3) Testar a detecção contra servidores reais de versões diferentes (1.8, 1.12, 1.16, 1.20, 1.21, 26.3)
- [ ] (Fase 3) Traduzir os erros de protocolo mais comuns e dizer quando o servidor usa Via
- [ ] (Fase 4) Implementar o sidecar local Via, seguindo o desenho em `docs/modded.md`
- [ ] Testar contra um servidor a sério, seguindo `docs/GUIA-TESTE.md` (o `GUIA` substitui o `TESTAR`, que ficou mais curto)
- [ ] Provar o Node 14.21.3 num Windows 7 a sério, de 32 e de 64 bits
- [ ] Launcher que instale o Node certo conforme o Windows (ideia I-007)

## Problemas conhecidos

- **Nada foi testado a correr.** O `index.js` restaurado é o mesmo da v2.1 e não foi executado uma única vez nesta sessão. Antes de confiar em qualquer coisa, `npm install` e um teste num servidor de testes.
- **Chaves do launcher alinhadas** — `error_no_version`, `error_node_fail` e as `msg_*` passaram para os três idiomas; os `lang/*.txt` têm agora as mesmas 69 chaves.
- **O arranque foi testado, a ligação não** — `test/arranque.js` arranca o `index.js` a sério com o Mineflayer simulado (12 verificações), e `test/testes.js` cobre os módulos (23). Nenhum dos dois fala com um servidor, e o Mineflayer real nunca foi corrido por esta sessão.
- **A reconexão pode ser agressiva** — 10 tentativas com recuo até 60 s dão quase 5 minutos a tentar. Num servidor que recusa a conta, é isso que o utilizador vai ver.
- **Windows 7 x mods x versões novas não cabem juntos** — o Java 8 é o último que corre em Windows 7, e o Minecraft 1.20.5+ e o Via actual precisam de Java 21. Num PC com Windows 7, o sidecar só deve servir de imediatamente versões mais antigas. **Por confirmar.**
- **O launcher não está preparado para o Windows 7** — o `run.cpp` instala sempre o Node 22.16.0 de um MSI que não existe no repositório, e o Node 22 não corre em Windows 7. Ideia I-007.
- **11 vulnerabilidades do `npm audit`, todas transitivas do Mineflayer** — `prismarine-auth` traz `@azure/msal-node`, `@xboxreplay/xboxlive-auth`, `axios` e `jws`; mais `uuid`, `yggdrasil`, `ajv` e `follow-redirects`. Só entram em acção na autenticação Microsoft. `npm audit fix --force` trocaria a biblioteca: **não foi corrido**.
- **`minecraft-data` passou a ser dependência declarada** — nós usámos directamente em `src/versoes.js` e `src/deteccao.js`, e estava a funcionar só porque o Mineflayer a trazia. A verificação nova apanha este tipo de erro.
- **`express` é dependência declarada e não é usado** (ideia I-003).
- **`nodeMsi/` não existe** — o `run.cpp` instala o Node a partir de um MSI que não está no repositório (ideia I-006).
- **`replit.nix` fixa Node 14** — desatualizado para a dependência actual.
- **Versão `2.1` em `package.json`** não segue `X.Y.Z`; corrigida pela skill `lancar-versao` no lançamento.
- **Nada foi verificado contra um servidor modded real** — o desenho do sidecar em `docs/modded.md` é teoria até haver teste.

## Decisões

- 2026-09-29 — Uma skill dona cada ficheiro, com matriz de posse no `AGENTS.md` (skills que se sobrepõem dão trabalho inconsistente).
- 2026-09-29 — Scripts de verificação determinísticos em `.opencode/scripts/`, sem dependências, orquestrados por `verificar.mjs`.
- 2026-09-29 — `AGENTS.md` tem de mencionar todas as skills existentes; o `verificar.mjs` falha caso contrário, para não haver skill órfã.
- 2026-09-29 — A compatibilidade com mods é uma fase própria do roadmap (Fase 4), não uma melhoria pequena.
- 2026-09-29 — Nada se mexe na estrutura sem plano aprovado; o `old-deprecated-10.1/` era a única cópia do código.
- 2026-09-29 — Para servidores com mods: **sidecar local Via** (I-001), e não ViaVersion no servidor. A documentação de ViaVersion no servidor fica como alternativa dentro da mesma fase.
- 2026-09-29 — `.replit` e `replit.nix` ficam na raiz (o Replit executa `node index.js`, que passou a estar lá), mesmo com o Node 14 a precisar de actualização.
- 2026-09-29 — O projecto tem de correr em **Windows 7**, funcionar nas **versões mais recentes do Minecraft** e funcionar com **mods de qualquer loader**. Daí o mínimo de Node 14.21.3 e a verificação automática de compatibilidade.

## Diário de sessões


### 2026-09-30 (décima primeira sessão)

**Feito — o nosso Mineflayer, a correr em Node antigo**
- O dono do projecto deixou em `resources/` o código do Mineflayer 4.39.0. Copiado para `vendor/mineflayer` e o `package.json` aponta para lá.
- Actualização de todo o protocolo: `minecraft-data` 3.4.0 → **3.117.0** (de 50 para 72 versões, até ao 26.1), `minecraft-protocol` 1.35 → **1.68**, e o Mineflayer 4.0.0 → **4.39.0**. **Isto é o que resolve o requisito R2.**
- Correções para o Node 14.21.3 (o último que corre nativamente no Windows 7, de 32 e 64 bits): três pontos de sintaxe/API no Mineflayer (`??=` duas vezes, `Object.hasOwn`), a porta de versão do `index.js`, e as mesmas correcções em `prismarine-block` e `minecraft-protocol`. Registo em `docs/PATCHES-NODE-LEGADO.json`.
- **Verificado a correr:** o Mineflayer carrega no Node 14.21.3 (244 ms) e no Node 22, com `latestSupportedVersion` = 26.1, e o patch do 26.3 **aplica-se nos dois**. A criação do bot chega ao socket.
- **Descoberta do caminho:** `overrides` do npm com `file:` chega a remover o pacote; a solução é declarar as cópias corrigidas como dependências `file:` directas.
- As devDependencies das cópias vendorizadas foram removidas, senão o npm trazia mocha e jest para o projecto e a verificação de Node min dava falsos positivos.

**Feito — conta `offline`**
- `"type": "offline"` em `settings.json` deixa o bot entrar em servidores com `online-mode=false`, sem conta premium. É o que tornava o teste real possível.
- `/typeinfo` explica os três tipos; as chaves novas estão nos três idiomas.

**Honestidade sobre o que isto não prova**
- Carregar não é entrar. Que o protocolo funcione ponta a ponta com o Node 14 numa máquina com o Node 14 **não foi provado**.
- A autenticação Microsoft carrega no Node 14, mas o fluxo não foi testado. Por isso o `verificar-node.mjs` dá aviso, não erro.
- O Node 14 de **32 bits** não foi testado (aqui só há x64).

### 2026-09-29 (décima sessão)

**Feito — higiene das dependências**
- `npm audit` avaliado pela primeira vez: 15 vulnerabilidades (8 moderadas, 7 altas). A maioria vinha de uma dependência directa que **nunca foi usada**: o `express`. Saiu do `package.json`.
- Resultado: **15 → 11 vulnerabilidades**, **156 → 86 pacotes** instalados. As 11 restantes vêm todas do Mineflayer (pela cadeia de autenticação Microsoft) e não se corrigem sem trocar a biblioteca. `npm audit fix --force` **não foi corrido**, porque trocaria a biblioteca por outra maior.
- **Bug latente encontrado pelo caminho:** o nosso código usa `minecraft-data` directamente (`src/versoes.js`, `src/deteccao.js`) e só funcionava porque o Mineflayer a trazia. Passou a ser dependência declarada.
- Nova verificação no `verificar.mjs`: **tudo o que o nosso código importa tem de estar no `package.json`**. Testei-a a propósito, tirando o `minecraft-data`, e ela apanha.
- `docs/TESTAR.md`: o procedimento para testar contra um servidor a sério, com os cuidados (conta de testes, servidor de testes) e o que cada resultado significa.

**Estado: 123 verificações, 0 erros, 86 pacotes.**

**Nota**
- O `README` já não manda instalar pacotes à mão: basta `npm install`, que é o que o `package.json` descreve.

### 2026-09-29 (nona sessão)

**Feito — detecção da versão do servidor (Fase 3, primeira parte)**
- `src/deteccao.js`: pedido de estado num socket normal (sem dependências), leitura de varints, resposta moderna em JSON e resposta antiga da 1.6, e a decisão de qual versão usar. Tudo o que toca na rede é injectado, por isso os 23 testes não precisam de servidor.
- `"version": "auto"` na configuração: pergunta o protocolo, escolhe a versão da biblioteca que bate certo, e se ninguém responder cai na mais recente **em vez de deixar o utilizador sem bot**.
- Comando `/diagnostico`: Node, compatibilidade aplicada, servidor, versão configurada e a usar, título, protocolo, jogadores, movimento, sessões e reconexão. É a primeira coisa a colar quando se pede ajuda.
- Chaves novas nos três idiomas, secção nova nos dois READMEs, e o comando entra no teste de arranque.

**Um teste que se declara ignorado**
- A correspondência protocolo→versão para o 765 (1.20.4) não existe nesta versão da biblioteca instalada, por isso esse teste imprime que foi ignorado em vez de passar às cegas.

**Estado: 121 verificações, 0 erros.**

**Por fazer**
- Testar a detecção contra servidores reais — até lá, o `auto` é umatez correcta e não verificada.

### 2026-09-29 (oitava sessão)

**Feito — multi-bot, a última peça do outro branch**
- `src/sessoes.js`: geração de nomes (`botxxxx` → `bot1234`, para o servidor nunca ver o mesmo nome duas vezes), leitura da lista de bots da configuração (herdam tipo de conta e senha) e gerenciador onde cada sessão tem estado, movimento e reconexão próprios.
- `test/sessoes.js`: **16 testes** (nomes, herança, lista inválida, sessão que falha sem levar as outras, estados independentes).
- `test/multibot.js`: **8 verificações de ponta a ponta** — arranca o bot com dois bots na configuração e confirma que ambos ligam, com nomes diferentes, e que o `/bots` os lista.
- Comando `/bots`, com chaves nos três idiomas e nos dois READMEs.
- `index.js`: `createBot()` agora liga uma sessão por bot; as mudanças deliberadas (`/changeserver`, `/changename`, `/version`) e o `/stop` passam pelo gerenciador. **Os comandos antigos (`/pos`, `/ping`, `/chat`) continuam a falar com a sessão principal, sem mudar de comportamento.**

**Estado: 98 verificações, 0 erros.**

**Nota**
- O `/andar` continua a actuar só na sessão principal. Com vários bots, o movimento de cada sessão é controlado pela sua própria configuração; falta um comando que faça isso por sessão.

**O outro branch está todo portado.** Falta testar tudo num servidor a sério.

### 2026-09-29 (sétima sessão)

**Feito — movimento anti-AFK portado do outro branch**
- `src/movimento.js`: andar em círculo com saltos, detecção de bloqueio (inverte o sentido, recentra ao fim de duas vezes), adaptação a mudanças de patamar e ciclo de pausa. A geometria e a decisão de obstáculo estão em funções puras.
- `test/movimento.js`: **18 testes**, incluindo limites de configuração (raio entre 0.5 e 8, durações limitadas) e o ciclo de fases com relógio falso.
- **Bug apanhado pelos testes:** `diferencaAngular` somava a volta completa em vez de a subtrair — o bot virava sempre para o lado errado ao passar dos 180 graus. Só apareceu porque o teste mede a diferença angular mais curta.
- Configuração: secção `movement` no `default.json`, validada em `src/config.js` (liga por omissão: 180 s a andar, 30 s de pausa, raio 1.2).
- Comando `/andar [on|off]` para ligar e desligar sem mexer no ficheiro, com as chaves nos três idiomas e documentação nos dois READMEs.
- Ligado ao ciclo de vida: arranca no `spawn`, pára no `end` e no `/stop`.
- O teste de arranque passou a exercitar o comando de ponta a ponta (o bot simulado recebe `controlo:forward=true`).

**Estado da verificação: 74 verificações, 0 erros.**

**Por fazer**
- Multi-bot, a última peça do outro branch.
- Testar contra um servidor a sério: movimento e remapeamento do 26.3.

### 2026-09-29 (sexta sessão)

**Decidido pelo dono do projecto: a base é este branch.** O outro fica como fonte de peças.

**Feito — porta do patch do Minecraft 26.3**
- `src/versoes.js`: remapeamento dos identificadores de pacote do protocolo, lista de pacotes do estado de configuração, `teleport_confirm` com coordenadas, e registo da versão na biblioteca e no Mineflayer.
- Reescrito a partir do código do outro branch, com a parte de remapeamento isolada em funções puras: **17 testes** (`test/versoes.js`) que não precisam da biblioteca.
- O `index.js` chama-o **antes** de `require('mineflayer')` — se não, o Mineflayer já carregou a lista de versões sem a nova. A mensagem de resultado aparece no arranque, traduzida.
- `verificar.mjs` passou a correr todos os ficheiros de `test/`: **74 verificações**.

**Nota honesta**
- O remapeamento vem do outro branch e **não foi testado contra um servidor real**. Está certo na aritmética (testado) mas o protocolo pode ter mudado. Só um teste com o 26.3 confirma.

**Por fazer**
- Multi-bot e movimento anti-AFK, ambos do outro branch.
- Testar o 26.3 e o bot contra um servidor a sério.

### 2026-09-29 (quinta sessão)

**Descoberto — o branch `Tests`**
- O dono do projecto avisou que o bot do amigo dele está noutro branch e que funciona em vanilla. Fui ver: `origin/Tests`, com commits de hoje.
- É outra implementação, não uma variante: `package.json` v3.0.0 só com `mineflayer ^4.39.0`, `index.js` próprio e um `start.bat` que usa **Node 18.20.8 x86 com `NODE_SKIP_PLATFORM_CHECK=1`** e `--max-old-space-size=512`.
- O que o `Tests` tem e nós não: **vários bots** (array `bots`), **movimento anti-AFK** (círculos com saltos, detecção de bloqueio, pausas), **tempo limite de ligação** de 35 s, `auth: offline`, renascer automático ao morrer, `!ping` no chat, e um **patch escrito à mão do `minecraft-data` para o Minecraft 26.3** (remapeia identificadores de pacote e o `teleport_confirm`, e força o carregador de chunks da 1.18).
- O que nós temos e o `Tests` não: configuração validada, três idiomas, 16 comandos, `/help`, 35 testes, verificação automática, documentação e skills.

**Facto verificado**
- O `index.js` do `Tests` **arranca**: corrido com o nosso harness (Mineflayer simulado), carrega a configuração, cria o bot com `26.3` e `auth offline`, gera o nome a partir de `botxxxx` (`bot3839`), responde a `/server` e `/pos` e pára a `/stop` sem erro. **Não foi testado contra um servidor real** — como o nosso.

**Risco registado**
- O `settings.json` do branch `Tests` está versionado com o endereço de um servidor a sério (`*.aternos.me`). Não é copiado para este branch, mas fica no histórico desse branch.

**Por decidir (ideias I-008 e I-009)**
- Que implementação é a base, e como juntar o que falta de cada uma.

### 2026-09-29 (quarta sessão)

**Feito — módulos e testes**
- `src/config.js`, `src/i18n.js`, `src/log.js` e `src/reconnect.js` extraídos do `index.js`. Dependências injectadas, por isso não precisam de Mineflayer para serem testados. O `index.js` passou de ~660 para ~430 linhas e agora é sobretudo composição.
- `test/testes.js` (23 testes): leitura de configuração inválida, gravação que preserva campos desconhecidos, idiomas coerentes entre ficheiros, log e recuo exponencial.
- `test/arranque.js` + `test/harness.js` (12 verificações): arrancam o `index.js` de verdade com o Mineflayer e o readline substituídos, enviam comandos e verificam o que ficou gravado. **Não liga a servidor nenhum.**
- `npm test` corre os dois; o `verificar.mjs` ganhou o bloco 9 e passa a falhar se os testes falharem.
- `replit.nix` com `pkgs.nodejs-20_x`.

**Bug encontrado e corrigido**
- Depois de `/changeserver` ou `/changename`, o bot voltava a ligar com os valores antigos: a configuração mantida no `index.js` deixou de ser o mesmo objecto que a do módulo depois da refactorização. Passou a reatribuir em cada gravação. **O teste de arranque é que apanhou isto** — sem ele, o bug ia para o utilizador.

**Nota honesta**
- Os testes provam o arranque e a configuração, não o Mineflayer real. A primeira vez que o `index.js` ligar a um servidor a sério continua por fazer, e é o que está em *Próximos passos*.

### 2026-09-29 (terceira sessão)

**Feito — compatibilidade com o Node mínimo**
- `npm install` corrido pelo utilizador com Node 22: 159 pacotes, 13 segundos. Avisos anotados em *Problemas conhecidos*.
- `package.json` passou a declarar `"engines": { "node": ">=14.21.3" }` — a última série do Node que corre em Windows 7.
- Novo script `.opencode/scripts/verificar-node.mjs`: analis os `engines.node` das dependências instaladas e compila cada ficheiro do projecto com o Node mínimo (via `npx node@X.Y.Z --check`). Sem rede, salta a parte da sintaxe com aviso em vez de falhar.
- `verificar.mjs` ganhou o bloco 8, que chama o anterior em modo rápido (sem rede).
- Estado real: **nenhuma das 156 dependências exige mais do que Node 14.21.3**, e os 6 ficheiros do projecto compilam com o Node 14.21.3. **Isto não prova que o bot corra** — falta correr.

**Registado**
- Requisitos transversais R1 (Windows 7), R2 (versões recentes do Minecraft) e R3 (mods de qualquer loader) no `ROADMAP.md`, com o aviso de que o Java 8 é o último para Windows 7 e não chega para o Via actual nem para o Minecraft 1.20.5+.

**Por fazer**
- Correr o bot com o Node 14.21.3 de facto (`npx -y node@14.21.3 index.js` não chega: liga-se a servidores reais).
- Launcher que instale o Node certo conforme o Windows (ideia I-007).

### 2026-09-29 (segunda sessão)

**Feito — Fase 2, primeira parte**
- `index.js`: `require(configPath)` trocado por `configRead()`, que valida tipos, completa o que falta com o `default.json` e avisa em vez de rebentar; `configSave()` faz merge profundo, pelo que escrever uma opção já não apaga campos desconhecidos.
- `index.js`: reconexão automática com recuo exponencial (1s, 2s, 4s… até 60s, 10 tentativas), desligada quando a mudança foi deliberada (`/changeserver`, `/changename`, `/version`, `/stop`).
- `index.js`: a razão de expulsão deixou de aparecer como `[object Object]`.
- `/default` agora guarda um `settings.json.bak` antes de substituir.
- `lang/*.txt`: 6 chaves novas (config e reconexão) nos três idiomas, e as 7 chaves do launcher alinhadas — os três ficheiros ficaram com as mesmas 69 chaves.
- `.gitignore`: `*.bak`.
- Regras: commit e push automáticos após `verificar.mjs` sem erros, e `verificar.mjs` passou a ver ficheiros de dados a qualquer profundidade.

**Por fazer**
- Testar a correr: é a parte que falta para fechar a Fase 2.
- Separar o `index.js` em módulos.

**Notas**
- As mensagens de configuração são impressas em inglês mesmo quando o idioma configurado é outro, porque a configuração é lida antes de o idioma ser carregado. Débido menor.

### 2026-09-29

**Feito — camada de agente**
- `AGENTS.md`: regras, mapa do projecto com dono por ficheiro, tabela das 13 skills, regras anti-conflito, comandos dos scripts.
- 13 skills em `.opencode/skills/`, cada uma a declarar de que ficheiros é dona e o que nunca toca: `retomar-sessao`, `fechar-sessao`, `progresso`, `ideias`, `planear-versao`, `commit`, `verificar`, `organizar-projeto`, `novo-comando`, `traducoes`, `documentacao`, `lancar-versao`, `modded`. A `organizar-projeto` tem ainda `references/mapa-do-projeto.md`.
- 4 scripts sem dependências: `verificar.mjs` (estrutura, pacote, sintaxe, segredos, idiomas, higiene do git, documentação, coerência do AGENTS.md), `check-secrets.mjs`, `lang-keys.mjs`, `lib/util.mjs`.
- `ROADMAP.md` com 5 fases e `IDEIAS.md` com 6 ideias.

**Feito — Fase 1 (aprovada pelo utilizador)**
- `git mv` para a raiz de: `index.js`, `lang/`, `package.json`, `package-lock.json`, `default.json`, `run.cpp`, `LICENSE`, `.gitattributes`, `.replit`, `replit.nix`, e `dependabot.yml` para `.github/dependabot.yml` (o GitHub só lê aí).
- `git rm` dos READMEs antigos `README-eng.html/.txt` e `README-pt.html/.txt`, depois de comparar: tinham os mesmos comandos que os `.md` da raiz.
- `git rm --cached` (ficam no disco, sem versionar) de `run.exe`, `nodeMsi/*.msi`, `.idea/`, `logs/`, `settings.json`, `launcher_accounts.json`, `node_installed.flag`.
- `.gitignore` novo: dependências, `settings.json`, `launcher_accounts.json`, `logs/`, `node_installed.flag`, `*.exe`, `*.msi`, `nodeMsi/`, `.idea/`, `.vscode/`.

**Feito — correcções apanhadas pelo verificador**
- `error_lang_load` faltava nos três idiomas: o bot escrevia a chave crua sempre que o ficheiro de idioma não existia. Acrescentada com o valor em pt-PT, en e en-us.
- `cmd_default` faltava no `en-us.txt`.
- READMEs: documentado o comando `/default` e o ficheiro `lang/en-us.txt` (nos dois idiomas).
- Detector de segredos: `"jsonwebtoken"` do `package-lock.json` era falsos positivo (a expressão aceitava qualquer palavra acabada em "token"); e e-mails passaram a ser aviso, não bloqueio.

**Por fazer**
- Commitar (as alterações estão stageadas).
- `npm install` e teste manual.

**Notas**
- O `verificar.mjs` está testado: dava 10 erros no início da sessão e dá 0 agora.
- As skills do OpenCode vivem em `.opencode/skills/<id>/SKILL.md`; os caminhos escritos dentro delas são relativos à raiz do repositório, não à pasta da skill.
- Java e Via não estão instalados aqui, por isso a Fase 4 continua por testar.
