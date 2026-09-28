# Minecraft AFK Bot (No Mods)

English | [Portugues (Portugal)](./README.pt.md)

AFK bot for Minecraft Java Edition servers, compatible with Minecraft 26.3 and Windows 7 Starter 32-bit (x86) systems. Keeps the server active without requiring server mods or Microsoft accounts.

## Features

- Supports Minecraft 26.3 (protocol 777) and older versions
- Windows 7 32-bit support via Node.js 18.20.8 x86
- Offline accounts only (no Microsoft authentication needed)
- Anti-AFK randomized movement bounded by radius
- Exponential backoff reconnection on network loss
- Multi-bot concurrent connections
- Interactive terminal command interface

## Windows 7 32-bit Setup

1. Download Node.js 18.20.8 x86:
   https://nodejs.org/dist/v18.20.8/node-v18.20.8-win-x86.zip

2. Extract the archive to `C:\nodejs`.

3. Add `C:\nodejs` to the system `Path` variable:
   - Control Panel > System > Advanced system settings > Environment Variables
   - Edit the `Path` variable and append `;C:\nodejs` to the end.

4. Add a new system environment variable:
   - Name: `NODE_SKIP_PLATFORM_CHECK`
   - Value: `1`

5. Open a command prompt and run `npm install` inside the project folder.

6. Launch the bot by double clicking `start.bat`.

## Configuration

Edit `settings.json` according to your needs:

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

### Main Parameters

- `server.ip`: Server IP address or hostname.
- `server.port`: Server port (default: 25565).
- `server.version`: Target protocol version (e.g. "26.3").
- `bots`: List of offline accounts to connect.
- `movement.enabled`: Toggles anti-AFK movement routines.
- `movement.radius`: Maximum distance in blocks from initial spawn point.
- `reconnect.enabled`: Automatic reconnection if connection is lost.

## Terminal Commands

The following commands are supported while the bot is active:

- `/help`: Lists available commands.
- `/server`: Displays connection address, port, and bot status.
- `/pos`: Shows current X, Y, Z coordinates for each bot.
- `/chat <message>`: Sends an in-game message from the first active bot.
- `/reload`: Reloads settings from settings.json.
- `/stop`: Disconnects all bots and exits the program.

## License

Distributed under the MIT License.
