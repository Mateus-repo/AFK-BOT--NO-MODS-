---
name: Traduções
description: Mantém os ficheiros de idioma em lang/*.txt (chaves, ordem, valores em português europeu e inglês) e garante que todos os idiomas têm exatamente o mesmo conjunto de chaves. Usar quando o utilizador diz "traduz", "acrescenta a mensagem", "falta uma chave", "passa a mensagem para inglês", "erro ao mostrar a mensagem" ou sempre que um comando novo precisar de texto. Dona exclusiva de lang/*.txt. Não usar para escrever a chamada t('chave') no código (skill `novo-comando`) nem para o README (skill `documentacao`).
---

# Traduções

## Formato

Cada linha é `chave=valor`. Linhas vazias e `#` no início são comentários. A chave é ASCII minúscula com `_`. O valor **não** leva aspas e pode ter `=` dentro.

```txt
# Mensagens em Português (pt-pt)
login_success=✅ Bot conectado com sucesso!
error_invalid_version=❌ Versão inválida. Deve começar com "1." (ex.: "1.12.1").
```

Valores com aspas duplas dentro do valor são válidos e já são usadas no projeto.

## Ficheiros

| Ficheiro | Idioma | Nota |
|---|---|---|
| `lang/pt-pt.txt` | Português (Portugal) | lingua principal do autor |
| `lang/eng.txt` | Inglês | o bot escolhe `eng` por omissão se o idioma configurado não existir |
| `lang/en-us.txt` | Inglês (EUA) | inclui chaves do launcher `run.cpp` (`msg_node_install`, `msg_npm_done`, …) |

Novo idioma = ficheiro novo em `lang/` com **o mesmo conjunto de chaves** dos outros, e o `default.json` mantém `"language": "eng"`.

## Procedimento

1. Corre `node .opencode/scripts/lang-keys.mjs` para saber o estado antes de mexer.
2. **Toda a chave nova ou alterada vai para todos os ficheiros**, na mesma posição relativa (agrupada por tema, mesma ordem nos vários idiomas). Um idioma com chaves a mais ou a menos é erro.
3. Valores: português europeu para `pt-pt`, inglês para `eng`/`en-us`. Emoji mantidos, como nos textos existentes.
4. Ao acrescentar um comando novo, o texto vai para `lang/*.txt` **primeiro** (chaves `cmd_<comando>` e `syntax_<comando>`), depois o código passa a usá-las (skill `novo-comando`).
5. Volta a correr `node .opencode/scripts/lang-keys.mjs`. Tem de dar `OK`.
6. Se o valor incluir `%s`, `%d`, `{chave}` ou `\n`, confirma que o código faz a substituição com a mesma ordem de argumentos.

## Regras

- Nunca reescrevas o ficheiro inteiro para acrescentar uma linha: edita só a linha. Um ficheiro reordenado à custa um diff impossível de rever.
- Preserva os finais de linha existentes do ficheiro (verifica com `verificar`/git; se aparecer o ficheiro inteiro como alterado, estás a mudar o EOL).
- Nunca apagues uma chave sem o utilizador dizer que o texto deixou de ser usado, e confirma com `lang-keys.mjs --falta` que o código já não a chama.
- Segredos, IPs de servidores e nomes de contas nunca entram em `lang/`.
- Se a mensagem passar a ser dinâmica (número de jogadores, posição…), escreve a chave e deixa a composição para o código.

## No fim

Devolve o `lang-keys.mjs` limpo ao utilizador e lembra a skill `documentacao` se o novo comando tiver de ser descrito no README.
