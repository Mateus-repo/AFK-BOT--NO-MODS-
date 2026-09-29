# Mapa do projeto (referência da skill `organizar-projeto`)

Estado observado em 2026-09-29. O código da v2.1 vive em `old-deprecated-10.1/`; a raiz
só tem os READMEs. Actualiza esta tabela sempre que a estrutura mudar.

## Raiz

| Ficheiro / pasta | O que é | Quem edita | Nota |
|---|---|---|---|
| `index.js` | programa inteiro: ligação Mineflayer, comandos do terminal, idiomas, logs | `novo-comando` para comandos; `modded` para a camada de ligação | intocável para movimentos |
| `settings.json` | configuração em uso; **o bot reescreve-o** ao arrancar | o próprio bot | nunca versionar |
| `default.json` | modelo de configuração, copiado por `/default` | `organizar-projeto` (estrutura) | versionar |
| `launcher_accounts.json` | contas do launcher (`accounts: []`) | o launcher / o utilizador | nunca versionar |
| `package.json`, `package-lock.json` | dependências; `main: index.js` | `commit` (escopo `deps`), `lancar-versao` (versão) | versionar juntos |
| `lang/*.txt` | idiomas (`key=value`) | `traducoes` | intocável para movimentos |
| `run.cpp` | launcher C++ para Windows: verifica Node, instala, corre `index.js` | código | espera `nodeMsi/`, que não existe no repositório |
| `README.md`, `README.pt.md` | documentação principal EN / PT-PT | `documentacao` | têm de ficar sincronizados entre si |
| `LICENSE` | MIT | só a pedido explícito do utilizador | |
| `AGENTS.md` | regras + mapa de skills | `organizar-projeto` | |
| `PROGRESSO.md` | diário técnico | `progresso` | |
| `IDEIAS.md` | ideias por decidir | `ideias` | |
| `ROADMAP.md` | plano das versões | `planear-versao` | |
| `.opencode/skills/*/SKILL.md` | as skills | `organizar-projeto` (criar/renomear) | conteúdo: a skill dona |
| `.opencode/scripts/*.mjs` | verificações automáticas | `verificar` | sem dependências |
| `.gitignore`, `.gitattributes` | regras git | `organizar-projeto` | |

## Dentro de `old-deprecated-10.1/` (arquivo v2.1)

| Item | Problema | Proposta |
|---|---|---|
| `index.js` (13 KB, monolítico) | código actual, na pasta errada | restaurar para a raiz como base da v3 (fase 1 do `ROADMAP.md`) |
| `package.json` v2.1 | só dependências; `express` declarado e não usado | restaurar e limpar |
| `lang/eng.txt`, `pt-pt.txt`, `en-us.txt` | `en-us.txt` tem chaves do launcher que os outros não têm | restaurar; alinhar com a skill `traducoes` |
| `run.exe` (1,9 MB), `nodeMsi/node-v22.16.0-x64.msi` | binários versionados | apagar do git; `.gitignore` |
| `.idea/` | configuração de IDE | apagar do git; `.gitignore` |
| `logs/latest.log`, `logs/lastest-log.txt` | logs com servidores reais; `lastest` é gralha | `.gitignore`; apagar com aprovação |
| `node_installed.flag` | marca gerada pelo launcher | `.gitignore` |
| `README-eng.html/.txt`, `README-pt.html/.txt` | versões antigas dos READMEs | apagar depois de comparar com os `.md` |
| `dependabot.yml` | na raiz, o GitHub só lê `.github/dependabot.yml` | mover para `.github/` |
| `.replit`, `replit.nix` | execução no Replit com `nodejs-14_x` (desatualizado) | manter ou remover, com aprovação |
| `settings.json` | versão antiga com servidor real | apagar do git; `.gitignore` |

## `.gitignore` recomendado (acrescentar ao que já existe)

```gitignore
logs/
settings.json
launcher_accounts.json
node_installed.flag
.idea/
*.exe
*.msi
```

Regras: acrescenta, não substituas; preserva os finais de linha do ficheiro; um ficheiro
já versionado precisa de `git rm --cached` (com aprovação) para sair do histórico.
