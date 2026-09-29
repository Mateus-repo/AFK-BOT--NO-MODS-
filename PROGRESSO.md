# PROGRESSO

> Diário técnico do projeto. Memória entre sessões. Quem escreve aqui é a skill `progresso`.

## Estado atual

- **A v2.1 está restaurada na raiz**: `index.js`, `lang/` (3 idiomas), `package.json`, `package-lock.json`, `default.json`, `run.cpp`, `LICENSE`, `.replit`, `replit.nix`, `.github/dependabot.yml`.
- O repositório está limpo: `run.exe`, `nodeMsi/*.msi`, `.idea/`, `logs/`, o `settings.json` antigo e os READMEs HTML/TXT duplicados saíram do índice do git. `old-deprecated-10.1/` só tem ficheiros **não versionados**.
- `verificar.mjs` está com **0 erros e 3 avisos** (versão `2.1` fora de `X.Y.Z`, `node_modules` por instalar, chaves só do launcher em `en-us.txt`).
- Criada a camada de agente: `AGENTS.md`, 13 skills em `.opencode/skills/`, 4 scripts em `.opencode/scripts/`, `IDEIAS.md` e `ROADMAP.md`.
- **Nada disto foi testado a correr**: `node index.js` liga-se a servidores reais e não foi executado. `npm install` também não foi corrido.
- Decidido: compatibilidade com mods faz-se com **sidecar local Via** (ideia I-001 aprovada), a implementar na Fase 4.

## Em curso

Nada a meio. A Fase 1 está fechada; as alterações estão **stageadas no git mas ainda não commitadas**.

## Próximos passos

- [ ] Commit da Fase 1 (código movido, limpeza, correcções de idioma, READMEs, skills e scripts) — `commit`
- [ ] `npm install` e um teste manual do bot num servidor de testes, com o procedimento registado aqui — `progresso`
- [ ] (Fase 2) Validação do `settings.json` ao arrancar + reescrita que preserve campos desconhecidos
- [ ] (Fase 2) Reconexão automática com recuo exponencial e limite de tentativas
- [ ] (Fase 2) Separar o `index.js` monolítico em módulos (configuração, idiomas, log, ligação, comandos)
- [ ] (Fase 2) Passar as chaves do launcher de `en-us.txt` para os outros dois idiomas
- [ ] (Fase 2) `replit.nix`: trocar `nodejs-14_x` por uma versão suportada
- [ ] (Fase 3) `"version": "auto"` com detecção da versão do servidor e comando `/diagnostico`
- [ ] (Fase 4) Implementar o sidecar local Via, seguindo o desenho em `docs/modded.md`
- [ ] Decidir se `express` sai do `package.json` ou passa a ser usado (ideia I-003)

## Problemas conhecidos

- **Nada foi testado a correr.** O `index.js` restaurado é o mesmo da v2.1 e não foi executado uma única vez nesta sessão. Antes de confiar em qualquer coisa, `npm install` e um teste num servidor de testes.
- **Chaves do launcher só em `en-us.txt`** — `error_no_version`, `error_node_fail`, `msg_node_install`, `msg_reopen`, `msg_npm_install`, `msg_npm_fix`, `msg_npm_done`. O `run.cpp` escolhe o idioma a partir de `settings.json`, por isso quem usar `pt-pt` ou `eng` vê as chaves cruas.
- **Configuração reescrita às cegas** — `changeServer()`, `changeName()`, `changeVersion()` e `changeLanguage()` fazem `writeFileSync` do objecto inteiro; qualquer campo acrescentado por outra via desaparece. Corrigido na Fase 2.
- **Sem reconexão** — depois de "Conexão encerrada" o processo fica parado.
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

## Diário de sessões

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
