---
name: Planear versão
description: Mantém o ROADMAP.md — o plano por fases da próxima versão (o que entra, porquê, o que fica de fora e como se sabe que a fase está feita). Usar quando o utilizador diz "planeia a nova versão", "o que vamos fazer a seguir", "desenha a arquitetura", "divide em etapas", "atualiza o roadmap" ou no início de uma sessão em que há trabalho grande pela frente. Dona exclusiva do ROADMAP.md. Não usar para registar o que foi feito (skill `progresso`), para o caderno de ideias por decidir (skill `ideias`) nem para escrever o changelog (skill `lancar-versao`).
---

# Planear versão

`ROADMAP.md` responde a três perguntas: **o que queremos que o bot faça**, **em que ordem**, e **como sei que está feito**. `PROGRESSO.md` é o que aconteceu; `IDEIAS.md` é o que ainda nem foi decidido. O roadmap só aponta para as outras dois.

## Estrutura

```markdown
# Roadmap

## Visão
<2 a 4 linhas: o que o bot passa a ser>

## Fase 1 — <nome> · estado: por fazer
- **Objectivo**: <uma frase>
- **Inclui**: <lista>
- **Fora**: <o que fica deliberadamente de fora>
- **Pronto quando**: <critérios verificáveis, escrevidos de forma a poder correr>
- **Riscos**: <o que pode correr mal e o plano B>

## Decisões estruturais
- <AAAA-MM-DD — decisão — porquê>
```

## Regras de fase

- **Uma fase, um objectivo.** Se precisa de "e também", são duas fases.
- **"Pronto quando" é verificável**: `node .opencode/scripts/verificar.mjs` sem erros, um comando novo listado no README, um teste que corre. Nada de "deve funcionar bem".
- **"Fora" é obrigatório.** Uma fase sem exclusões é uma fase sem fim. A compatibilidade com mods, por exemplo, entra como fase própria e não como parte de "melhorias".
- **Ordem por dependência e por risco**: o que dá valor rápido e é reversível vem primeiro; o que é caro e difícil de desfazer (reescrever a estrutura, protocolos) vem depois, com o risco escrito.
- Fases pequenas. "Reorganizar o `index.js`" só entra depois do código estar na raiz e com testes de caracterização.

## Procedimento

1. Lê `PROGRESSO.md` (*Estado atual*, *Problemas conhecidos*), `IDEIAS.md` (✅) e o resultado de `node .opencode/scripts/verificar.mjs` — a fase 1 quase sempre sai daqui.
2. Se o pedido for ambíguo quanto ao alcance, **pergunta** antes de escrever (uma pergunta, com opções, não um interrogatório).
3. Escreve ou actualiza as fases em `ROADMAP.md`, mantendo as já existentes: uma fase feita não se reescreve, marca-se.
4. Entrega as fases prontas à skill `progresso` para irem para *Próximos passos* (a mais prioritária primeiro, citando `Fase N`).
5. Se uma fase exigir decisão que o utilizador ainda não tomou, escreve-a em `IDEIAS.md` (skill `ideias`) em vez de decidir no roadmap.

## Limites

- Só edita `ROADMAP.md`. Código é de outras skills; tarefas prontas vão para `progresso`.
- Nunca reescreves fases concluídas (o histórico fica no `PROGRESSO.md`).
- Sem promessas técnicas: se não sabes se uma biblioteca suporta uma coisa, diz "por confirmar" e mete a verificação como tarefa — não inventes viabilidade.
- Roadmap com mais de ~150 linhas está a fazer de Everything: condensa fases antigas num `## Feito` com uma linha cada.
