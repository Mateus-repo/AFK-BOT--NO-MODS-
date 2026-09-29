---
name: Retomar sessão
description: Início de sessão — lê AGENTS.md, PROGRESSO.md, IDEIAS.md, ROADMAP.md e o estado do git e responde onde o projeto está e qual é o próximo passo. Usar quando o utilizador abre conversa nova, diz "retomar", "continuar", "onde ficámos", "o que falta", "ponto de situação", "como está o projeto" ou pede o estado atual. Skill só de leitura, não altera ficheiros. Não usar para registar trabalho feito (skill `progresso`) nem para guardar tudo no fim (skill `fechar-sessao`).
---

# Retomar sessão

Objetivo: em menos de um minuto o utilizador sabe **onde o projeto está** e **o que fazer a seguir**. Esta skill não escreve nada.

## Passos

1. Lê `AGENTS.md` (regras + mapa de skills), a não ser que já esteja no contexto.
2. Lê `PROGRESSO.md`: *Estado atual*, *Em curso*, *Próximos passos*, *Problemas conhecidos* e a entrada mais recente do *Diário de sessões*.
3. Corre `git status -sb` e `git log --oneline -5`. Se não houver repositório, diz isso numa linha e segue.
4. Corre `node .opencode/scripts/verificar.mjs` e resume em uma linha: X erros, Y avisos. Não despejes o relatório todo.
5. Lê `IDEIAS.md` só para contar ideias por estado e nomear as ✅. Não discutas nenhuma.
6. Confere `ROADMAP.md` contra *Próximos passos*: se a fase do roadmap e a tarefa do progresso não baterem certo, assinala.
7. Compara git com `PROGRESSO.md`. Se houver trabalho não registado, diz qual — e **não** arrumes: propõe `progresso` ou `fechar-sessao`.

## Resposta (máx. ~12 linhas)

```
Estado: <versão, 1 linha — o que funciona e o que está partido>
Última sessão: <AAAA-MM-DD — o que ficou feito>
Por guardar: <ficheiros alterados / commits por registar / nada>
Verificação: <X erros, Y avisos> ou <não foi possível correr>
Próximo passo: <1 item concreto: o primeiro de "Próximos passos">
Alternativas: <até 2 itens>
Atenção: <só se houver: bloqueios, divergência git vs PROGRESSO>
```

Termina com uma pergunta: por onde quer começar? **Não comeces a trabalhar sem resposta.**

## Limites

- Não corras `node index.js` (reescreve `settings.json` e liga-se a servidores reais).
- Não abras código "por curiosidade": esta skill orienta, não analisa.
- Não edites nada. Se o estado estiver incoerente, diz qual skill resolve.
- Sem `PROGRESSO.md` → diz que o projeto ainda não tem registo e propõe a skill `progresso`.
