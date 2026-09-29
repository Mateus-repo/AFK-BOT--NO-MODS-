# AFK Bot for Minecraft Servers – Complete Guide

🇬🇧 English | [🇵🇹 Português (Portugal)](./README.pt.md)

## Description
This is an AFK bot for Minecraft, built with Mineflayer, which allows various operations via terminal commands. The bot works on any Minecraft server, whether cracked or premium, offers multiple real-time configuration commands, and supports multiple languages.

## Prerequisites

### Required Software:
- Node.js (version 14 or higher)
- NPM (to install dependencies)
- C++ Compiler (to build the C++ launcher, optional)

### Installing Dependencies
```bash
npm install
```

## Installation

### 1. Obtain the Project
Download or clone the files to your computer without referencing any specific platform (for example, GitHub). Just make sure all bot files are in the same directory and that you can access it via the terminal.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure the `settings.json` File
Create (or edit) the `settings.json` file with the following basic content and adjust as needed:
```json
{
  "server": {
    "ip": "play.example.com",
    "port": 25565,
    "version": "1.20.4"
  },
  "bot-account": {
    "type": "mojang",
    "username": "YourBotNameHere",
    "password": ""
  },
  "language": "pt-pt",
  "maxRam": "1G"
}
```
- **server**: Minecraft server settings (IP, port, version)  
- **bot-account**: account type (“mojang” or “microsoft”), username, and password  
- **language**: initial language (`pt-pt` or `eng`)  
- **maxRam**: maximum memory for the bot (e.g., `"1G"`)

## Languages
Language files are located in the `lang/` folder:
- `lang/pt-pt.txt` – Portuguese  
- `lang/eng.txt` – English  
- `lang/en-us.txt` – English (US), with the extra launcher messages  

Each line follows the format `key=value`. To add phrases or adjust translations, simply edit the corresponding file.

## Requirements

- **Node.js 14.21.3 or newer** (`npm install` and `node index.js`)
- Windows 7, 8, 10 or 11. On Windows 7 the last usable Node.js release is 14.21.3, so that is the project minimum
- A Minecraft account (mojang or Microsoft)

## Running several bots

To run more than one bot on the same server, add a `bots` array to
`settings.json`. The single `bot-account` is then only used for the account
type and password that the bots inherit:

```json
"bots": [
  { "username": "botxxxx" },
  { "username": "botxxxx" },
  { "username": "meu_bot" }
]
```
A bot can have its own `password` when it uses a different account.
Each bot gets its own session, with its own movement and its own
reconnection, so one dropping does not take the others down. Every `x` in a
name is replaced with a random digit on each connection, so the server never
sees the same name twice. Use `/bots` to see them all.

## Automatic version detection

Set `"version": "auto"` in `settings.json` and the bot asks the server which
protocol it speaks before connecting, then picks the matching version:

```json
"server": { "ip": "exemplo.com", "port": 25565, "version": "auto" }
```

- If the server answers, the detected version is used and logged
- If it does not answer, the bot falls back to the newest version the
  library knows and says so — you are never left without a bot
- A version the library does not know is reported as a warning, not a crash

`/diagnostico` shows exactly what was detected, and is the first thing to
paste when asking for help.

## Anti-AFK movement

While the bot is inside the world it walks in a small circle and jumps, then
rests. This is what keeps most servers from kicking an idle client. It is not
a way around an anticheat, and it is configurable in `settings.json`:

```json
"movement": {
  "enabled": true,
  "activeDurationSeconds": 180,
  "pauseDurationSeconds": 30,
  "radius": 1.2
}
```

- `activeDurationSeconds`: how long it walks before resting
- `pauseDurationSeconds`: how long it rests (0 for no rest)
- `radius`: circle radius in blocks, from 0.5 to 8

Use `/andar [on|off]` to switch it at runtime without editing the file.

## Running the tests

The tests never connect to a server: the bot is started with a simulated
Mineflayer, so you can check the startup, the commands and the settings file
without touching a real Minecraft account.

```bash
npm test
```

## How the bot behaves

- If `settings.json` is missing, incomplete or broken, the bot starts with the
  values from `default.json` and says so, instead of crashing
- Changing server, name, version, language or account type only rewrites the
  fields you changed; anything else in `settings.json` is kept
- `/default` keeps a copy of your settings in `settings.json.bak` before replacing it
- If the connection drops, the bot reconnects on its own with an exponential
  backoff (1s, 2s, 4s ... up to 60s, ten attempts). Changing the server, the name,
  the version or stopping the bot cancels the reconnection

## Available Commands
All commands must be prefixed with `/` in the terminal where the bot is running:

### `/stop`
- **Description:** Stops the bot and exits the script  
- **Syntax:** `/stop`

### `/server`
- **Description:** Displays the current server information  
- **Syntax:** `/server`

### `/changeserver`
- **Description:** Changes the server. Default port: 25565  
- **Syntax:** `/changeserver example.com:25570`

### `/changename`
- **Description:** Changes the bot’s username  
- **Syntax:** `/changename NewBotName`

### `/chat`
- **Description:** Sends a message in the in-game chat  
- **Syntax:** `/chat Hello everyone!`

### `/pos`
- **Description:** Displays the bot’s current position (x, y, z)  
- **Syntax:** `/pos`

### `/ping`
- **Description:** Displays the bot’s current ping (latency)  
- **Syntax:** `/ping`

### `/ram`
- **Description:** Restarts the bot, applying the memory configuration  
- **Syntax:** `/ram`
### `/andar`
- **Description:** Turns the anti-AFK movement on or off at runtime  
- **Syntax:** `/andar [on|off]`
### `/bots`
- **Description:** Shows every bot: name, state and position  
- **Syntax:** `/bots`
### `/diagnostico`
- **Description:** Shows what the bot knows: Node version, applied compatibility, server, version that will be used, movement, sessions and reconnection  
- **Syntax:** `/diagnostico` (also accepts `/diagnostic`)




### `/version`
- **Description:** Changes the server version and reconnects  
- **Syntax:** `/version 1.20.4`

### `/lang`
- **Description:** Changes the bot’s language  
- **Syntax:** `/lang pt-pt`

### `/changetype`
- **Description:** Changes the account type (mojang/microsoft)  
- **Syntax:** `/changetype microsoft`

### `/typeinfo`
- **Description:** Displays the current account type  
- **Syntax:** `/typeinfo`

### `/reload`
- **Description:** Clears the console and restarts the script  
- **Syntax:** `/reload`

### `/restart`
- **Description:** Alias for `/reload`  
- **Syntax:** `/restart`

### `/help`
- **Description:** Displays all available commands  
- **Syntax:** `/help`

### `/default`
- **Description:** Restores `settings.json` from `default.json` and restarts the bot  
- **Syntax:** `/default`

## C++ Launcher
The `run.cpp` file runs `index.js` using Node.js. To compile and use:
```bash
g++ run.cpp -o run.exe
./run.exe
```

## Usage Example

### 1. Start the Bot
```bash
run.exe
# or directly
node index.js
```

### 2. Using Commands
```bash
> /server
Current server information: play.example.com:25565 (v1.20.4)

> /changetype microsoft
Changing the bot’s account type to microsoft
Please enter the Microsoft account email:
<entered email>
```

## Audit and Contact
All audits, bug reports, and feature requests should be sent directly to my official platforms below:
- **YouTube:** "https://www.youtube.com/@strefiz"  
- **Twitch:** "https://www.twitch.tv/strefiz"  
- **Twitter (X):** "https://x.com/Strefiz"  
- **Modrinth:** "https://modrinth.com/user/Strefiz_"  
- **CurseForge:** "https://www.curseforge.com/members/strefiz_/projects"  

## License
This project is licensed under the MIT License.
