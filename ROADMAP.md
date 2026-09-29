# Roadmap

## Visão

Um bot AFK que **entra em quantos mais servidores possível** — incluindo servidores com mods — e que, quando não entra, explica exactamente porquê. Cada versão é pequena, verificável e reversível.

Objectivo de longo prazo (utilizador): *o bot tem de conseguir entrar em qualquer servidor, mesmo com mods.*

---

## Fase 1 · Restaurar a base na raiz · estado: **feito em 2026-09-29** · dona: `organizar-projeto`

- **Objectivo**: ter o projeto a funcionar de facto na raiz, com o repositório limpo, antes de mexer em mais nada.
- **Inclui**: mover `index.js`, `lang/`, `package.json`, `package-lock.json`, `default.json`, `run.cpp`, `LICENSE` e `dependabot.yml` (→ `.github/`) de `old-deprecated-10.1/` para a raiz com `git mv`; decidir o destino de `.replit`/`replit.nix`; escrever o `.gitignore` completo; retirar do índice binários (`run.exe`, `*.msi`), `.idea/`, `logs/` e o `settings.json` antigo; alinhar os READMEs com o que existe mesmo.
- **Fora**: qualquer alteração de comportamento do bot. Esta fase não muda uma linha de lógica.
- **Pronto quando**: `node .opencode/scripts/verificar.mjs` sem erros · `node .opencode/scripts/lang-keys.mjs` diz OK · `npm install` completa · os READMEs listam os comandos que existem em `index.js` · `old-deprecated-10.1/` só com o que foi decidido ficar.
- **Riscos**: `old-deprecated-10.1/` é a **única cópia** do código actual. Mitigação: `git mv` (reversível), nunca `mv`; nenhum `rm` sem aprovação; confirmar o histórico antes de apagar qualquer coisa.

## Fase 2 · Blindar o núcleo · estado: **por fazer** · dona: código (a dividir entre `modded` para a ligação e as restantes para o resto)

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

- **Objectivo**: entrar em servidores Forge/Fabric/NeoForge, ou explicar com precisão porque que não é possível e o que o utilizador pode fazer.
- **Inclui**: o sidecar local Via, decidido pelo utilizador em 2026-09-29 (ideia I-001): um processo Java em `localhost` converte o protocolo e o bot liga-se a esse proxy. Continua a fazer parte desta fase: documentar ViaVersion no servidor como o caminho mais simples, para quem não queira instalar nada; mensagens de diagnóstico; secção `docs/modded.md`; resumo nos READMEs. O desenho está em `docs/modded.md`.
- **Fora**: substituir o Mineflayer; mods que o cliente precise mesmo de processar (blocos, itens e MEC customizados não são necessários para um bot AFK, mas isso **tem de ser confirmado**).
- **Pronto quando**: existe um caminho escolhido e registado como decisão, e um servidor modded de teste onde o bot entre (ou, no caminho (a), documentação com instruções testadas por outra pessoa).
- **Riscos**: exige Java no computador do utilizador; o sidecar ocupa cerca de 100 MB; a licença dos jars do Via obriga a não os redistribuir no repositório; alguns servidores expulsam bots por anti-cheat — isso não é um problema de protocolo; nada disto foi testado com um servidor modded real.

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
- **2026-09-29** — O roadmap só aponta para o `PROGRESSO.md` e para o `IDEIAS.md`; nunca duplica tarefas. Motivo: dois sítios com a mesma lista divergem.
- **2026-09-29** — Para servidores com mods ficamos com o **sidecar local Via** (ideia I-001), e não com a documentação de ViaVersion no servidor. Motivo: o utilizador escolheu a opção que não depende do dono do servidor. A documentação de ViaVersion no servidor fica como alternativa a explicar.
- **2026-09-29** — Nada entra no repositório depois de um commit sem passar por `verificar.mjs`. Motivo: o verificador apanhou duas chaves de idioma em falta e um falso positivo do detector de segredos no caminho — sem ele, iam para o remoto.
