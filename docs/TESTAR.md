# Como testar a sério

> Os testes automáticos do projecto (123 verificações) correm com o Mineflayer
> **simulado**. Ninguém, até agora, ligou este bot a um servidor de verdade.
> Este documento é o procedimento para o fazer, e o que significa cada resultado.
>
> Actualizado: 2026-09-29

## Antes de começar

1. **Uma conta de testes**, nunca a tua conta principal. Um bot de AFK ligado a um
   servidor expulsa-se e pode levar a conta com ele. Se a conta for premium, a
   Mojang pode pedir verificação por ser usada deste modo.
2. **Um servidor de testes**, não o servidor a sério de ninguém. Se tiveres um
   servidor próprio, um mundo novo e uma porta livre chegam.
3. **`settings.json` nunca é versionado.** Confirma que não vais dar commit a
   dados reais: `node .opencode/scripts/check-secrets.mjs --staged` antes de
   qualquer `git add`.

## O que testar, por ordem

### 1. Arranque a frio

```bash
npm install
node index.js
```

Com um `settings.json` novo (ou inexistente), o bot deve:

- dizer que não encontrou o `settings.json` e usar o `default.json`;
- pedir o endereço do servidor;
- escolher um nome a partir do teu `bot-account`.

Se algo disto não acontecer, o log diz qual dos passos falhou.

### 2. Diagnóstico

Assim que o prompt aparecer, escreve:

```
/diagnostico
```

Copia a saída **inteira** para um bug. Diz: versão do Node, se a compatibilidade
de versões foi aplicada, o servidor, a versão configurada e a que vai usar, o
protocolo detectado, jogadores, movimento, sessões e reconexão.

### 3. Entrar e ficar

Deixa o bot uns minutos dentro do mundo e confirma:

- entrou no mundo sem erro (`📍 Bot entrou no mundo`);
- a posição muda com o tempo (`/pos`), o que prova que o movimento anti-AFK
  está a andar;
- `/ping` devolve um número;
- `/bots` mostra as sessões com nomes diferentes (se tiveres mais do que um).

**O ângulo e o raio do movimento são um palpite.** Se o bot ficar preso num
canto, ou tremer sem sair do sítio, anota isso: é o `radius` e o
`activeDurationSeconds` no `settings.json`.

### 4. Quedar e voltar

- Mata a ligação do lado do servidor (ou usa um plugin de restart).
- O bot deve dizer que a ligação caiu e tentar voltar em 1 s, 2 s, 4 s…
- Quando voltar, o contador reinicia (a tentativa 1 de novo).

Se não voltar, o número de tentativas e o atraso estão no `/diagnostico`.

### 5. Deteção automática de versão

Mete `"version": "auto"` no `settings.json` e repete o arranque.

- Com o servidor ligado: deve dizer `Versão do servidor detectada: X`.
- Com o servidor desligado: deve avisar e **ligar na mesma**, com a versão mais
  recente que a biblioteca conhece.

O segundo caso é o mais importante: prova que o bot nunca fica sem funcionar por
causa de um servidor que não responde.

### 6. Movimento e multi-bot

Com vários bots configurados:

```json
"bots": [{ "username": "botxxxx" }, { "username": "botxxxx" }]
```

- `/bots` tem de mostrar os dois, com nomes diferentes;
- um deles não pode levar o outro abaixo quando o servidor limite jogadores.

## O que cada resultado significa

| Resultado | O que diz |
|---|---|
| Entra e fica, com posição a mudar | o caminho principal funciona |
| Não entra, mas o log diz o protocolo | a versão não bate certo: é o patch do 26.3 a ser testado |
| Não entra e o log repete "Conexão encerrada" | a reconexão está a bater no limite de tentativas |
| Fica a tremer no sítio | o `radius` ou o ângulo do movimento estão errados para esse mundo |
| Expulso logo | anti-cheat, não é um problema de protocolo |

## O que **não** testar ainda

- **Servidores com mods** (Fase 4): o sidecar Via ainda não está implementado. Não
  é suposto que funcione.
- **Windows 7**: só quando a Fase 2 e a 3 estiverem fechadas. A verificação
  automática diz que o código compila com o Node 14.21.3, mas ninguém o correu
  num Windows 7.

## Depois de testar

Actualiza `PROGRESSO.md` com o que viste (ou manda-me a saída do `/diagnostico` e
eu trato disso). O que ficar por confirmar sai de lá como problema conhecido, não
como facto.
