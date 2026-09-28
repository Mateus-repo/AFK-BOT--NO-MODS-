# Bot AFK Minecraft (Sem Mods)

[English](./README.md) | Portugues (Portugal)

Bot AFK para servidores Minecraft Java Edition, compativel com Minecraft 26.3 e sistemas Windows 7 Starter 32 bits (x86). Mantem o servidor ativo sem necessidade de mods ou contas Microsoft.

## Caracteristicas

- Compativel com Minecraft 26.3 (protocolo 777) e versoes anteriores
- Suporte para Windows 7 32 bits atraves do Node.js 18.20.8 x86
- Apenas contas offline (sem autenticacao Microsoft)
- Movimento aleatorio anti-AFK com delimitacao de raio
- Reconexao automatica com tempo progressivo
- Gestao de multiplos bots em simultaneo
- Controlo em tempo real via terminal

## Instalacao em Windows 7 32 bits

1. Descarregue o Node.js 18.20.8 x86:
   https://nodejs.org/dist/v18.20.8/node-v18.20.8-win-x86.zip

2. Extraia o conteudo para `C:\nodejs`.

3. Adicione `C:\nodejs` a variavel de sistema `Path`:
   - Painel de Controlo > Sistema > Definicoes avancadas do sistema > Variaveis de ambiente
   - Selecione a variavel `Path` e adicione `;C:\nodejs` no fim.

4. Crie uma variavel de ambiente do sistema:
   - Nome: `NODE_SKIP_PLATFORM_CHECK`
   - Valor: `1`

5. Abra uma linha de comandos e execute `npm install` na pasta do bot.

6. Inicie o bot executando `start.bat`.

## Configuracao

Edite o ficheiro `settings.json` com os dados pretendidos:

```json
{
  "server": {
    "ip": "localhost",
    "port": 25565,
    "version": "26.3"
  },
  "bots": [
    {
      "username": "AFK_Bot"
    }
  ],
  "movement": {
    "enabled": true,
    "intervalSeconds": 20,
    "actionDurationMs": 800,
    "radius": 3
  },
  "reconnect": {
    "enabled": true,
    "initialDelaySeconds": 5,
    "maxDelaySeconds": 60
  },
  "maxRam": "512M"
}
```

### Parametros principais

- `server.ip`: Endereco IP ou dominio do servidor.
- `server.port`: Porta do servidor (padrao: 25565).
- `server.version`: Versao do protocolo pretendida (exemplo: "26.3").
- `bots`: Lista de contas offline a ligar.
- `movement.enabled`: Ativa ou desativa a movimentacao anti-AFK.
- `movement.radius`: Distancia maxima em blocos a partir do ponto de entrada.
- `reconnect.enabled`: Ativa a reconexao automatica em caso de queda de rede.

## Comandos do terminal

O terminal aceita os seguintes comandos enquanto o bot esta em execucao:

- `/help`: Mostra a lista de comandos disponiveis.
- `/server`: Apresenta o endereco, porta e estado de cada bot.
- `/pos`: Exibe as coordenadas X, Y, Z actuais de cada bot.
- `/chat <mensagem>`: Envia uma mensagem para o chat do jogo.
- `/reload`: Recarrega as definicoes do ficheiro settings.json.
- `/stop`: Desliga as sessoes ativas e encerra o programa.

## Licenca

Distribuido sob a licenca MIT.
