---
name: Novo comando
description: Acrescenta ou altera um comando do terminal do bot em index.js (a função do comando, o case no switch e a linha de ajuda), com as chaves de idioma correspondentes. Usar quando o utilizador diz "cria o comando /x", "add comando", "quero um /uptime", "muda o que o /ping mostra" ou pede uma funcionalidade no prompt do bot. Dona dos comandos em index.js. Não usar para textos em lang/*.txt (skill `traducoes`), para a documentação (skill `documentacao`) nem para a camada de ligação (skill `modded`).
---

# Novo comando

Um comando novo é sempre **cinco alterações em três owners**. Esta skill faz as duas primeiras; as outras são entregues.

## Anatomia actual (v2.1, `index.js` monolítico)

- `readline` com prompt `'> '`; a linha é dividida por espaços, `parts.shift()` dá `/comando` e o resto são argumentos.
- `switch (cmd)`: um `case '<nome>':` por comando, que chama a função e cai em `rl.prompt()` no fim do `switch`.
- Cada função: valida os argumentos, imprime a resposta já traduzida e, se alterar configuração, grava `settings.json` com `fs.writeFileSync` dentro de `try/catch` e chama `createBot()` quando muda servidor, nome ou versão.
- Textos: `t('chave')` — o valor **nunca** é escrito à mão em português.
- `default:` imprime `t('error_unknown_command')`.

## Ordem de execução (não se salta)

1. **Confirma o que já existe** — `rg` / `Select-String` pelo nome do comando em `index.js`, `lang/*.txt` e `README*.md`. Se já existir, isto é uma alteração, não uma criação.
2. **Chaves de idioma primeiro** (skill `traducoes`): em **todos** os `lang/*.txt`, no mesmo sítio, `cmd_<comando>` (resposta) e `syntax_<comando>` (uso errado). Se o comando precisar de argumento obrigatório e nenhum tiver sido dado, responde com a chave `syntax_`.
3. **Função** no `index.js`, acima do `rl.on('line', ...)`, com o nome em camelCase igual ao comando: `showPing()` para `/ping`.
4. **`case` no `switch`**, e o comando na lista de `showHelp()` (chaves `help_command_<comando>`), se for de uso frequente.
5. **Verificar**: `node .opencode/scripts/verificar.mjs` e `node .opencode/scripts/lang-keys.mjs`. Ambos têm de dizer OK.
6. **Documentar** (skill `documentacao`): subsecção `### /comando` nos dois READMEs, com exemplo.

## Regras de código

- Um comando faz uma coisa. Se precisar de subcomandos, `/x list`, `/x add` — e documenta-se assim.
- Argumentos: valida antes de usar (`newServer.split(':')`, `parseInt(…, 10)`, `startsWith('1.')` para versões). Mensagem de erro = chave `syntax_*` ou `error_*`, nunca texto escrito à mão.
- Estado que o utilizador possa mudar (servidor, nome, versão, idioma, tipo de conta) → grava em `settings.json` dentro de `try/catch` e reconecta, como já faz `changeServer()`.
- Nada de segredos no código, nada de palavras-passe em log.
- Mantém o estilo do ficheiro: `function` declaradas, `console.log` para o terminal, `log()` para o que vai para `logs/latest.log`.
- Nada de dependências novas. Se o comando precisar de uma, isso é uma decisão de versão (skill `planear-versao`), não uma adição local.

## No fim

Diz ao utilizador: comando criado, chaves adicionadas (e em que idiomas), verificações corridas, e o que falta (README). O commit é da skill `commit`, escopo `comandos`, com as chaves de idioma no mesmo commit (são o mesmo motivo) ou em `lang` logo a seguir.
