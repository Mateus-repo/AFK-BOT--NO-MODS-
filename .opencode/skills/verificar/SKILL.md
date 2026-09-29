---
name: Verificar
description: Corre as verificações automáticas do projeto (sintaxe, pacote, segredos, chaves de idioma, higiene do git, documentação, coerência do AGENTS.md e compatibilidade com a versão mínima de Node) e interpreta o resultado, dizendo o que bloqueia o commit e o que é só aviso. Usar quando o utilizador diz "verifica", "checa se está tudo bem", "isto está partido", "faz as verificações", antes de fechar sessão ou antes de um commit importante. Dona dos scripts em .opencode/scripts/. Não usar para corrigir o que for encontrado (cada problema tem skill própria) nem para fazer commit.
---

# Verificar

Verificações determinísticas, sem dependências, só de leitura. Não corrigem nada: descrevem o estado para o utilizador decidir.

## Correr

```bash
node .opencode/scripts/verificar.mjs           # relatório legível
node .opencode/scripts/verificar.mjs --rapido  # só erros
node .opencode/scripts/verificar.mjs --json    # saída estruturada
```

Saída: `0` sem erros · `1` com erros. Avisos não afetam o código de saída.

## O que cada verificação faz

| Bloco | Erro quando | Aviso quando |
|---|---|---|
| estrutura / git | não há `.git` | — |
| package | falta `package.json`, `main` aponta para nada, JSON inválido | versão fora de `X.Y.Z`, sem `license`, sem lock, sem `node_modules` |
| sintaxe | algum `.js` da raiz não compila | não há `.js` na raiz |
| segredos | token, chave privada, senha, e-mail com credenciais | — |
| idioma | chave usada em `index.js` que falta num `lang/*.txt`, linha sem `=` | chave duplicada, chave só num ficheiro |
| higiene | `logs/`, `node_modules/`, `*.exe`, `*.msi`, `.idea/`, `settings.json` ou `launcher_accounts.json` versionados | falta uma entrada no `.gitignore` |
| documentação | — | comando sem menção no README, `lang/*.txt` não documentado |
| agentes | falta `AGENTS.md`, ou existe skill sem menção no AGENTS.md | falta `PROGRESSO.md` ou `IDEIAS.md` |
| node | algum pacote instalado declara `engines.node` acima do mínimo do projecto | não há `engines.node` no `package.json`; `node_modules` ausente |

## Interpretação (obrigatória)

1. **Erros** → lista-os por bloco e diz **qual skill resolve cada um**:
   sintaxe → a skill de código que estiver a alterar o ficheiro; segredos → `commit` (tirar do stage); idioma → `traducoes` (ficheiros) ou `novo-comando` (código); higiene → `organizar-projeto`; agentes → `organizar-projeto`; node → dependência ou sintaxe acima do Node 14.21.3: ou resolve-se sem subir o mínimo, ou é decisão do utilizador (Windows 7 está em risco).
2. **Avisos** → diz quais são dívida conhecida (cruza com *Problemas conhecidos* do `PROGRESSO.md`) e quais são novos. Não trates aviso como erro.
3. **Erros pré-existentes** → menciona e pergunta se entram no *Problemas conhecidos* (skill `progresso`).
4. **Nunca** inventes um "passou" sem ter corrido o comando. Se não conseguiste correr (Node em falta, script apagado), diz isso.

## Ficheiros do kit

- `.opencode/scripts/verificar.mjs` — orquestra as 7 verificações.
- `.opencode/scripts/check-secrets.mjs` — segredos; `--staged`, `--files`, `--json`.
- `.opencode/scripts/lang-keys.mjs` — chaves de idioma; `--falta`, `--json`.
- `.opencode/scripts/verificar-node.mjs` — compatibilidade com a versão mínima de Node (Windows 7 obriga a Node 14.21.3): lê o `engines.node` das dependências instaladas e compila cada ficheiro do projecto com o Node mínimo via `npx node@X.Y.Z --check`. Sem rede, salta a parte da sintaxe com aviso; `--rapido` faz só a parte das dependências.
- `.opencode/scripts/lib/util.mjs` — utilitários partilhados (parse de `key=value`, extração de `t('chave')`, etc.).

Regra de edição: só esta skill altera ficheiros em `.opencode/scripts/`, e o `verificar.mjs` tem de continuar a correr depois da alteração (testa com `--json`).

## Limites

- Não arranjes nada. A skill que arranja é outra, e só depois de o utilizador decidir.
- Não corras o bot (`node index.js`) para "verificar se funciona": reescreve `settings.json` e liga-se a servidores reais.
- Para testes manuais do bot, o ficheiro é o `PROGRESSO.md` que diz qual é o procedimento atual.
