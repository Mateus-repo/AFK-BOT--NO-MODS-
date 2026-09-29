# PROGRESSO

> Diário técnico do projeto. Memória entre sessões. Quem escreve aqui é a skill `progresso`.

## Estado atual

- **A v2.1 está restaurada na raiz**: `index.js`, `lang/` (3 idiomas), `package.json`, `package-lock.json`, `default.json`, `run.cpp`, `LICENSE`, `.replit`, `replit.nix`, `.github/dependabot.yml`.
- O repositório está limpo: `run.exe`, `nodeMsi/*.msi`, `.idea/`, `logs/`, o `settings.json` antigo e os READMEs HTML/TXT duplicados saíram do índice do git. `old-deprecated-10.1/` só tem ficheiros **não versionados**.
- `verificar.mjs` está com **0 erros e 3 avisos** (versão `2.1` fora de `X.Y.Z`, `node_modules` por instalar, chaves só do launcher em `en-us.txt`).
- Criada a camada de agente: `AGENTS.md`, 13 skills em `.opencode/skills/`, 4 scripts em `.opencode/scripts/`, `IDEIAS.md` e `ROADMAP.md`.
- **Requisitos transversais registados** (2026-09-29): correr em **Windows 7**, funcionar nas **versões mais recentes do Minecraft** e funcionar com **mods de qualquer loader**. Mínimo de Node **14.21.3**, declarado em `package.json` e verificado por `verificar-node.mjs`.
- **Fase 2 começada**: a configuração passa a ser lida com validação (`configRead`), gravada sem perder campos desconhecidos (`configSave`) e o bot voltou a ligar-se sozinho quando a ligação cai, com recuo exponencial até 60 segundos e limite de 10 tentativas.
- **Nada disto foi testado a correr**: `node index.js` liga-se a servidores reais e não foi executado. `npm install` também não foi corrido.
- Decidido: compatibilidade com mods faz-se com **sidecar local Via** (ideia I-001 aprovada), a implementar na Fase 4.

## Em curso

Fase 2 a meio: configuração e reconexão feitas, separação do `index.js` em módulos ainda por fazer.

## Próximos passos

- [ ] `npm install` e um teste manual do bot num servidor de testes, com o procedimento registado aqui — `progresso`
- [ ] (Fase 2) Separar o `index.js` monolítico em módulos (configuração, idiomas, log, ligação, comandos)
- [ ] (Fase 2) **Testar a configuração e a reconexão a correr** (é o que falta para a fase estar fechada)
- [ ] (Fase 2) Rever `run.cpp`: o `/default` agora deixa um `settings.json.bak`
- [ ] (Fase 2) `replit.nix`: trocar `nodejs-14_x` por uma versão suportada
- [ ] (Fase 3) `"version": "auto"` com detecção da versão do servidor e comando `/diagnostico`
- [ ] (Fase 4) Implementar o sidecar local Via, seguindo o desenho em `docs/modded.md`
- [ ] Decidir se `express` sai do `package.json` ou passa a ser usado (ideia I-003)

## Problemas conhecidos

- **Nada foi testado a correr.** O `index.js` restaurado é o mesmo da v2.1 e não foi executado uma única vez nesta sessão. Antes de confiar em qualquer coisa, `npm install` e um teste num servidor de testes.
- **Chaves do launcher alinhadas** — `error_no_version`, `error_node_fail` e as `msg_*` passaram para os três idiomas; os `lang/*.txt` têm agora as mesmas 69 chaves.
- **Configuração e reconexão corrigidas, por testar** — `configRead`/`configSave` e a reconexão com recuo exponencial entraram hoje e nunca foram executadas. Se houver erro de sintaxe em runtime, aparece no primeiro arranque.
- **A reconexão pode ser agressiva** — 10 tentativas com recuo até 60 s dão quase 5 minutos a tentar. Num servidor que recusa a conta, é isso que o utilizador vai ver.
- **Windows 7 x mods x versões novas não cabem juntos** — o Java 8 é o último que corre em Windows 7, e o Minecraft 1.20.5+ e o Via actual precisam de Java 21. Num PC com Windows 7, o sidecar só deve servir de imediatamente versões mais antigas. **Por confirmar.**
- **O launcher não está preparado para o Windows 7** — o `run.cpp` instala sempre o Node 22.16.0 de um MSI que não existe no repositório, e o Node 22 não corre em Windows 7. Ideia I-007.
- **`npm install` com avisos** — 159 pacotes; `@azure/msal-node@1.18.4` declara `engines: 10 || 12 || 14 || 16 || 18` (é aviso, e o 14 está na lista); `lodash.get@4.4.2` marcado como obsoleto (dependência transitiva); `npm audit` aponta 15 vulnerabilidades (8 moderadas, 7 altas) por avaliar.
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
