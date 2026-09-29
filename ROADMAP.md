# Roadmap

## Visão

Um bot AFK que **entra em quantos mais servidores possível** — incluindo servidores com mods — e que, quando não entra, explica exactamente porquê. Cada versão é pequena, verificável e reversível.

Objectivo de longo prazo (utilizador): *o bot tem de conseguir entrar em qualquer servidor, mesmo com mods.*

## Requisitos transversais (não negociáveis)

Registados a 2026-09-29 pelo dono do projecto. **Nenhuma fase pode quebrar isto** — qualquer alteração que obrigue a subir o mínimo de Node, o Windows mínimo ou a versão de Java tem de dizer isso antes de ser feita.

| # | Requisito | Como se garante |
|---|---|---|
| R1 | Correr em **Windows 7** (e Windows 10/11) | mínimo de Node **14.21.3** declarado em `package.json` (`engines.node`) e verificado por `verificar-node.mjs`; o launcher tem de instalar o Node certo conforme o Windows |
| R2 | Funcionar nas **versões mais recentes do Minecraft** | matriz de versões testada e documentada; nada de fixar a versão no código; `src/versoes.js` prepara versões que a biblioteca ainda não conhece |
| R3 | Funcionar com **mods de qualquer loader** (Forge, Fabric, NeoForge) | Fase 4 (sidecar local Via) + `docs/modded.md`; "por testar" é escrito até haver teste |

Mínimo de Node em uso neste branch: **14.21.3** (última série do Node com suporte oficial a Windows 7). Estado verificado: nenhuma das 156 dependências declara um `engines.node` acima de 14.21.3, e todos os ficheiros compilam com o Node 14.21.3.

**Atenção — o outro branch usa um caminho diferente.** O branch `Tests` (código do amigo do dono do projecto) funciona em Windows 7 com o **Node 18.20.8 x86** e `NODE_SKIP_PLATFORM_CHECK=1`, com `mineflayer ^4.39.0`. Ou seja: R1 tem duas respostas concorrentes e **nenhuma foi testada com o Mineflayer real**. Decidir qual fica, e com teste, antes de prometer o mínimo.

---

## Fase 1 · Restaurar a base na raiz · estado: **feito em 2026-09-29**

> Esta fase restaurou o código que estava em `old-deprecated-10.1/`. Em 2026-09-29 descobriu-se que existe **outro branch, `Tests`, com uma implementação diferente e mais recente** — ver *Decisões estruturais* e `IDEIAS.md` (I-008). A escolha da base é uma decisão do dono do projecto. · dona: `organizar-projeto`

- **Objectivo**: ter o projeto a funcionar de facto na raiz, com o repositório limpo, antes de mexer em mais nada.
- **Inclui**: mover `index.js`, `lang/`, `package.json`, `package-lock.json`, `default.json`, `run.cpp`, `LICENSE` e `dependabot.yml` (→ `.github/`) de `old-deprecated-10.1/` para a raiz com `git mv`; decidir o destino de `.replit`/`replit.nix`; escrever o `.gitignore` completo; retirar do índice binários (`run.exe`, `*.msi`), `.idea/`, `logs/` e o `settings.json` antigo; alinhar os READMEs com o que existe mesmo.
- **Fora**: qualquer alteração de comportamento do bot. Esta fase não muda uma linha de lógica.
- **Pronto quando**: `node .opencode/scripts/verificar.mjs` sem erros · `node .opencode/scripts/lang-keys.mjs` diz OK · `npm install` completa · os READMEs listam os comandos que existem em `index.js` · `old-deprecated-10.1/` só com o que foi decidido ficar.
- **Riscos**: `old-deprecated-10.1/` é a **única cópia** do código actual. Mitigação: `git mv` (reversível), nunca `mv`; nenhum `rm` sem aprovação; confirmar o histórico antes de apagar qualquer coisa.

## Fase 2 · Blindar o núcleo · estado: **em curso** · dona: código (a dividir entre `modded` para a ligação e as restantes para o resto)

> **Feito em 2026-09-29:** configuração validada e escrita sem perder campos (`src/config.js`), reconexão com recuo exponencial (`src/reconnect.js`), idiomas (`src/i18n.js`) e log (`src/log.js`) extraídos do `index.js`, 35 testes que correm sem servidor (`npm test`), `replit.nix` com Node actualizado.
> **Bug encontrado pelos testes:** depois de `/changeserver` ou `/changename`, o bot voltava a ligar com os valores antigos, porque a configuração em `index.js` deixou de ser o mesmo objecto que a do módulo. Corrigido.
> **Falta:** mover `createBot()` e os comandos para módulos próprios (a composição continua no `index.js`), e **um teste a correr contra um servidor a sério** — os testesArrancados usam Mineflayer simulado.

- **Objectivo**: o bot não perde configuração, não rebenta com ficheiros inválidos e volta sozinho quando a ligação cai.
- **Inclui**: validação e valores por omissão ao ler `settings.json`; reescrita do ficheiro que **preserve campos desconhecidos** (hoje `changeServer()` regrava o ficheiro inteiro); reconexão automática com recuo exponencial e limite de tentativas; diagnóstico nos eventos `kicked` e `end`; separação do `index.js` monolítico em módulos pequenos (configuração, idiomas, log, ligação, comandos) — só depois da Fase 1 estar verde.
- **Fora**: deteção automática de versão, mods, Via, novos comandos.
- **Pronto quando**: derrubar a ligação leva o bot a voltar sozinho com recuo visível no log · um `settings.json` incompleto ou inválido não trava o arranque (cai no `default.json` e avisa) · o `verificar.mjs` sem erros.
- **Riscos**: a reescrita de `settings.json` toca em quem já usa o bot → se o formato mudar, é MAJOR (skill `lancar-versao`).

## Fase 3 · Detectar a versão e falhar bem · estado: **por fazer** · dona: `modded`

- **Objectivo**: entrar em servidores vanilla de várias versões sem configuração, e dizer com clareza porque é que não entrou.
- **Inclui**: `"version": "auto"` no `settings.json`, com detecção da versão do servidor antes de ligar; `minecraft-data` declarado no `package.json` e usado para mapear versões (hoje é dependência sem uso); mensagem clara quando o servidor usa ViaVersion/ViaFabric; tradução dos erros de protocolo mais comuns para os `lang/*.txt`; comando `/diagnostico` que imprime versão, atraso, autenticação e último erro.
- **Fora**: servidores modded (é a Fase 4) e plugins com pacotes customizados não suportados.
- **Pronto quando**: `/changeserver ip:porta` sem versão entra num 1.8, 1.12, 1.16, 1.20 e 1.21 de teste · o `/diagnostico` identifica a versão real do servidor · nenhuma mensagem de erro contém texto em inglês cru vindo do protocolo.
- **Riscos**: a versão reportada pelo servidor nem sempre é a do protocolo (proxy por trás); a matriz de versões suportadas pelo Mineflayer muda com o tempo — fica escrita na documentação, não no código.

## Fase 4 · Compatibilidade com mods · estado: **decidido (sidecar local Via), por implementar** · dona: `modded`

> **Base escolhida em 2026-09-29 pelo dono do projecto: este branch.** O patch do 26.3 do outro branch foi portado e reescrito para `src/versoes.js`, com 17 testes.
>
> Conflito conhecido com R1: o Java necessário para o Via e para o Minecraft 1.20.5+ é o Java 21, e o **Java 8 é o último que corre em Windows 7**. Num PC com Windows 7, o sidecar pode só conseguir falar com servidores de versões mais antigas. **Por confirmar** — ver `IDEIAS.md` (I-001) e `docs/modded.md`.

- **Objectivo**: entrar em servidores Forge/Fabric/NeoForge, ou explicar com precisão porque que não é possível e o que o utilizador pode fazer.
- **Inclui**: o sidecar local Via, decidido pelo utilizador em 2026-09-29 (ideia I-001): um processo Java em `localhost` converte o protocolo e o bot liga-se a esse proxy. Continua a fazer parte desta fase: documentar ViaVersion no servidor como o caminho mais simples, para quem não queira instalar nada; mensagens de diagnóstico; secção `docs/modded.md`; resumo nos READMEs. O desenho está em `docs/modded.md`.
- **Fora**: substituir o Mineflayer; mods que o cliente precise mesmo de processar (blocos, itens e MEC customizados não são necessários para um bot AFK, mas isso **tem de ser confirmado**).
- **Pronto quando**: existe um caminho escolhido e registado como decisão, e um servidor modded de teste onde o bot entre (ou, no caminho (a), documentação com instruções testadas por outra pessoa).
- **Riscos**: exige Java no computador do utilizador; **em Windows 7 o Java disponível é o 8, que não serve para o Via actual nem para o Minecraft 1.20.5+** (R1 × R2 × R3 não cabem juntos nesse caso); o sidecar ocupa cerca de 100 MB; a licença dos jars do Via obriga a não os redistribuir no repositório; alguns servidores expulsam bots por anti-cheat — isso não é um problema de protocolo; nada disto foi testado com um servidor modded real.

## Fase 5 · Qualidade e lançamento da 3.0 · estado: **por fazer** · dona: `commit` + `lancar-versao` + `documentacao`

- **Objectivo**: lançar uma versão que outra pessoa instale sem ajuda.
- **Inclui**: testes de caracterização (pelo menos: carga de idiomas, escrita de configuração, parsing de comandos), READMEs sincronizados, `CHANGELOG.md`, `settings.json` com campos novos documentados, etiqueta git.
- **Fora**: funcionalidades novas.
- **Pronto quando**: a etiqueta está criada, o changelog reflecte os commits reais, e um utilizador novo consegue seguir o README sem perguntas.
- **Riscos**: MAJOR (formato de configuração e estrutura) — tem de ser comunicado com antecedência.

---

## Decisões estruturais

- **2026-09-29** — Uma skill dona cada ficheiro, com matriz de posse no `AGENTS.md`. Motivo: skills que se sobrepõem ساعاتalam-se e o trabalho fica inconsistente.
- **2026-09-29** — A compatibilidade com mods é uma fase própria, não um extra. Motivo: é o objectivo declarado do projecto e tem arquitectura diferente do resto.
- **2026-09-29** — Restaurar o código para a raiz antes de melhorar seja o que for. Motivo: nada pode ser testado com o código arquivado.
- **2026-09-29** — Um comando novo implica sempre três alterações (idioma, código, README). Motivo: comando sem texto traduzido ou sem documentar é dívida.
- **2026-09-29** — Mínimo de Node fixado em **14.21.3** (R1), declarado no `package.json` e verificado automaticamente. Motivo: o Node 14 é a última série com suporte oficial a Windows 7. **Revisto depois:** o branch `Tests` usa Node 18.20.8 x86 com `NODE_SKIP_PLATFORM_CHECK=1`, e essa via tem de ser testada antes de se decidir.
- **2026-09-29** — **Este branch é a base.** O do outro autor fica como fonte de peças: o patch do 26.3 foi portado (e reescrito, com testes), e o multi-bot e o movimento anti-AFK estão por portar. Motivo: o dono do projecto preferiu esta implementação.
- **2026-09-29** — O `package.json` dita a dependência principal do projecto: `mineflayer`, `minecraft-data` (para versões) e o launcher quando existir. Motivo: as dependências transitivas do Mineflayer são o que dá acesso a `prismarine-*`; o resto entra por ser preciso.
- **2026-09-29** — O roadmap só aponta para o `PROGRESSO.md` e para o `IDEIAS.md`; nunca duplica tarefas. Motivo: dois sítios com a mesma lista divergem.
- **2026-09-29** — Para servidores com mods ficamos com o **sidecar local Via** (ideia I-001), e não com a documentação de ViaVersion no servidor. Motivo: o utilizador escolheu a opção que não depende do dono do servidor. A documentação de ViaVersion no servidor fica como alternativa a explicar.
- **2026-09-29** — Nada entra no repositório depois de um commit sem passar por `verificar.mjs`. Motivo: o verificador apanhou duas chaves de idioma em falta e um falso positivo do detector de segredos no caminho — sem ele, iam para o remoto.
