# AFK Bot for Minecraft Servers – Complete Guide

## Description
This is an AFK bot for Minecraft, built with Mineflayer, which allows various operations via terminal commands. The bot works on any Minecraft server, whether cracked or premium, offers multiple real-time configuration commands, and supports multiple languages.

## Prerequisites

### Required Software:
- Node.js (version 14 or higher)
- NPM (to install dependencies)
- C++ Compiler (to build the C++ launcher, optional)

### Installing Dependencies
```bash
npm install mineflayer mineflayer-pathfinder minecraft-data express
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

Each line follows the format `key=value`. To add phrases or adjust translations, simply edit the corresponding file.

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
- **YouTube:** https://www.youtube.com/@strefiz  
- **Twitch:** https://www.twitch.tv/strefiz  
- **Twitter (X):** https://x.com/Strefiz  
- **Modrinth:** https://modrinth.com/user/Strefiz_  
- **CurseForge:** https://www.curseforge.com/members/strefiz_/projects  

## License
This project is licensed under the MIT License.
