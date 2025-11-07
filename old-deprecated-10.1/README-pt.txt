# Bot AFK para servidores de mine - Guia Completo

## Descrição
Este é um bot AFK para Minecraft, construído com Mineflayer, que permite várias operações via comandos no terminal. O bot funciona em qualquer servidor de mine, seja pirata (cracked) ou original (premium), oferece múltiplos comandos de configuração em tempo real e suporte multilíngue.

## Pré-requisitos

### Software Necessário:
- Node.js (versão 14 ou superior)
- NPM (para instalar dependências)
- Compilador C++ (para construir o executor em C++, opcional)

### Instalando Dependências
```bash
npm install mineflayer mineflayer-pathfinder minecraft-data express
```

## Instalação

### 1. Obtenha o Projeto
Faça o download ou clone os arquivos em seu computador, sem referências a nenhuma plataforma específica (por exemplo, GitHub). Basta garantir que todos os arquivos do bot estejam no mesmo diretório e que você tenha acesso a ele via terminal.

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure o arquivo settings.json
Crie (ou edite) o arquivo `settings.json` com o seguinte conteúdo básico e ajuste conforme necessário:
```json
{
  "server": {
    "ip": "play.exemplo.com",
    "port": 25565,
    "version": "1.20.4"
  },
  "bot-account": {
    "type": "mojang",
    "username": "NomeDoBotAqui",
    "password": ""
  },
  "language": "pt-pt",
  "maxRam": "1G"
}
```
- **server**: configurações do servidor de Minecraft (IP, porta, versão)
- **bot-account**: tipo de conta (“mojang” ou “microsoft”), nome de usuário e senha
- **language**: idioma inicial (`pt-pt` ou `eng`)
- **maxRam**: memória máxima para o bot, por exemplo `"1G"`

## Idiomas
Os arquivos de idioma ficam na pasta `lang/`:
- `lang/pt-pt.txt` – Português
- `lang/eng.txt` – Inglês

Cada linha segue o formato `chave=valor`. Para adicionar frases ou ajustar traduções, basta editar o arquivo correspondente.

## Comandos Disponíveis
Todos os comandos devem ser prefixados com `/` no terminal em que o bot estiver rodando:

### /stop
- **Descrição**: Para o bot e encerra o script
- **Sintaxe**: `/stop`

### /server
- **Descrição**: Exibe as informações atuais do servidor
- **Sintaxe**: `/server`

### /changeserver
- **Descrição**: Altera o servidor. Porta padrão: 25565
- **Sintaxe**: `/changeserver exemplo.com:25570`

### /changename
- **Descrição**: Altera o nome de usuário do bot
- **Sintaxe**: `/changename NovoNomeDoBot`

### /chat
- **Descrição**: Envia uma mensagem no chat do jogo
- **Sintaxe**: `/chat Olá a todos!`

### /pos
- **Descrição**: Exibe a posição atual do bot (x, y, z)
- **Sintaxe**: `/pos`

### /ping
- **Descrição**: Exibe o ping (latência) atual do bot
- **Sintaxe**: `/ping`

### /ram
- **Descrição**: Reinicia o bot aplicando a configuração de memória
- **Sintaxe**: `/ram`

### /version
- **Descrição**: Altera a versão do servidor e reconecta
- **Sintaxe**: `/version 1.20.4`

### /lang
- **Descrição**: Altera o idioma do bot
- **Sintaxe**: `/lang pt-pt`

### /changetype
- **Descrição**: Altera o tipo de conta (mojang/microsoft)
- **Sintaxe**: `/changetype microsoft`

### /typeinfo
- **Descrição**: Exibe o tipo de conta atual
- **Sintaxe**: `/typeinfo`

### /reload
- **Descrição**: Limpa o console e reinicia o script
- **Sintaxe**: `/reload`

### /restart
- **Descrição**: Alias para `/reload`
- **Sintaxe**: `/restart`

### /help
- **Descrição**: Exibe todos os comandos disponíveis
- **Sintaxe**: `/help`

## Executor em C++
O arquivo `run.cpp` executa `index.js` usando o Node.js. Para compilar e usar:
```bash
g++ run.cpp -o run.exe
./run.exe
```

## Exemplo de Uso

### 1. Inicie o Bot
```bash
run.exe
# ou diretamente
node index.js
```

### 2. Usando Comandos
```bash
> /server
Informações atuais do servidor: play.exemplo.com:25565 (v1.20.4)

> /changetype microsoft
Alterando o tipo de conta do bot para microsoft
Por favor, insira o e-mail da conta Microsoft:
<email digitado>
```

## Auditoria e Contato
Todas as auditorias, relatórios de erros e solicitações de recursos devem ser enviadas diretamente para minhas plataformas oficiais abaixo:
- **YouTube**: https://www.youtube.com/@strefiz
- **Twitch**: https://www.twitch.tv/strefiz
- **Twitter (X)**: https://x.com/Strefiz
- **Modrinth**: https://modrinth.com/user/Strefiz_
- **CurseForge**: https://www.curseforge.com/members/strefiz_/projects

## Licença
Este projeto está licenciado sob a Licença MIT.
