const fs = require('fs');
const path = require('path');
const readline = require('readline');

function setupMinecraft263Compat() {
  const minecraftData = require('minecraft-data');
  const data = require('minecraft-data/data.js');

  if (!data.pc['26.3'] && data.pc['26.1']) {
    const base = JSON.parse(JSON.stringify(data.pc['26.1']));

    if (base.protocol?.play?.toServer?.types) {
      base.protocol.play.toServer.types.packet_teleport_confirm = [
        'container',
        [
          { name: 'teleportId', type: 'varint' },
          { name: 'x', type: 'f64' },
          { name: 'y', type: 'f64' },
          { name: 'z', type: 'f64' },
          { name: 'yRot', type: 'f32' },
          { name: 'xRot', type: 'f32' }
        ]
      ];
    }

    data.pc['26.3'] = {
      ...base,
      version: {
        minecraftVersion: '26.3',
        version: 777,
        dataVersion: 5023,
        usesNetty: true,
        majorVersion: '26.3',
        releaseType: 'release'
      }
    };
  }

  if (!minecraftData.supportedVersions.pc.includes('26.3')) {
    minecraftData.supportedVersions.pc.push('26.3');
  }

  try {
    const physicsFeatures = require('prismarine-physics/lib/features');
    for (const item of physicsFeatures) {
      if (item.versions.includes('26.1') && !item.versions.includes('26.3')) {
        item.versions.push('26.3');
      }
    }
  } catch {}

  try {
    const chunkPath = require.resolve('prismarine-chunk');
    const originalChunkLoader = require('prismarine-chunk');
    const chunk118 = require('prismarine-chunk/src/pc/1.18/chunk');

    function patchedChunkLoader(registryOrVersion) {
      const registry = typeof registryOrVersion === 'string'
        ? require('prismarine-registry')(registryOrVersion)
        : registryOrVersion;

      if (registry?.version?.majorVersion === '26.3') {
        return chunk118(registry);
      }
      return originalChunkLoader(registryOrVersion);
    }

    Object.assign(patchedChunkLoader, originalChunkLoader);
    require.cache[chunkPath].exports = patchedChunkLoader;
  } catch {}

  try {
    const mfVersion = require('mineflayer/lib/version');
    if (!mfVersion.testedVersions.includes('26.3')) {
      mfVersion.testedVersions.push('26.3');
      mfVersion.latestSupportedVersion = '26.3';
    }
  } catch {}
}

setupMinecraft263Compat();
const mineflayer = require('mineflayer');

function loadSettings() {
  const settingsPath = path.join(__dirname, 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    throw new Error(`Ficheiro de configuracao nao encontrado: ${settingsPath}`);
  }

  const raw = fs.readFileSync(settingsPath, 'utf8');
  const parsed = JSON.parse(raw);

  const server = {
    ip: parsed.server?.ip || 'localhost',
    port: Number(parsed.server?.port) || 25565,
    version: parsed.server?.version || '26.3'
  };

  let botList = [];
  if (Array.isArray(parsed.bots) && parsed.bots.length > 0) {
    botList = parsed.bots.map((b, i) => ({
      username: b.username || `AFK_Bot_${i + 1}`
    }));
  } else if (parsed['bot-account']?.username) {
    botList = [{ username: parsed['bot-account'].username }];
  } else {
    botList = [{ username: 'AFK_Bot' }];
  }

  const movement = {
    enabled: parsed.movement?.enabled !== false,
    intervalSeconds: Number(parsed.movement?.intervalSeconds) || 20,
    actionDurationMs: Number(parsed.movement?.actionDurationMs) || 800,
    radius: Number(parsed.movement?.radius) || 3
  };

  const reconnect = {
    enabled: parsed.reconnect?.enabled !== false,
    initialDelaySeconds: Number(parsed.reconnect?.initialDelaySeconds) || 5,
    maxDelaySeconds: Number(parsed.reconnect?.maxDelaySeconds) || 60
  };

  return { server, bots: botList, movement, reconnect };
}

class BotSession {
  constructor(username, config) {
    this.username = username;
    this.config = config;
    this.instance = null;
    this.spawnPosition = null;
    this.movementTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.shouldRun = true;
    this.status = 'disconnected';
  }

  start() {
    this.shouldRun = true;
    this.connect();
  }

  stop() {
    this.shouldRun = false;
    this.clearTimers();
    if (this.instance) {
      this.status = 'stopping';
      try {
        this.instance.quit();
      } catch {}
      this.instance = null;
    }
    this.status = 'stopped';
  }

  clearTimers() {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  connect() {
    if (!this.shouldRun) return;
    this.clearTimers();
    this.status = 'connecting';

    const botOptions = {
      host: this.config.server.ip,
      port: this.config.server.port,
      username: this.username,
      auth: 'offline',
      hideErrors: true
    };

    if (this.config.server.version && this.config.server.version !== 'auto') {
      botOptions.version = this.config.server.version;
    }

    console.log(`[${this.username}] A ligar a ${botOptions.host}:${botOptions.port} (versao: ${botOptions.version || 'auto'})...`);

    try {
      this.instance = mineflayer.createBot(botOptions);
      this.attachEvents();
    } catch (err) {
      console.log(`[${this.username}] Falha ao criar instancia: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  attachEvents() {
    const bot = this.instance;

    bot.once('login', () => {
      this.status = 'logged_in';
      console.log(`[${this.username}] Sessao iniciada no servidor.`);
    });

    bot.once('spawn', () => {
      this.status = 'spawned';
      this.reconnectAttempts = 0;
      this.spawnPosition = bot.entity.position.clone();
      console.log(`[${this.username}] Entrou no mundo nas coordenadas: ${this.formatCoords(this.spawnPosition)}`);
      this.startAfkMovement();
    });

    bot.on('death', () => {
      console.log(`[${this.username}] O bot morreu. A renascer automaticamente...`);
      setTimeout(() => {
        try {
          bot.respawn();
        } catch {}
      }, 1000);
    });

    bot.on('chat', (sender, message) => {
      if (sender === this.username) return;
      if (message.startsWith('!ping')) {
        bot.chat('pong');
      }
    });

    bot.on('kicked', (reason) => {
      let parsed = reason;
      try {
        const json = JSON.parse(reason);
        parsed = json.text || json.extra?.map(e => e.text).join('') || reason;
      } catch {}
      console.log(`[${this.username}] Expulso do servidor: ${parsed}`);
    });

    bot.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`[${this.username}] Conexao recusada em ${this.config.server.ip}:${this.config.server.port}`);
      } else {
        console.log(`[${this.username}] Erro de rede: ${err.message}`);
      }
    });

    bot.on('end', (reason) => {
      this.status = 'disconnected';
      this.clearTimers();
      this.instance = null;
      console.log(`[${this.username}] Conexao terminada (${reason || 'desconectado'}).`);
      this.scheduleReconnect();
    });

    this.patchTeleportConfirm(bot);
  }

  patchTeleportConfirm(bot) {
    if (!bot._client) return;
    const originalWrite = bot._client.write.bind(bot._client);

    bot._client.write = (packetName, params) => {
      if (packetName === 'teleport_confirm' && params && typeof params === 'object') {
        if (params.x === undefined && bot.entity?.position) {
          params.x = bot.entity.position.x;
          params.y = bot.entity.position.y;
          params.z = bot.entity.position.z;
          params.yRot = bot.entity.yaw || 0;
          params.xRot = bot.entity.pitch || 0;
        }
      }
      return originalWrite(packetName, params);
    };
  }

  startAfkMovement() {
    if (!this.config.movement.enabled) return;

    this.movementTimer = setInterval(() => {
      if (this.status !== 'spawned' || !this.instance?.entity) return;
      this.executeAfkAction();
    }, this.config.movement.intervalSeconds * 1000);
  }

  executeAfkAction() {
    const bot = this.instance;
    const current = bot.entity.position;
    const spawn = this.spawnPosition;

    if (spawn && current.distanceTo(spawn) > this.config.movement.radius) {
      const dx = spawn.x - current.x;
      const dz = spawn.z - current.z;
      const yaw = Math.atan2(-dx, -dz);
      bot.look(yaw, 0, true);
      bot.setControlState('forward', true);

      setTimeout(() => {
        if (this.instance) {
          this.instance.clearControlStates();
        }
      }, this.config.movement.actionDurationMs);
      return;
    }

    const actions = ['jump', 'forward', 'back', 'left', 'right', 'sneak', 'look'];
    const selected = actions[Math.floor(Math.random() * actions.length)];

    if (selected === 'look') {
      const yaw = (Math.random() * Math.PI * 2) - Math.PI;
      const pitch = (Math.random() * 0.6) - 0.3;
      bot.look(yaw, pitch, false);
      return;
    }

    if (selected === 'jump') {
      bot.setControlState('jump', true);
      setTimeout(() => {
        if (this.instance) this.instance.setControlState('jump', false);
      }, 350);
      return;
    }

    bot.setControlState(selected, true);
    setTimeout(() => {
      if (this.instance) {
        this.instance.setControlState(selected, false);
      }
    }, this.config.movement.actionDurationMs);
  }

  scheduleReconnect() {
    if (!this.shouldRun || !this.config.reconnect.enabled) return;

    this.reconnectAttempts++;
    const base = this.config.reconnect.initialDelaySeconds;
    const max = this.config.reconnect.maxDelaySeconds;
    const delay = Math.min(base * Math.pow(1.5, this.reconnectAttempts - 1), max);

    console.log(`[${this.username}] A reconectar em ${Math.round(delay)} segundos (tentativa ${this.reconnectAttempts})...`);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay * 1000);
  }

  formatCoords(pos) {
    if (!pos) return 'Desconhecidas';
    return `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
  }
}

class BotManager {
  constructor() {
    this.config = loadSettings();
    this.sessions = [];
  }

  start() {
    console.log(`Configuracao carregada: ${this.config.bots.length} bot(s) para ${this.config.server.ip}:${this.config.server.port} [MC ${this.config.server.version}]`);
    this.sessions = this.config.bots.map(b => new BotSession(b.username, this.config));
    for (const session of this.sessions) {
      session.start();
    }
  }

  reload() {
    try {
      const newConfig = loadSettings();
      this.config = newConfig;
      for (const session of this.sessions) {
        session.config = newConfig;
      }
      console.log('Configuracoes recarregadas com sucesso.');
    } catch (err) {
      console.log(`Erro ao recarregar configuracoes: ${err.message}`);
    }
  }

  stop() {
    console.log('A parar todos os bots...');
    for (const session of this.sessions) {
      session.stop();
    }
  }

  showStatus() {
    console.log(`Servidor: ${this.config.server.ip}:${this.config.server.port} (MC ${this.config.server.version})`);
    for (const s of this.sessions) {
      console.log(`- ${s.username}: ${s.status}`);
    }
  }

  showPositions() {
    for (const s of this.sessions) {
      if (s.instance?.entity?.position) {
        console.log(`- ${s.username}: ${s.formatCoords(s.instance.entity.position)}`);
      } else {
        console.log(`- ${s.username}: nao conectado`);
      }
    }
  }

  sendChat(message) {
    const active = this.sessions.find(s => s.status === 'spawned' && s.instance);
    if (!active) {
      console.log('Nenhum bot conectado no momento para enviar mensagens.');
      return;
    }
    active.instance.chat(message);
    console.log(`[${active.username}] Chat enviado: ${message}`);
  }
}

const manager = new BotManager();
manager.start();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function printHelp() {
  console.log('Comandos disponiveis:');
  console.log('  /help         - Mostra esta lista de comandos');
  console.log('  /server       - Mostra o estado da ligacao e dados do servidor');
  console.log('  /pos          - Mostra as coordenadas actuais dos bots');
  console.log('  /chat <msg>   - Envia uma mensagem para o chat do servidor');
  console.log('  /reload       - Recarrega settings.json');
  console.log('  /stop         - Desliga todos os bots e encerra a aplicacao');
}

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  const cmd = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  const [name, ...args] = cmd.split(' ');
  const command = name.toLowerCase();

  switch (command) {
    case 'help':
    case '?':
      printHelp();
      break;

    case 'server':
      manager.showStatus();
      break;

    case 'pos':
      manager.showPositions();
      break;

    case 'chat': {
      const msg = args.join(' ');
      if (!msg) {
        console.log('Uso: /chat <mensagem>');
      } else {
        manager.sendChat(msg);
      }
      break;
    }

    case 'reload':
      manager.reload();
      break;

    case 'stop':
    case 'exit':
    case 'quit':
      manager.stop();
      rl.close();
      process.exit(0);
      break;

    default:
      console.log(`Comando desconhecido: "${trimmed}". Digite /help para ver os comandos.`);
      break;
  }
});
