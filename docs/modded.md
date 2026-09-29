# Compatibilidade com servidores modded

> Documento da skill `modded`. Estado: **caminho decidido, nada disto foi implementado nem testado**.
> Última actualização: 2026-09-29. O que não foi confirmado está marcado como *por confirmar*.

## Aviso: Windows 7 e mods não cabem juntos (por confirmar)

O requisito R1 (Windows 7) e o requisito R3 (mods de qualquer loader) **chocam**:

- O Java 8 é a última versão que corre em Windows 7.
- O Via actual e o Minecraft 1.20.5+ precisam de Java 17 ou 21.

Ou seja: num PC com Windows 7, o sidecar só deve conseguir falar com servidores de versões mais antigas, e possivelmente com um Via antigo que funcione em Java 8 — o que, por si só, provavelmente não suporta os负载ers modernos. Isto está **por confirmar** com um teste real, e a decisão (aceitar a limitação, procurar um caminho em Java 8, ou dizer que o Windows 7 é só para vanilla antigo) é do dono do projecto.

## Decisão

Em 2026-09-29 o utilizador escolheu o **caminho 2, sidecar local Via** (ideia I-001 aprovada). O caminho 1, ViaVersion no servidor, continua a ser documentado como a alternativa mais simples para quem não queira instalar Java.

## Como vai ser implementado (desenho, não implementado)

```
createBot()  ──►  resolveAlvo()  ──┬── modded.proxy.enabled = false ──► servidor, como hoje
                                   └── modded.proxy.enabled = true  ──► localhost:<porta>
                                          │
                                          └── arrancarVia() ──► java -jar via.jar --via-proxy
                                                                 (espera pela porta estar aberta)
```

Passos da implementação, na ordem:

1. `resolveAlvo()` decide o destino (servidor real ou proxy local). Nada mais no código sabe a diferença.
2. `arrancarVia()` arranca o processo, espera a porta e morre se o utilizador fechar o terminal (o launcher C++ também tem de o fazer).
3. O resto da ligação — autenticação, eventos, reconexão — **não muda**.
4. Novas chaves de idioma para o arranque do proxy, para o proxy não disponível e para servidor modded sem Via.
5. `docs/modded.md` e os dois READMEs a dizer o que funciona e o que continua por testar.

O que **não** muda: os comandos, os idiomas e o formato actual de `settings.json` (as opções novas entram com valores por omissão, logo a v3 por este caminho pode ser MINOR em vez de MAJOR — decisão a confirmar na Fase 4).

## O objectivo

O utilizador quer que o bot entre em **quantos mais servidores possível, mesmo com mods**. Este documento explica o que é tecnicamente possível, com que custos, e o que está por decidir.

## Como funciona a ligação hoje

O bot usa **Mineflayer**, uma biblioteca de Node.js que implementa o protocolo de Minecraft tal como o jogo o define. `createBot()` em `index.js` passa ao Mineflayer o host, a porta, a **versão** e as credenciais.

Isso significa: o bot fala o protocolo de um cliente **vanilla**. Tudo o que um servidor faça para além disso é território onde o Mineflayer não vai.

## O que é possível, por tipo de servidor

| Tipo de servidor | Funciona com o Mineflayer | Porquê |
|---|---|---|
| Vanilla, versões suportadas | Sim | é o caso normal |
| Com ViaVersion / ViaFabric (ex.: 1.8 → 1.20 no mesmo servidor) | Sim | o servidor converte o protocolo antigo; o bot fala o de baixo |
| Com plugins (Bukkit, Spigot, Paper) | Em geral | plugins que mandam pacotes customizados podem falhar |
| **Modded (Forge, Fabric, NeoForge)** | **Não** | o servidor tem registos de blocos/itens customizados e pacotes próprios que o cliente tem de conhecer |
| Anticheat agressivo | Imprevisível | pode expulsar o bot por comportamento, não por protocolo |
| Servidor com proxy (Velocity, BungeeCord) | Depende | falta estudo do encaminhamento (ideia I-004) |

## Os três caminhos para servidores com mods

### 1. ViaVersion no servidor (o mais simples)

O dono do servidor instala ViaVersion e passa a aceitar versões antigas. O bot entra normalmente, sem mudar nada.

- Esforço para nós: **baixo** (é documentação).
- Depende de terceiros: o dono do servidor.
- Este caminho é o que resolve mais casos na prática e devia ser o primeiro a ser documentado, mesmo que não implementemos nada.

### 2. Sidecar local (o que a I-001 propõe)

Corrermos **localmente** um processo Java com ViaVersion/Via que faz de ponte:

```
bot (Node/Mineflayer)  ──►  localhost:25570 (Via)  ──►  servidor modded
```

- Esforço: **médio**; exige Java no computador do utilizador.
- O bot continua a falar o mesmo protocolo de sempre: a conversão acontece fora.
- Os jars não podem ser versionados no repositório (tamanho e licença) — ficam numa pasta gerada, e o `settings.json` tem uma secção nova para ligar/desligar isto.
- Arranque do proxy: alguns segundos, e a configuração tem de tolerar isso sem que o utilizador ter de adivinhar.
- *Por confirmar*: como obter os jars, que versão do Via usar, e se o Java 17+ serve para a versão do Via escolhida.

### 3. Cliente Java headless com mods (pesado)

Correr um cliente Minecraft a sério, sem interface, com os mods do servidor. Muito mais pesado, e a vantagem para um bot que só quer ficar AFK é pouca. Só com exigência explícita do utilizador.

## Decisões de configuração (se o caminho 2 avançar)

Proposta, ainda por decidir:

```jsonc
"modded": {
  "enabled": false,        // desligado por omissão: o comportamento actual não muda
  "mode": "auto",          // "auto" detecta, "always" força, "off" nunca
  "proxy": {
    "enabled": false,      // arrancar o Via local
    "port": 25570,         // porta local, tem de ser livre
    "javaPath": "java",    // caminho para o java
    "viaPath": "./via"     // onde estão os jars
  }
}
```

Regras que já estão decididas, para quando isto existir:

- Desligado por omissão e sem efeito colateral: em vanilla, o bot tem de se comportar exactamente como hoje.
- Porta e caminho configuráveis, e o log tem de dizer **qual** a versão do servidor detectada e **se** o Via foi arrancado.
- Erros de arranque do proxy são mensagens novas em `lang/*.txt` (ex.: `modded_proxy_failed`, `error_mods_unsupported`), nunca texto escrito à mão.
- A autenticação (mojang / microsoft) continua a ser a do resto do bot; não se duplica lógica de sessão.

## O que ainda não se sabe (*por confirmar*)

- [ ] Qual é a versão do Mineflayer suportada neste momento e até que versões de Minecraft chega.
- [ ] Se o Mineflayer expõe a versão do servidor no `ping` de forma utilizável (para o `"version": "auto"` da Fase 3).
- [ ] Que configuração exacta do Via é necessária para servir de front-end a um servidor modded, e com que custo de memória.
- [ ] Se um bot ligado a um servidor modded é aceite ou expulso por anticheats comuns.

Nada disto se escreve em código antes de ser confirmado. A regra da skill `modded` é: **se não foi verificado, o README diz "por testar"**.

## Como testar

1. Um servidor de mods local, isolado, com um utilizador de teste — nunca o servidor de verdade do utilizador.
2. Um servidor vanilla como comparação, para garantir que a mudança não o afectou.
3. Registar: versão detectada, se o Via arrancou, mensagem de erro exacta quando falha.

Resultados de teste entram em `PROGRESSO.md` (factos) e aqui (estado do que funciona).
