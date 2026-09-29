---
name: Organizar projeto
description: Organiza a estrutura do projeto — inventaria ficheiros, propõe um plano (manter, mover, fundir, ignorar no git, apagar) e só executa depois de aprovado. Atualiza o AGENTS.md e a tabela de skills. Usar quando o utilizador diz "organiza o projeto", "limpa isto", "está desarrumado", "onde devia ficar este ficheiro", "há ficheiros a mais", "atualiza o .gitignore" ou pede para mover, renomear ou apagar ficheiros. Dona da estrutura, do .gitignore e do AGENTS.md. Não usar para fazer commit (skill `commit`) nem para editar o conteúdo dos READMEs (skill `documentacao`).
---

# Organizar projeto

Mexer em ficheiros aqui é arriscado: o código e o launcher esperam certos ficheiros em sítios exactos. Fluxo sempre **inventariar → propor → esperar aprovação → executar → verificar**.

Lê `references/mapa-do-projeto.md` (mapa observado, quotas de edição e recomendações).

## Intocáveis (nunca mover nem renomear sem alterar código)

`index.js` · `settings.json` · `default.json` · `launcher_accounts.json` · `package.json` · `package-lock.json` · `lang/` (e os `.txt` lá dentro) · `run.cpp` · `README.md` · `README.pt.md` · `LICENSE`.

Motivo: `index.js` resolve-os com `__dirname` e `run.cpp` procura `index.js`, `settings.json` e `lang/` na pasta onde corre. Mudar um destes já é mexer em código, não em estrutura.

## Procedimento

1. **Inventariar.** `git ls-files`; se não houver git, lista os ficheiros ignorando `node_modules/`.
2. **Classificar** cada item suspeito: *Manter* · *Mover* (para onde) · *Fundir* (duplicado de quê) · *Ignorar no git* · *Apagar*. Uma linha de justificação por item.
3. **Propor o plano** em tabela (`Ficheiro | Ação | Destino | Motivo | Risco`) e terminar com a pergunta do que fica aprovado. **Não mexas em nada antes da resposta.**
4. **Executar só o aprovado.** `git mv` para ficheiros versionados, `mv` nos outros. Um tipo de alteração de cada vez, para ser reversível.
5. **Corrigir referências** aos caminhos movidos (READMEs, `.replit`, comentários no código). Se a correção for só documentação, entrega-a à skill `documentacao`; se for código, é código.
6. **Verificar** com a skill `verificar`. Se piorou, desfaz a alteração.
7. **Guardar** com a skill `commit`, escopo `projeto`, um commit por tipo de alteração.

## Regras

- **Apagar exige aprovação explícita**, por ficheiro ou por lista. "Organiza" não autoriza apagar. Em caso de dúvida, mover para `arquivo/` em vez de apagar.
- Nunca toques em `node_modules/`, `.git/`, `logs/` ou `.idea/` sem perguntar — podem ter o único registo de um problema.
- Nunca mostres o conteúdo de `settings.json` nem de `launcher_accounts.json`; basta dizer se têm dados preenchidos.
- **`.gitignore`**: edita aqui. **Acrescenta, não substituas.** Preserva os finais de linha do ficheiro. Um ficheiro já versionado continua versionado depois de entrar no `.gitignore`; para o retirar do git usa `git rm --cached` (com aprovação).
- **`.opencode/skills/`**: criar, renomear ou apagar uma skill é uma alteração desta skill, e o `AGENTS.md` muda **na mesma alteração** (o `verificar.mjs` falha se ficarem desincronizados). Cada `SKILL.md` tem de dizer de que ficheiros é dona.
- **Pastas novas** só se resolverem um problema real. Este projeto é pequeno: não inventes `src/`, `docs/` ou `config/` por "boas práticas".
- Ao tocar em `old-deprecated-10.1/`, lembra que é o arquivo da v2.1 e a única cópia do código actual.

## Saída

O plano em tabela (passo 3) e, no fim, o que foi feito e o que ficou pendente.
