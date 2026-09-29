---
name: Ideias
description: Gere o IDEIAS.md — o caderno de ideias por decidir (funcionalidades, melhorias, experiências para servidores com mods). Usar quando o utilizador diz "tive uma ideia", "e se o bot...", "guarda esta ideia", "regista uma sugestão", "que ideias temos", "avalia esta ideia", "aprova a I-003", "rejeita", "adia" ou quando surge uma ideia solta no meio do trabalho. Dona exclusiva do IDEIAS.md. Uma ideia nunca vira código sozinha. Não usar para tarefas já decididas (skill `progresso`) nem para implementar (skills `novo-comando` ou `modded`).
---

# Ideias

`IDEIAS.md` guarda o que **ainda não foi decidido**. Assim nada se perde e nada é implementado sem aprovação.

- Por decidir → aqui.
- Decidido e por fazer → `PROGRESSO.md` (skill `progresso`).
- Feito → fica aqui como 📦 Feita, com a referência (commit, versão ou `Fase N` do roadmap).

## Estados (secções do ficheiro, por esta ordem)

| Secção | Estado | Significado |
|---|---|---|
| 💡 Novas | `💡 Nova` | acabou de ser registada |
| 🔍 A avaliar | `🔍 A avaliar` | está a ser analisada (tem prós/contras) |
| ✅ Aprovadas | `✅ Aprovada` | o utilizador disse sim; pronta a passar a `PROGRESSO.md` |
| ⏸️ Adiadas | `⏸️ Adiada` | boa, mas não agora |
| ❌ Rejeitadas | `❌ Rejeitada` | não vai ser feita; fica o motivo |
| 📦 Feitas | `📦 Feita` | implementada; fica a referência |

## Formato de cada ideia

```markdown
### I-001 · Reexecução automática

- Estado: 💡 Nova · Registada: AAAA-MM-DD
- O quê: o bot volta a ligar-se sozinho quando a ligação cai.
- Porquê: hoje o processo fica parado depois de "Conexão encerrada".
- Esforço: S | M | L · Impacto: baixo | médio | alto
- Toca em: index.js (createBot), lang/*.txt
- Riscos: <se existirem>
- Notas: <prós/contras, dúvidas>
```

O número `I-NNN` **nunca se reutiliza**, mesmo que a ideia seja rejeitada.

## Operações

**Registar.** Procura primeiro por ideias parecidas (palavras-chave) em todo o ficheiro. Se já existe, acrescenta nota à existente em vez de duplicar. Usa as palavras do utilizador; não embelezes nem alargues o âmbito. Effort/impacto em falta → `?`.

**Avaliar.** Junta prós, contras, riscos e uma recomendação de uma linha. Passa a 🔍. A decisão é do utilizador.

**Aprovar / adiar / rejeitar.** Só quando o utilizador o diz explicitamente. Move a ideia para a secção certa e atualiza `Estado`. Rejeitadas ficam sempre, com o motivo — nunca se apagam.

**Promover.** Ideia ✅ → escreve o resumo da tarefa e entrega à skill `progresso` (que a põe em *Próximos passos* citando `I-NNN`). Aqui acrescentas `→ tarefa em PROGRESSO.md`. Se a ideia exigir arquitetura, o desenho vai para a skill `planear-versao`; se for um comando, a implementação segue `novo-comando`.

**Listar.** Tabela curta: ID · título · estado · esforço · impacto, com as aprovadas primeiro.

## Limites

- Só edita `IDEIAS.md`. Não escreve código, não toca em `PROGRESSO.md`, não faz commit (isso é da skill `commit`).
- Não decidas por tua conta e não "aprov es" ideias implicitamente porque o utilizador achou graça.
- Sem segredos e sem servidores pessoais.
- Uma ideia sobre mods ou servidores compatíveis entra aqui normalmente; a skill `modded` só trabalha o que já estiver ✅.
