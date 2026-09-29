---
name: Progresso
description: Mantém o PROGRESSO.md — o diário técnico interno do projeto (estado atual, em curso, próximos passos, problemas conhecidos, decisões e diário de sessões). Usar quando o utilizador diz "regista o progresso", "atualiza o progresso", "marca como feito", "adiciona à lista de tarefas", "o que falta", "próximos passos", ou depois de concluir uma tarefa relevante. Dona exclusiva do PROGRESSO.md. Não usar para ideias por decidir (skill `ideias`), para notas de versão (skill `lancar-versao`) nem para o README (skill `documentacao`).
---

# Progresso

`PROGRESSO.md` é a memória do projeto entre sessões.

- **Tarefa** = já decidida → aqui.
- **Ideia** = ainda por decidir → `IDEIAS.md`, skill `ideias`.
- `CHANGELOG.md` = utilizadores → skill `lancar-versao`. `README` = instalação e uso → skill `documentacao`.

## Estrutura (manter esta ordem e estes títulos)

1. `## Estado atual` — 2 a 4 linhas: versão, o que funciona, o que está partido.
2. `## Em curso` — o que ficou a meio: ficheiros mexidos, onde parou exactamente.
3. `## Próximos passos` — checklist `- [ ]` por ordem de prioridade. O **primeiro** item é o que a skill `retomar-sessao` vai sugerir.
4. `## Problemas conhecidos` — bugs e dívida com o sítio exacto (`index.js`, função, chave de idioma).
5. `## Decisões` — uma linha por decisão: `AAAA-MM-DD — decisão — porquê`.
6. `## Diário de sessões` — mais recente em cima; uma entrada por sessão.

## Procedimento

1. Data real: `date +%F`. Factos verificados: `git log --oneline`, `git diff --stat`, o que foi feito na conversa.
   **Regista só o que aconteceu.** Não inventes resultados, não marques como feito o que não foi testado.
2. Acrescenta a entrada do diário: `### AAAA-MM-DD` com *Feito*, *Por fazer*, *Decisões*, *Notas* (omite o que não existir).
3. Move para o diário o que ficou concluído. Nos *Próximos passos* só existem `- [ ]`; concluídos são `- [x]` **dentro do diário**.
4. Atualiza *Estado atual* e *Em curso*. Sai de *Problemas conhecidos* o que se resolveu; entra o que apareceu.
5. Confirma que não duplicaste nada e que o ficheiro fica com menos de ~200 linhas.

## Manutenção

Com mais de 10 entradas no diário, condensa as antigas numa secção `## Resumo por mês` (2 a 3 linhas por mês). Faz isso em lote, nunca uma entrada de cada vez.

## Limites

- Só edita `PROGRESSO.md`. Ideia que apareceu → skill `ideias`. Precisas de guardar → skill `commit`.
- Sem segredos, sem palavras-passe, sem IPs ou domínios de servidores pessoais (os logs do projeto têm alguns; não os copies).
- Fases do `ROADMAP.md` só entram aqui como *Próximos passos* concretos, com a referência `Fase N`.
