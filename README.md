# Minecraft AFK Bot (No Mods)

English | [Portugues (Portugal)](./README.pt.md)

AFK bot for Minecraft Java Edition servers, compatible with Minecraft 26.3 and Windows 7 Starter 32-bit (x86) systems. Keeps the server active without requiring server mods or Microsoft accounts.

## Features

- Supports Minecraft 26.3 (protocol 777) and older versions
- Windows 7 32-bit support with bundled portable node.exe
- Offline accounts only (no Microsoft authentication needed)
- Anti-AFK continuous circle movement and jumping
- Exponential backoff reconnection on network loss
- Multi-bot concurrent connections
- Interactive terminal command interface

## Running on Windows 7 32-bit

The repository includes a custom `node.exe` patched specifically to run on Windows 7 32-bit without operating system errors. No installation or environment variable setup is required:

1. Configure `settings.json` with your server details.
2. Launch the bot by running `start.bat`.

The `start.bat` script automatically uses the local `node.exe`, sets `NODE_SKIP_PLATFORM_CHECK=1`, and starts the bot.

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

### Main Parameters

- `server.ip`: Server IP address or hostname.
- `server.port`: Server port (default: 25565).
- `server.version`: Target protocol version (e.g. "26.3").
- `bots`: List of offline accounts to connect. If the username contains "x" or "X" (e.g. "botxxxx"), each character is replaced by a random digit upon every connection and reconnection to prevent username bans.
- `movement.enabled`: Toggles anti-AFK movement routines.
- `movement.activeDurationSeconds`: Duration of active moving and jumping phase in seconds (default: 180).
- `movement.pauseDurationSeconds`: Duration of paused static phase in seconds (default: 30).
- `movement.radius`: Movement circle radius in blocks (default: 1.2).
- `movement.fixedCenter`: Optional {x, y, z} fixed center coordinates or null to use spawn position.
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
