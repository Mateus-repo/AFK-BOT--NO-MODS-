## 💡 Novas

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

_(nada)_

## ✅ Aprovadas

### I-001 · Sidecar local Via para servidores com mods

- Estado: ✅ Aprovada · Registada: 2026-09-29 · Aprovada: 2026-09-29
- O quê: correr um processo Java local (ViaVersion/Via) em `localhost` que converte o protocolo do servidor modded para vanilla, e ligar o bot a esse proxy. Assim o bot entra em servidores Forge/Fabric sem depender de o dono do servidor instalar Via.
- Porquê: hoje o bot só entra em servidores vanilla, e este é o objectivo declarado para a nova versão.
- Esforço: M · Impacto: alto
- Toca em: `index.js` (camada de ligação), `default.json` (nova secção `modded`), `lang/*.txt`, `docs/modded.md`
- Riscos: exige Java instalado; cerca de 100 MB de jars que **não** podem ser versionados; arranque mais lento; a licença dos jars obriga a não os redistribuir.
- Notas: o utilizador escolheu este caminho em 2026-09-29 porque não depende do dono do servidor. A documentação de ViaVersion no servidor fica como alternativa, dentro da mesma fase do roadmap.
- Decisão: implementa-se na Fase 4 do `ROADMAP.md`. Desenho em `docs/modded.md`.

## ⏸️ Adiadas

As adiadas estão listadas acima, na secção 💡 Novas, com o motivo — uma ideia não sai do ficheiro quando é adiada.

## ❌ Rejeitadas

_(nada)_

## 📦 Feitas

_(nada)_
