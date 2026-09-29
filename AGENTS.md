# AGENTS.md

Regras de trabalho e mapa do repositório **AFK-BOT--NO-MODS-** (bot AFK para servidores de Minecraft, escrito em Node.js com Mineflayer, com launcher em C++ para Windows).

Este ficheiro é a entrada de todas as skills. Lê-o antes de tocar em nada.

---

## 1. Regras que não se negociam

1. **Fala português europeu.** Respostas, comentários, commits e mensagens de log em pt-PT. Os textos de utilizador estão em `lang/*.txt` e são traduzidos, não escritos à mão no código.
2. **Nunca corras o bot sem o utilizador pedir.** `node index.js` reescreve `settings.json`, pode gravar `node_installed.flag` e liga-se a servidores reais.
3. **Uma skill por ficheiro.** Cada ficheiro do projeto tem uma única dona (ver §3). Duas skills nunca editam o mesmo ficheiro na mesma alteração; se precisarem, a orquestradora chama-as por ordem (§5).
4. **Estrutura só com aprovação.** Mover, renomear ou apagar ficheiro é sempre plano primeiro, execução depois (skill `organizar-projeto`). "Organiza" não autoriza apagar.
5. **Só factos verificados no `PROGRESSO.md`.** Não se marca como feito o que não foi corrido ou tested.
6. **Segredos nunca entram no git.** `settings.json`, `launcher_accounts.json`, `logs/` e contas do launcher ficam de fora (verificação automática: `.opencode/scripts/check-secrets.mjs`).
7. **Verifica antes de guardar.** `node .opencode/scripts/verificar.mjs` tem de estar sem erros antes de um commit; isso inclui `npm test`, que corre sem ligar a servidor nenhum. Testes que precisem de servidor são uma excepção e estão marcados como tal.
8. **Pequeno e reversível.** Mudanças pequenas, um motivo por commit. Nada de refactor "de passagem".
9. **Node mínimo 14.21.3** — o projecto tem de correr em Windows 7, e o Node 14 é a última série que lá corre. Nada de sintaxe nem de dependência que só exista a partir do Node 16 sem dizer isso primeiro. `node .opencode/scripts/verificar-node.mjs` trata disso.
10. **Commitar e fazer push sem perguntar.** O dono do projecto deu autorização permanente (2026-09-29): assim que uma tarefa estiver verificada e coerente, faz-se o commit atómico e o `push` para o branch de trabalho, sem pedir confirmação. A protecção é o método — alterações pequenas, um motivo por commit, `verificar.mjs` limpo, segredos bloqueados, nunca `--force` e nunca directo para `main`.

---

## 2. Estado do repositório (2026-09-29)

- A **Fase 1 do `ROADMAP.md` está feita**: o código da v2.1 vive na raiz (`index.js`, `lang/`, `package.json`, `run.cpp`, `default.json`, `LICENSE`). Em `old-deprecated-10.1/` ficaram só ficheiros sem versionar (binários, logs, `.idea/`, um `settings.json` antigo).
- O que está a seguir é a **Fase 2** (blindar o núcleo) e depois a **Fase 3** (detetar a versão do servidor).
- Branch de trabalho: `mateus-test-atualizacao`. `node_modules` ainda não instalado.

---

## 3. Mapa do projeto e dono de cada ficheiro

| Ficheiro / pasta | O que é | Skill dona |
|---|---|---|
| `index.js` — função do comando + `case` no `switch` | comandos do terminal | `novo-comando` |
| `index.js` — `createBot()`, eventos, reconexão | camada de ligação | `modded` |
| `index.js` — composição, ligação e comandos | comandos: `novo-comando`; ligação: `modded` |
| `lang/*.txt` | idiomas (`chave=valor`) | `traducoes` |
| `settings.json` | configuração em uso (o bot reescreve) | ninguém — nunca versionar |
| `default.json` | modelo de configuração | `organizar-projeto` |
| `package.json` / `package-lock.json` | dependências | `commit` (escopo `deps`) |
| `package.json` — campo `version` | versão | `lancar-versao` |
| `run.cpp` | launcher C++ (Windows) | `lancar-versao` (publicação) / código |
| `README.md`, `README.pt.md` | documentação de utilizadores | `documentacao` |
| `LICENSE` | MIT | ninguém, sem pedido explícito |
| `AGENTS.md` | este ficheiro | `organizar-projeto` |
| `PROGRESSO.md` | diário técnico | `progresso` |
| `IDEIAS.md` | ideias por decidir | `ideias` |
| `ROADMAP.md` | plano por fases | `planear-versao` |
| `CHANGELOG.md` | notas de versão (vai ser criado) | `lancar-versao` |
| `docs/modded.md` | compatibilidade com servidores modded | `modded` |
| `.opencode/skills/**` | as skills (criar / renomear / apagar) | `organizar-projeto` |
| `.opencode/scripts/**` | verificações automáticas | `verificar` |
| `.gitignore`, `.gitattributes`, `.github/` | estrutura e regras git | `organizar-projeto` |
| `old-deprecated-10.1/` | arquivo da v2.1, já esvaziado do que interessa | `organizar-projeto` (com aprovação) |

Intocáveis para movimentos: `index.js`, `settings.json`, `default.json`, `launcher_accounts.json`, `package.json`, `package-lock.json`, `lang/`, `run.cpp`, `README.md`, `README.pt.md`, `LICENSE`. O código resolve-os por caminho e o launcher procura-os na pasta onde corre.

---

## 4. Skills

Todas em `.opencode/skills/<id>/SKILL.md`. Carrega-as com a ferramenta `skill` pelo **id exacto**.

| Skill | Usar quando | Dona de | Nunca toca em |
|---|---|---|---|
| `retomar-sessao` | início de sessão, "onde ficámos", "o que falta" | nada (só leitura) | tudo |
| `fechar-sessao` | "fecha sessão", "guarda tudo" | nada (orquestra) | tudo directamente |
| `progresso` | registar trabalho, marcar feito, próximos passos | `PROGRESSO.md` | `IDEIAS.md`, `CHANGELOG.md`, READMEs |
| `ideias` | ideias por decidir, aprovar/rejeitar/adiar | `IDEIAS.md` | código, `PROGRESSO.md` |
| `planear-versao` | desenhar a nova versão, dividir em fases | `ROADMAP.md` | `PROGRESSO.md`, código |
| `commit` | "faz commit", guardar alterações | histórico git | `.gitignore`, conteúdo dos ficheiros |
| `verificar` | "verifica", antes de commit ou de fechar sessão | `.opencode/scripts/` | ficheiros do projeto |
| `organizar-projeto` | mover/apagar/renomear, `.gitignore`, `AGENTS.md`, criar skills | estrutura do repositório | conteúdo de READMEs, `lang/`, `index.js` |
| `novo-comando` | criar ou alterar um comando do terminal | comandos em `index.js` | `lang/*.txt` (entrega à `traducoes`), READMEs |
| `traducoes` | chaves e textos de idioma | `lang/*.txt` | `index.js`, READMEs |
| `documentacao` | READMEs | `README.md`, `README.pt.md` | código, `PROGRESSO.md` |
| `lancar-versao` | nova versão, changelog, etiqueta | `package.json` (versão), `CHANGELOG.md` | dependências, conteúdo do código |
| `modded` | servidores com mods, ViaVersion, deteção de versão, reconexão | `docs/modded.md`, camada de ligação | comandos, `lang/*.txt` (entrega à `traducoes`) |

As descrições acima são resumo: a **fonte de verdade de cada skill é o seu `SKILL.md`**, que sempre declara de que ficheiros é dona.

---

## 5. Skills orquestradoras

Encadeiam outras e não repetem as regras delas:

- **`fechar-sessao`** → `verificar` → `progresso` → `ideias` → `commit`
- **`lancar-versao`** → `verificar` → `commit` → (opcionalmente `documentacao`, `progresso`)
- **`novo-comando`** → `traducoes` (chaves) → verifica → `documentacao` (README)
- **`modded`** → `traducoes` (mensagens novas) → verifica → `documentacao` (resumo)
- **`organizar-projeto`** → `verificar` → `commit`

## 6. Regras anti-conflito

1. **Uma alteração, um dono.** Se uma tarefa precisar de vários ficheiros de donos diferentes, a orquestradora faz as alterações por ordem e confirma com a skill `verificar` entre elas.
2. **Documentação nunca viaja com código** no mesmo commit (excepção: o commit que introduz um comando novo pode trazer a chave de idioma; o README vai em `docs(readme)`).
3. **`package.json` e `package-lock.json` andam sempre juntos** (escopo `deps`).
4. **Uma skill nova ou renomeada obriga a actualizar este `AGENTS.md` na mesma alteração** — o `verificar.mjs` falha se ficarem desincronizados.
5. **Se duas skills forem ambíguas para o mesmo pedido**, pergunta qual usar em vez de fazer as duas coisas.

## 7. Scripts (determinísticos, sem dependências)

Correr sempre a partir da raiz do repositório:

```bash
node .opencode/scripts/verificar.mjs        # tudo (0 = sem erros, 1 = com erros)
node .opencode/scripts/verificar.mjs --rapido
node .opencode/scripts/check-secrets.mjs    # segredos (também: --staged, --files, --json)
node .opencode/scripts/lang-keys.mjs        # chaves de idioma (também: --falta, --json)
node .opencode/scripts/verificar-node.mjs    # compatibilidade com o Node mínimo (também: --rapido, --json)
npm test                                       # testes (não ligam a servidores)
```

Os caminhos nos comandos das skills são **relativos à raiz do repositório**.

## 8. Ficheiros de memória

| Ficheiro | Pergunta que responde | Escrito por |
|---|---|---|
| `AGENTS.md` | "como se trabalha aqui?" | `organizar-projeto` |
| `PROGRESSO.md` | "onde é que estamos?" | `progresso` |
| `IDEIAS.md` | "o que ainda não foi decidido?" | `ideias` |
| `ROADMAP.md` | "o que vem a seguir e porquê?" | `planear-versao` |
| `CHANGELOG.md` | "o que mudou para quem usa?" | `lancar-versao` |

## 9. Git

- Mensagens em Conventional Commits, descrição em pt-PT, escopos da tabela da skill `commit`.
- **Commit e `push` são automáticos** depois de `verificar.mjs` dar 0 erros (autorização permanente de 2026-09-29). Não perguntes; faz e reporta.
- Nunca `--force`, `reset --hard`, `clean -fd` ou `--no-verify`.
- Nunca push directo para `main`/`master`: o trabalho vai para o branch de trabalho.
- Antes de qualquer commit: `node .opencode/scripts/verificar.mjs` e `node .opencode/scripts/check-secrets.mjs --staged`.
- **Apagar ficheiros do histórico** (o `run.exe`, o `.msi` e os logs ficaram em commits antigos) é uma operação separada e precisa de um `git filter-repo` bem feito. Está por fazer e não é urgente.

## 10. Avisos permanentes

- `old-deprecated-10.1/` ficou só com ficheiros **não versionados** (binários, logs, `.idea/`, um `settings.json` com dados reais de um servidor antigo). Podem ser apagados, mas só com aprovação da skill `organizar-projeto`.
- O launcher `run.cpp` espera uma pasta `nodeMsi/` que **não existe** no repositório; compilar tal como está não chega para um utilizador novo (ideia I-006).
- `replit.nix` fixa `pkgs.nodejs-14_x`: desatualizado, e o `express` declarado no `package.json` não é usado em lado nenhum.
- **Requisitos transversais**: correr em Windows 7, funcionar nas versões mais recentes do Minecraft e funcionar com mods de qualquer loader. Estão no `ROADMAP.md` (R1, R2, R3). Nenhuma alteração pode quebrá-los sem o utilizador decidir.
- **Windows 7 e mods**: o Java 8 é o último que corre em Windows 7, e o Via actual e o Minecraft 1.20.5+ precisam de Java 21. Não prometas as duas coisas ao mesmo tempo.
- Os três `lang/*.txt` têm as mesmas 69 chaves; o `run.cpp` escolhe o idioma a partir de `settings.json`.
