---
name: Commit
description: Cria commits git limpos e seguros — divide alterações em commits atómicos, escreve mensagens em Conventional Commits com descrição em português europeu e bloqueia segredos antes de guardar. Faz commit e push sem pedir confirmação, por autorização permanente do dono do projecto. Usar sempre que o utilizador diz "faz commit", "guarda as alterações", "commita", "git add e commit" ou ao terminar uma tarefa. Dona do histórico git (add/commit/push). Não usar para lançar versões e etiquetas (skill `lancar-versao`) nem para mover/apagar ficheiros (skill `organizar-projeto`).
---

# Commit

**Autorização permanente (2026-09-30):** commitar e fazer `push` são ações obrigatórias desta skill. Não perguntes, não esperes confirmação, não deixes trabalho por guardar. Um commit que fica no disco é trabalho a meio.

- **Commit**: sempre que uma alteração passou na verificação.
- **Push**: sempre que houve commit. É obrigatório. Sem excepção por "depois vê-se".
- A protecção é o método, não a hesitação: pequeno, atómico, verificado e reversível.

## Mensagem: `tipo(escopo): descrição`

- **tipo** (inglês, fixo): `feat` `fix` `docs` `refactor` `style` `perf` `test` `build` `chore` `revert`
- **escopo** (um só): `bot` · `comandos` · `lang` · `launcher` · `config` · `deps` · `deploy` · `readme` · `projeto` · `progresso` · `skills`
- **descrição**: português europeu, 3.ª pessoa do presente (adiciona, corrige, remove), minúsculas, sem ponto final, até 72 caracteres
- **corpo** (opcional, linha em branco antes): explica o *porquê*, não o *o quê*
- **breaking change**: `!` depois do escopo + rodapé `BREAKING CHANGE: ...`

```
feat(comandos): adiciona o comando /uptime
fix(lang): acrescenta a chave error_lang_load em falta
docs(readme): documenta o comando /default
chore(projeto): retira binários e logs do índice do git
refactor(projeto): move o código da v2.1 para a raiz
```

| Escopo | Ficheiros típicos |
|---|---|
| `bot` | `index.js` (ligação, eventos, reconexão) |
| `comandos` | `index.js` (comandos do terminal) |
| `lang` | `lang/*.txt` |
| `launcher` | `run.cpp` |
| `config` | `settings.json`, `default.json` (estrutura, nunca dados reais) |
| `deps` | `package.json`, `package-lock.json` (juntos, sempre) |
| `deploy` | `.replit`, `replit.nix` |
| `readme` | `README.md`, `README.pt.md` |
| `projeto` | `.gitignore`, `.gitattributes`, `.github/`, mover/apagar ficheiros |
| `progresso` | `PROGRESSO.md`, `IDEIAS.md`, `ROADMAP.md` |
| `skills` | `AGENTS.md`, `.opencode/` |

## Procedimento

1. `git rev-parse --is-inside-work-tree`. Sem repositório → avisa e propõe `git init`; **não inicializes sem o utilizador aceitar**.
2. `node .opencode/scripts/verificar.mjs` — **tem de dar 0 erros**. Avisos não bloqueiam; erros que já existiam estão em *Problemas conhecidos* e podem ser bottlenecks com nota no commit.
3. Lê `git status --short`, `git diff` e `git diff --cached` para perceber a **intenção** de cada alteração.
4. Divide por intenção: uma correcção, uma funcionalidade, uma limpeza por commit. Documentação nunca vai misturada com código. `package.json` e `package-lock.json` andam juntos.
5. Stage **por caminho**: `git add ficheiro1 ficheiro2`. Ficheiro com duas intenções → `git add -p`. Só `git add -A` se tiveres revisto tudo e for um único commit.
6. Corre `node .opencode/scripts/check-secrets.mjs --staged`. Se der ⛔: tira o ficheiro do stage (`git restore --staged <f>`), explica e **não** commites esse ficheiro.
7. `git commit -m "<título>"` (duas vezes `-m` se houver corpo). Sem `--no-verify`.
8. **Push — obrigatório**: `git push` para o branch actual (que tem upstream). Se não tiver, `git push -u origin <branch>`. Sem `--force`, sem tags sem ser pela skill `lancar-versao`. **Não termines a tarefa com commits por subir.**
9. Confirma com `git log --oneline -n <nº de commits criados>` e `git status -sb`. O `status` tem de dizer **"up to date"** com o remoto: se ainda houver trabalho por guardar ou commits por subir, isso é trabalho inacabado.

## Nunca (mesmo com autorização para commitar e fazer push)

- `--no-verify`, `git push --force`, `git reset --hard`, `git clean -fd`, alterar `git config`.
- `--amend` num commit já enviado (confirma `git status -sb`: se está "ahead", já foi enviado).
- **Terminar uma tarefa com alterações por guardar ou commits por subir.** Se o `verificar.mjs` falhar com erro, corrige-se e volta a correr-se; não se para a meio.
- Commitar `settings.json` com dados reais, `launcher_accounts.json`, `logs/`, `node_modules/`, binários (`run.exe`, `*.msi`), `.idea/`, `node_installed.flag`, nem a pasta `resources/` (cópia de referência).
- Fazer push de algo que o `verificar.mjs` dá como erro.
- Push directo para `main`/`master` sem o utilizador pedir — o trabalho vai para o branch de trabalho.

## Passar a outra skill

- Versão, `CHANGELOG.md`, etiqueta → `lancar-versao` (que também pode fazer push).
- Ficheiros movidos/apagados ou `.gitignore` → o plano vem de `organizar-projeto`; o commit é feito aqui, com escopo `projeto`.
- Ficheiros de `lang/` → depois de `traducoes` ter escrito as chaves.
