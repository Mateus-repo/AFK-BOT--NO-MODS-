---
name: Fechar sessão
description: Fim de sessão — verifica o projeto, regista o trabalho em PROGRESSO.md, guarda ideias soltas em IDEIAS.md e cria os commits, por esta ordem. Usar quando o utilizador diz "fecha sessão", "acabei por hoje", "guarda tudo", "por hoje é só", "encerra", "wrap up" ou pede registar e commitar de uma vez. Skill orquestradora: chama outras e não repete as regras delas. Não usar para um commit isolado (skill `commit`) nem só para registar (skill `progresso`).
---

# Fechar sessão

Orquestra outras skills. **Não repetes regras**: cada passo segue integralmente a skill indicada.

## Ordem

1. **`verificar`** — `node .opencode/scripts/verificar.mjs`
   - Erros causados pelo trabalho desta sessão → **para**, mostra o que falhou e não commites.
   - Erros que já existiam e estão em *Problemas conhecidos* → segues e mencionas no resumo.
2. **`progresso`** — regista a sessão: feito, por fazer, decisões, problemas novos.
3. **`ideias`** — só se surgiram ideias na conversa que ainda não estão em `IDEIAS.md`. Sem ideias novas, saltas o passo.
4. **`commit`** — commits atómicos do código/config primeiro; `PROGRESSO.md`, `IDEIAS.md` e `ROADMAP.md` num último commit `docs(progresso): ...`.

## Regras

- "Sem commit" → faz 1 a 3 e deixa os ficheiros por guardar. "Sem push" → faz 1 a 4 e deixa o branch local à frente do remoto, avisando no resumo.
- O `push` é feito pela skill `commit` (autorização permanente de 2026-09-29): não perguntes, faz `git push` para o branch de trabalho e reporta o que foi para o remoto. Nunca `--force`, nunca para `main`.
- `git status` limpo no fim é o objetivo; se sobrar algo, diz o quê e porquê.
- Resumo final (6 linhas no máximo): o que foi verificado · o que foi registado · commits criados (hash + título) · primeiro passo da próxima sessão.

## Antes de terminar

Confirma que `PROGRESSO.md` tem entrada com a data de hoje (`date +%F`) e que *Próximos passos* não ficou vazio. Sem próximo passo, a próxima sessão começa às cegas.
