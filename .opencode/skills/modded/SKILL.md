---
name: Modded
description:Trata da compatibilidade do bot com servidores que não são vanilla — pesquisa de viabilidade,ViaVersion, proxies locais, deteção de versão, reconexão e a camada de transporte. Usar quando o utilizador diz "e se o servidor tiver mods", "entra em servidores com mods", "Forge", "Fabric", "NeoForge", "Pixelmon", "modrinth", "qualquer servidor" ou quando uma fase do ROADMAP.md sobre compatibilidade está em curso. Dona de docs/modded.md e da camada de ligação (createBot e transportes). Não usar para comandos do terminal (skill `novo-comando`) nem para ideias ainda por decidir (skill `ideias`).
---

# Modded

Objectivo do projeto: **o bot tem de conseguir entrar em quantos servidores for possível, mesmo com mods**. Esta skill trata disso com honestidade técnica — o que é possível em Node puro e o que exige um processo auxiliar.

## O que a realidade permite (verificar antes de prometer)

| Situação | Node puro (mineflayer) | Observação |
|---|---|---|
| Servidor vanilla, versões suportadas | ✅ | caminho actual |
| Servidor com ViaVersion/ViaFabric (1.8 → 1.20) | ✅ | o servidor converte; o bot fala o protocolo de baixo |
| Servidor com plugins (Bukkit, Spigot, Paper) | ✅ em geral | plugins que mandam packets customizados podem falhar |
| Servidor **modded** (Forge, Fabric, NeoForge) | ❌ | o servidor usa registos e payloads que o mineflayer não conhece |
| Servidor com anti-cheat agressivo | ⚠️ | pode expulsar bots; não é um problema de protocolo |

Para modded há três caminhos, por ordem de custo:

1. **ViaVersion no servidor** — o dono do servidor instala. Não é nosso, mas é o que resolve mais casos e é o que se deve documentar primeiro.
2. **Sidecar local** — um processo Java (ViaVersion/Via) a correr em `localhost` que converte o protocolo para vanilla, e o mineflayer liga-se a esse proxy. É a solução que torna o bot utilizável em servidores modded sem depender do dono. Custo: Java + ficheiros do Via, ~100 MB, arranque de alguns segundos.
3. **Cliente modded a sério** (cliente Java headless com mods) — muito mais pesado, pouca vantagem para um bot que só quer ficar AFK. Só com exigência explícita do utilizador.

**Nenhuma destas se decide aqui.** Vão para `IDEIAS.md` (skill `ideias`) e a decisão do utilizador vira uma fase do `ROADMAP.md` (skill `planear-versao`).

## Procedimento

1. **Confirma o terreno**: lê `ROADMAP.md` (fase de compatibilidade), `PROGRESSO.md` e `docs/modded.md`. Descobre o que já foi decidido e o que está por confirmar — não repitas a investigação.
2. **Confirma a viabilidade antes de escrever código**: procura a informação na documentação oficial da biblioteca/dependência e anota a data e a fonte. Se não conseguires confirmar, escreve "por confirmar" e deixa a verificação como tarefa. **Nunca inventes suporte a um protocolo.**
3. **Isola a mudança**: tudo o que diz respeito a *como se liga* fica numa camada só (a função `createBot()` e o que dela sai). Comandos, idiomas e configuração não são tocados por esta skill.
4. **Degrada com elegância**: cada capacidade nova é opcional e desligada por omissão. O bot tem de continuar a funcionar em vanilla exactamente como antes, com a mesma configuração.
5. **Mensagens ao utilizador**: texto novo em `lang/*.txt` via skill `traducoes` (ex.: `error_mods_unsupported`, `modded_proxy_starting`, `modded_proxy_failed`). Diagnóstico de falha de ligação é o que mais importa: versão do servidor, Via detectado ou não, último erro de protocolo.
6. **Verifica**: `node .opencode/scripts/verificar.mjs` e testes manuais descritos no `PROGRESSO.md`, num servidor de testes — nunca no servidor a sério do utilizador.
7. **Documenta** em `docs/modded.md` o que funciona, o que não funciona e como configurar; a skill `documentacao` resume isso nos dois READMEs.

## Regras

- **Nunca inventes** que o bot entra num servidor com mods. Se não foi testado, o README e o `docs/modded.md` dizem "por testar".
- Nada de dependências Java ou binários no repositório. Se o sidecar for a via, os ficheiros vão para `.gitignore` e são descarregados pelo utilizador (ou por um script explícito).
- Tempos e portas: o sidecar tem de ter porta configurável e o log tem de dizer qual. Duas instâncias do bot não podem colidir.
- A autenticação (mojang/microsoft) é partilhada com o resto do bot; não se duplica lógica de sessão.
- Se a solução exigir mudar o `settings.json`, é uma alteração com impacto em quem já tem o bot instalado → passa pela skill `lancar-versao` (MAJOR) e pelo changelog.

## No fim

Diz com clareza: o que passou a funcionar, o que continua por não funcionar, que configuração mudou e o que ficou por testar.
