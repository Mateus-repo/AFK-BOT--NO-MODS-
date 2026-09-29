## 💡 Novas

### I-007 · Instalar o Node certo conforme o Windows

- Estado: 💡 Nova · Registada: 2026-09-29
- O quê: o `run.cpp` (ou um script novo) detecta a versão do Windows e instala o Node 14.21.3 no Windows 7 e o Node actual no Windows 10/11, em vez de instalar sempre o Node 22, que não corre no 7.
- Porquê: requisito R1. Hoje o launcher nem sequer tem o MSI de que precisa, e mesmo com ele não funcionaria em Windows 7.
- Esforço: M · Impacto: alto
- Toca em: `run.cpp`, READMEs, `package.json`
- Notas: o MSI tem de ser descarregado de uma URL por plataforma (ou instalado a partir do `npx node@X`, que dá um Node portátil sem instalador — mais simples e sem privilégios de administrador). Ideia ligada a I-006.

### I-008 · Juntar as duas implementações

- Estado: ✅ Aprovada · Registada: 2026-09-29 · Decidida: 2026-09-29
- Decisão: **a base é este branch.** O outro (`Tests`) passa a ser fonte de peças, não base.
- Feito: o patch do 26.3 já foi portado para `src/versoes.js` e reescrito para ser testável.
- Falta portar: multi-bot e movimento anti-AFK.
- O quê: o branch `Tests` (código do amigo) e o branch de trabalho têm o mesmo objectivo e resoluções muito diferentes. Decidir a base e portar o que falta de uma para a outra.
- Porquê: o `Tests` tem multi-bot, movimento anti-AFK, tempo limite de ligação e um patch à mão para o Minecraft 26.3; este branch tem configuração validada, três idiomas, 16 comandos, reconexão, 35 testes e a ferramenta de verificação. Nenhum dos dois tem tudo.
- Esforço: L · Impacto: alto
- Toca em: `index.js`, `src/`, `package.json`, `default.json`, READMEs
- Notas: o `Tests` foi verificado a arrancar (sem servidor, com Mineflayer simulado) e funciona; o `settings.json` dele está versionado com um servidor a sério, o que não se repete. Decisão do dono do projecto: (a) base = `Tests` e trazer a nossa infra-estrutura, (b) base = nossa e portar multi-bot + movimento + o patch 26.3, (c) manter os dois em paralelo durante um tempo.

### I-009 · Patch do Minecraft 26.3

- Estado: 📦 Feita · Registada: 2026-09-29 · Feita: 2026-09-29 — `src/versoes.js`, 17 testes
- O quê: o `Tests` obriga a biblioteca `minecraft-data` a aceitar a versão 26.3 (que ainda não existe nos dados), remapeando os identificadores de pacote do protocolo e forçando o carregador de chunks. Foi escrito à mão e não tem teste.
- Porquê: é o que permite entrar nas versões mais recentes (R2) sem esperar pela biblioteca.
- Esforço: M · Impacto: alto
- Toca em: `index.js` (ou `src/versoes.js`), `package.json`
- Riscos: remapear pacotes à mão parte quando o formato muda; `teleport_confirm` deixa de bater certo e o bot não entra. Precisa de teste, e o `auth: offline` dele também merece revisão.
- Notas: antes de decidir, confirmar com o dono do projecto se o 26.3 é mesmo o alvo ou se basta a última versão que a biblioteca já supporta.

### I-002 · Vários bots, um por servidor

- Estado: 💡 Nova · Registada: 2026-09-29
- O quê: um processo a gerir várias contas, cada uma ligada a um servidor, com estado individual e comando para listar e parar.
- Porquê: quem usa bot AFK normalmente quer vários servidores ao mesmo tempo.
- Esforço: L · Impacto: alto
- Toca em: `launcher_accounts.json`, `index.js`, `default.json`, `lang/*.txt`
- Riscos: multiplica o risco de sermos expulsos por anti-cheat e de confundir problemas entre instâncias. Muda a forma de correr o bot, logo é uma MAJOR.

### I-003 · Painel de estado (HTTP)

- Estado: 💡 Nova · Registada: 2026-09-29
- O quê: um painel local com o estado de cada ligação (servidor, versão, atraso, situação, último erro).
- Porquê: `express` já é dependência declarada no `package.json` e não é usado em lado nenhum — ou passa a usar-se, ou sai de lá.
- Esforço: M · Impacto: médio
- Toca em: `index.js`, `package.json`, READMEs
- Notas: resolver primeiro a I-002; sem vários bots, o painel é uma página com uma linha.

### I-004 · Ligar através de proxy (Velocity / BungeeCord)

- Estado: 💡 Nova · Registada: 2026-09-29
- O quê: entrar em servidores que exigem encaminhamento por proxy, incluindo a opção de encaminhamento no `createBot()`.
- Porquê: muitos servidores públicos passam hoje por Velocity; sem isto, o bot falha em parte deles.
- Esforço: S · Impacto: médio
- Toca em: `index.js` (`createBot`), `default.json`, `lang/*.txt`
- Riscos: o encaminhamento de proxy é um campo opcional do protocolo; é preciso confirmar exactamente o que o Mineflayer envia.

### I-005 · Modo silencioso durante a reconexão

- Estado: ⏸️ Adiada · Registada: 2026-09-29
- O quê: uma opção que escreve só no log, sem imprimir no terminal enquanto o bot anda a reconectar sozinho.
- Porquê: quem deixa o bot a correr dias no terminal não quer o ecrã cheio de tentativas.
- Esforço: S · Impacto: baixo
- Motivo de estar adiada: a reconexão automática ainda não existe (Fase 2 do roadmap). Esta ideia só faz sentido depois de a vermos a acontecer.

### I-006 · Corrigir ou descontinuar o launcher de C++

- Estado: 💡 Nova · Registada: 2026-09-29
- O quê: o `run.cpp` procura `nodeMsi/node-v22.16.0-x64.msi`, que não está no repositório, e instala o Node de forma fixa. Ou passa a descarregar o instalador certo e a verificar a versão, ou o launcher é descontinuado em favor de um script.
- Porquê: hoje um utilizador novo não consegue usar o launcher tal como está.
- Esforço: M · Impacto: médio
- Toca em: `run.cpp`, READMEs
- Notas: decidir se o launcher continua a existir é decisão de produto, não de técnica.

---

## 🔍 A avaliar

_(as em avaliação estão listadas acima, na secção 💡 Novas, com o estado no cabeçalho)_

## ✅ Aprovadas

### I-001 · Sidecar local Via para servidores com mods

- Estado: ✅ Aprovada · Registada: 2026-09-29 · Aprovada: 2026-09-29
- O quê: correr um processo Java local (ViaVersion/Via) em `localhost` que converte o protocolo do servidor modded para vanilla, e ligar o bot a esse proxy. Assim o bot entra em servidores Forge/Fabric sem depender de o dono do servidor instalar Via.
- Porquê: hoje o bot só entra em servidores vanilla, e este é o objectivo declarado para a nova versão.
- Esforço: M · Impacto: alto
- Toca em: `index.js` (camada de ligação), `default.json` (nova secção `modded`), `lang/*.txt`, `docs/modded.md`
- Riscos: exige Java instalado; cerca de 100 MB de jars que **não** podem ser versionados; arranque mais lento; a licença dos jars obriga a não os redistribuir.
- Notas: o utilizador escolheu este caminho em 2026-09-29 porque não depende do dono do servidor. A documentação de ViaVersion no servidor fica como alternativa, dentro da mesma fase do roadmap.
- Conflito a resolver: em **Windows 7** só há Java 8, e o Via actual e o Minecraft 1.20.5+ precisam de Java 21. Ou se aceita que o Windows 7 fique só para servidores vanilla antigos, ou se procura um Via antigo que funcione com Java 8, ou se abandona o Java no Windows 7. **Por decidir com o utilizador.**
- Decisão: implementa-se na Fase 4 do `ROADMAP.md`. Desenho em `docs/modded.md`.

## ⏸️ Adiadas

As adiadas estão listadas acima, na secção 💡 Novas, com o motivo — uma ideia não sai do ficheiro quando é adiada.

## ❌ Rejeitadas

_(nada)_

## 📦 Feitas

_(nada)_
