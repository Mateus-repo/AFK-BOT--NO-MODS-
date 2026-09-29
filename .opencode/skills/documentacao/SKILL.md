---
name: Documentação
description: Mantém a documentação para utilizadores — README.md (inglês) e README.pt.md (português), sempre sincronizados entre si e com o comportamento real do bot. Usar quando o utilizador diz "atualiza o README", "documenta", "explica como se instala", "faltou explicar o comando", ou quando um comando, opção ou fluxo novo precisa de ser descrito. Dona exclusiva de README.md, README.pt.md e LICENSE (esta última só a pedido explícito). Não usar para o diário interno (skill `progresso`) nem para notas de versão (skill `lancar-versao`).
---

# Documentação

Dois READMEs, uma verdade. Qualquer alteração a um tem de entrar no outro no mesmo dia: português em `README.pt.md`, inglês em `README.md`, com a **mesma estrutura de títulos** e o mesmo conteúdo.

## Estrutura (manter esta ordem nos dois)

1. Título + linha de tradução (o link entre os dois READMEs).
2. `## Description` — o que é, o que faz, para quem é.
3. `## Prerequisites` — software, versões mínimas (Node), e como instalar dependências.
4. `## Installation` — obter o projeto, `npm install`, configurar o `settings.json` (com exemplo completo), e o que **não** se versiona.
5. `## Languages` — ficheiros em `lang/`, formato `key=value`, como mudar o idioma.
6. `## Available Commands` — uma subsecção por comando, com o que faz e um exemplo real.
7. Secção do launcher em C++ (`run.cpp`) e como compilar.
8. Auditoria e contactos (os links do autor: YouTube, Twitch, X, Modrinth, CurseForge).
9. Licença.

## Regras

- **Comandos**: a lista tem de bater certo com o `switch (cmd)` de `index.js`. Depois de mexeres em `index.js` (ou com a skill `novo-comando`), confirma com `node .opencode/scripts/verificar.mjs` — o bloco *documentação* avisa se houver comandos sem README.
- **Idiomas**: se acrescentares `lang/novo.txt`, documenta-o nos dois READMEs.
- **Exemplos**: `settings.json` de exemplo é sempre com valores falsos e neutros (`play.example.com`, `bot_exemplo`). Nunca copies o `settings.json` real para a documentação.
- **Sem promessas**: nada de "funciona em todos os servidores" sem qualificar. Onde houver limite (versões, autenticação, mods), escreve o limite — é o que a skill `modded` documenta em `docs/modded.md` e que aqui se resume com uma linha e um link.
- **Sem segredos**: nem tokens, nem e-mails, nem contas.
- Mantém os READMEs curtos: são instruções de instalação, não um manual. Detalhe técnico → `PROGRESSO.md` ou `ROADMAP.md`.
- Preserva os finais de linha do ficheiro. Se o diff mostrar o ficheiro inteiro, estás a mudar o EOL.

## No fim

Confirma que ambos os READMEs têm o mesmo número de títulos `###` e a mesma lista de comandos. Depois passa à skill `commit`, escopo `readme`.
