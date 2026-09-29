---
name: Lançar versão
description: Prepara e publica uma versão — atualiza a versão em package.json, escreve o CHANGELOG.md e cria a etiqueta git. Usar quando o utilizador diz "lança a versão", "solta a 3.0", "nova release", "cria a tag", "publica a atualização" ou quando uma fase do ROADMAP.md chega a "pronta a lançar". Dona de package.json (campo version) e do CHANGELOG.md. Não usar para commits avulsos (skill `commit`) nem para decidir o que entra na versão (skill `planear-versao`).
---

# Lançar versão

## Decisão da versão (semantic versioning)

| Mudança | Versão |
|---|---|
| Correção de bug, texto, documentação | `PATCH` — 2.1.0 → 2.1.1 |
| Comando novo, opção nova, melhoria sem quebrar nada | `MINOR` — 2.1.0 → 2.2.0 |
| Reexigência de configuração, formato de `settings.json` alterado, código reorganizado com efeito visível, launcher novo | `MAJOR` — 2.1.0 → 3.0.0 |

Se a fase do `ROADMAP.md` reestrutura o código ou muda a configuração, é MAJOR. Pergunta antes de decidir: subir de versão é barato, descer é trabalho.

## Procedimento

1. **Confirma que está tudo verde**: `node .opencode/scripts/verificar.mjs`. Erros → pára.
2. **Confirma o que entra**: `git log --oneline v<anterior>..HEAD` e `git tag`. Cada bullet do changelog tem de corresponder a um commit real. Sem inventar funcionalidades.
3. **Actualiza a versão** em `package.json` (campo `version`) e `npm install --package-lock-only` para o lock ficar coerente. `package.json` e `package-lock.json` no mesmo commit.
4. **Escreve o `CHANGELOG.md`** (não existe ainda neste projeto; cria-o na raiz, estilo Keep a Changelog):
   ```markdown
   ## [3.0.0] - AAAA-MM-DD

   ### Adicionado
   - `feat(bot)`: reconexão automática com recuo exponencial

   ### Alterado
   - `refactor(bot)`: código reorganizado em `src/`

   ### Corrigido
   - `fix(lang)`: mensagem de erro ao carregar um idioma inexistente
   ```
   Ordem: Adicionado → Alterado → Corrigido → Removido. Uma linha por commit relevante, em português europeu. Referencia versões anteriores como links no fim, se fizer sentido.
5. **Actualiza o README** se houver mudança visível para quem instala (skill `documentacao`).
6. **Commit** (skill `commit`): `chore(deps): versão 3.0.0` para o `package.json`, e `docs(readme): changelog da 3.0.0` para o `CHANGELOG.md`.
7. **Etiqueta**, depois do commit: `git tag -a v3.0.0 -m "3.0.0"` e mostra `git tag -n` + `git log --oneline -1`.
8. **Push** (autorização permanente de 2026-09-29): `git push` e `git push --tags` para o branch de trabalho, reportando o que foi. Sem `--force`. A etiqueta só vai para o remoto depois de o commit estar lá — nunca a etiqueta primeiro.

## Limites

- `package.json` só é alterado aqui no campo `version`. Dependências são da skill `commit` (escopo `deps`).
- Etiqueta em commit já enviado: não apagues a tag. Cria outra e anota a substituição no `PROGRESSO.md`.
- Nada de `--force` em tags nem em branches.
- O `CHANGELOG.md` é para utilizadores; o histórico técnico fica no `PROGRESSO.md`.
- Se a versão mudar por causa de uma ideia (`IDEIAS.md` marca-a 📦 com a tag), actualiza a entrada da ideia — isso é da skill `ideias`.

## No fim

Diz: versão, etiqueta, número de commits abrangidos, e se fizeste push. Deixa escrito no `PROGRESSO.md` (skill `progresso`) o que foi lançado e o que fica para a fase seguinte do `ROADMAP.md`.
