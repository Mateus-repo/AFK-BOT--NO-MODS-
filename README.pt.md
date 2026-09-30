# Bot AFK Minecraft (Sem Mods)

[English](./README.md) | Portugues (Portugal)

Bot AFK para servidores Minecraft Java Edition, compativel com Minecraft 26.3 e sistemas Windows 7 Starter 32 bits (x86). Mantem o servidor ativo sem necessidade de mods ou contas Microsoft.

## Caracteristicas

- Compativel com Minecraft 26.3 (protocolo 777) e versoes anteriores
- Suporte para Windows 7 32 bits com node.exe portatil incluido
- Apenas contas offline (sem autenticacao Microsoft)
- Movimento em circulo e saltos continuos anti-AFK
- Reconexao automatica com tempo progressivo
- Gestao de multiplos bots em simultaneo
- Controlo em tempo real via terminal

## Execucao em Windows 7 32 bits

O repositorio inclui um executavel `node.exe` adaptado especificamente para correr em Windows 7 32 bits sem erros do sistema operativo. Nao e necessaria qualquer instalacao ou configuracao de variaveis de ambiente:

1. Configure o ficheiro `settings.json` com os dados do servidor.
2. Inicie o bot executando `start.bat`.

O script `start.bat` utiliza automaticamente o `node.exe` local, ativa a compatibilidade (`NODE_SKIP_PLATFORM_CHECK=1`) e inicia o bot.

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
      "username": "botxxxx"
    }
  ],
  "movement": {
    "enabled": true,
    "activeDurationSeconds": 180,
    "pauseDurationSeconds": 30,
    "radius": 1.2,
    "fixedCenter": null
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
- `bots`: Lista de contas offline a ligar. Se o nome contiver "x" ou "X" (ex: "botxxxx"), cada letra e substituida por um digito aleatorio a cada tentativa de ligacao ou reconexao, evitando bloqueios de nick.
- `movement.enabled`: Ativa ou desativa a movimentacao anti-AFK.
- `movement.activeDurationSeconds`: Duracao da fase de movimento e saltos em segundos (padrao: 180).
- `movement.pauseDurationSeconds`: Duracao da pausa estatica entre ciclos em segundos (padrao: 30).
- `movement.radius`: Raio do circulo de movimento em blocos (padrao: 1.2).
- `movement.fixedCenter`: Coordenadas {x, y, z} opcionais para fixar o centro ou null para o spawn.
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
