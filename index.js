const fs = require('fs');
const path = require('path');
const readline = require('readline');

function setupMinecraft263Compat() {
  const minecraftData = require('minecraft-data');
  const data = require('minecraft-data/data.js');

  const v263 = {
    minecraftVersion: '26.3',
    version: 777,
    dataVersion: 5023,
    usesNetty: true,
    majorVersion: '26.3',
    releaseType: 'release'
  };

  if (!data.pc['26.3'] && data.pc['26.1']) {
    const proto = JSON.parse(JSON.stringify(data.pc['26.1'].protocol));

    proto.configuration.toClient.types.packet[1][0].type[1].mappings = {
      '0x00': 'cookie_request',
      '0x01': 'custom_payload',
      '0x02': 'disconnect',
      '0x03': 'finish_configuration',
      '0x04': 'keep_alive',
      '0x05': 'ping',
      '0x06': 'reset_chat',
      '0x07': 'registry_data',
      '0x08': 'remove_resource_pack',
      '0x09': 'add_resource_pack',
      '0x0a': 'store_cookie',
      '0x0b': 'transfer',
      '0x0c': 'unknown_0x0c',
      '0x0d': 'feature_flags',
      '0x0e': 'tags',
      '0x0f': 'select_known_packs',
      '0x10': 'custom_report_details',
      '0x11': 'server_links',
      '0x12': 'clear_dialog',
      '0x13': 'show_dialog',
      '0x14': 'code_of_conduct'
    };
    proto.configuration.toClient.types.packet_unknown_0x0c = ['container', []];

    const m261 = proto.play.toClient.types.packet[1][0].type[1].mappings;
    const m263 = {};
    for (const [k, name] of Object.entries(m261)) {
      const num = parseInt(k, 16);
      let shifted;
      if (num <= 0x22) {
        shifted = num;
      } else if (num <= 0x5d) {
        shifted = num + 1;
      } else if (num <= 0x77) {
        shifted = num + 2;
      } else {
        shifted = num + 3;
      }
      const hex = '0x' + shifted.toString(16).padStart(2, '0');
      m263[hex] = name;
    }
    m263['0x23'] = 'unknown_0x23';
    m263['0x5f'] = 'unknown_0x5f';
    m263['0x7a'] = 'unknown_0x7a';
    m263['0x7b'] = 'unknown_0x7b';
    proto.play.toClient.types.packet_unknown_0x23 = ['container', []];
    proto.play.toClient.types.packet_unknown_0x5f = ['container', []];
    proto.play.toClient.types.packet_unknown_0x7a = ['container', []];
    proto.play.toClient.types.packet_unknown_0x7b = ['container', []];
    proto.play.toClient.types.packet[1][0].type[1].mappings = m263;

    proto.play.toServer.types.packet_teleport_confirm = [
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

    data.pc['26.3'] = {
      ...data.pc['26.1'],
      protocol: proto
    };

    Object.defineProperty(data.pc['26.3'], 'version', {
      get: () => v263,
      enumerable: true,
      configurable: true
    });
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

    const ChunkColumn = require('prismarine-chunk/src/pc/1.18/ChunkColumn');
    const origLoadParsedLight = ChunkColumn.prototype.loadParsedLight;
    ChunkColumn.prototype.loadParsedLight = function (skyLight, blockLight, skyLightMask, blockLightMask, emptySkyLightMask, emptyBlockLightMask) {
      try {
        return origLoadParsedLight.call(this, skyLight, blockLight, skyLightMask, blockLightMask, emptySkyLightMask, emptyBlockLightMask);
      } catch {}
    };
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
    activeDurationSeconds: Number(parsed.movement?.activeDurationSeconds) || 180,
    pauseDurationSeconds: Number(parsed.movement?.pauseDurationSeconds) || 30,
    radius: Number(parsed.movement?.radius) || 4
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
    this.usernameTemplate = username || 'botxxxx';
    this.username = this.generateNickname();
    this.config = config;
    this.instance = null;
    this.spawnPosition = null;
    this.movementTickListener = null;
    this.phaseTimer = null;
    this.afkPhase = 'stopped';
    this.currentYaw = 0;
    this.reconnectTimer = null;
    this.connectTimeoutTimer = null;
    this.reconnectAttempts = 0;
    this.shouldRun = true;
    this.status = 'disconnected';
  }

  generateNickname() {
    const template = this.usernameTemplate || 'botxxxx';
    if (/[xX]/.test(template)) {
      return template.replace(/[xX]/g, () => Math.floor(Math.random() * 10));
    }
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${template.slice(0, 10)}_${suffix}`;
  }

  start() {
    this.shouldRun = true;
    this.connect();
  }

  stop() {
    this.shouldRun = false;
    this.cleanupCurrentInstance();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.status = 'stopped';
  }

  cleanupCurrentInstance() {
    this.stopAfkMovement();
    if (this.connectTimeoutTimer) {
      clearTimeout(this.connectTimeoutTimer);
      this.connectTimeoutTimer = null;
    }
    if (this.instance) {
      const oldBot = this.instance;
      this.instance = null;
      try {
        oldBot.removeAllListeners();
        oldBot.on('error', () => {});
        oldBot.quit();
      } catch {}
      try {
        if (oldBot._client) {
          oldBot._client.removeAllListeners();
          oldBot._client.on('error', () => {});
          oldBot._client.end();
          if (oldBot._client.socket) {
            oldBot._client.socket.destroy();
          }
        }
      } catch {}
    }
  }

  clearTimers() {
    this.cleanupCurrentInstance();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  handleDisconnect(reason, trigger = 'desconhecido') {
    if (!this.shouldRun) return;
    if (this.status === 'disconnected' || this.status === 'reconnecting') return;
    this.status = 'disconnected';
    console.log(`[${this.username}] Conexao terminada (${trigger}: ${reason || 'desconectado'}).`);
    this.cleanupCurrentInstance();
    this.scheduleReconnect();
  }

  connect() {
    if (!this.shouldRun) return;
    this.clearTimers();
    this.status = 'connecting';
    this.username = this.generateNickname();

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

    // Temporizador de seguranca caso o servidor nao responda ou fique preso no handshake
    this.connectTimeoutTimer = setTimeout(() => {
      if (this.status === 'connecting' || this.status === 'logged_in') {
        console.log(`[${this.username}] Tempo limite de conexao esgotado (35s). A reiniciar tentativa...`);
        this.handleDisconnect('tempo limite esgotado', 'timeout');
      }
    }, 35000);

    try {
      this.instance = mineflayer.createBot(botOptions);
      this.attachEvents(this.instance);
    } catch (err) {
      console.log(`[${this.username}] Falha ao criar instancia: ${err.message}`);
      this.handleDisconnect(err.message, 'erro_inicializacao');
    }
  }

  attachEvents(bot) {
    bot.once('login', () => {
      if (this.instance !== bot) return;
      this.status = 'logged_in';
      console.log(`[${this.username}] Sessao iniciada no servidor.`);
    });

    bot.once('spawn', () => {
      if (this.instance !== bot) return;
      this.status = 'spawned';
      this.reconnectAttempts = 0;
      if (this.connectTimeoutTimer) {
        clearTimeout(this.connectTimeoutTimer);
        this.connectTimeoutTimer = null;
      }
      setTimeout(() => {
        if (this.instance !== bot) return;
        if (bot.entity?.position) {
          this.spawnPosition = bot.entity.position.clone();
          console.log(`[${this.username}] Entrou no mundo nas coordenadas: ${this.formatCoords(this.spawnPosition)}`);
          this.startAfkMovement();
        }
      }, 1500);
    });

    bot.on('forcedMove', () => {
      if (this.instance !== bot) return;
      if (!this.spawnPosition || this.spawnPosition.distanceTo(bot.entity.position) > 20) {
        this.spawnPosition = bot.entity.position.clone();
      }
    });

    bot.on('death', () => {
      if (this.instance !== bot) return;
      this.stopAfkMovement();
      console.log(`[${this.username}] O bot morreu. A renascer automaticamente...`);
      setTimeout(() => {
        if (this.instance !== bot) return;
        try {
          bot.respawn();
        } catch {}
      }, 1000);
    });

    bot.on('chat', (sender, message) => {
      if (this.instance !== bot) return;
      if (sender === this.username) return;
      if (message.startsWith('!ping')) {
        bot.chat('pong');
      }
    });

    bot.on('kicked', (reason) => {
      if (this.instance !== bot) return;
      let parsed = reason;
      try {
        if (typeof reason === 'string') {
          const json = JSON.parse(reason);
          parsed = json.text || json.extra?.map(e => e.text).join('') || reason;
        } else if (typeof reason === 'object') {
          parsed = reason.text || reason.value || reason.translate || JSON.stringify(reason);
        }
      } catch {}
      const reasonStr = typeof parsed === 'object' ? JSON.stringify(parsed) : String(parsed);
      console.log(`[${this.username}] Expulso do servidor: ${reasonStr}`);
      this.handleDisconnect(reasonStr, 'expulso');
    });

    bot.on('error', (err) => {
      if (this.instance !== bot) return;
      if (err.code === 'ECONNREFUSED') {
        console.log(`[${this.username}] Servidor offline ou conexao recusada em ${this.config.server.ip}:${this.config.server.port}`);
      } else {
        console.log(`[${this.username}] Erro de rede: ${err.message}`);
      }
      this.handleDisconnect(err.message, 'erro_rede');
    });

    bot.on('end', (reason) => {
      if (this.instance !== bot) return;
      this.handleDisconnect(reason || 'socketClosed', 'socket');
    });

    this.patchTeleportConfirm(bot);
  }

  patchTeleportConfirm(bot) {
    if (!bot._client) return;
    const originalWrite = bot._client.write.bind(bot._client);

    bot._client.write = (packetName, params) => {
      if (packetName === 'teleport_confirm' && params && typeof params === 'object') {
        if (params.x === undefined) {
          const pos = bot.entity?.position || { x: 0, y: 0, z: 0 };
          params.x = pos.x;
          params.y = pos.y;
          params.z = pos.z;
          params.yRot = params.yRot || 0;
          params.xRot = params.xRot || 0;
        }
      }
      return originalWrite(packetName, params);
    };
  }

  startAfkMovement() {
    if (!this.config.movement.enabled) return;
    this.stopAfkMovement();

    this.afkPhase = 'moving';
    const activeSec = this.config.movement.activeDurationSeconds || 180;
    const R = this.config.movement.radius || 1.2;
    console.log(`[${this.username}] Ciclo anti-AFK iniciado: a andar em circulo de raio ${R}m e a saltar continuamente (${activeSec}s ativo)...`);

    let center = null;
    if (this.config.movement.fixedCenter && typeof this.config.movement.fixedCenter.x === 'number') {
      const fc = this.config.movement.fixedCenter;
      center = new (require('vec3'))(fc.x, fc.y || 134, fc.z);
    } else if (this.spawnPosition) {
      center = this.spawnPosition.clone();
    }

    const LOOK_AHEAD_ANGLE = Math.PI / 3; // 60 graus a frente na circunferencia
    let direction = 1; // 1 = sentido horario, -1 = anti-horario
    let lastPos = null;
    let stuckTicks = 0;
    let stuckCount = 0;

    this.movementTickListener = () => {
      const bot = this.instance;
      if (!bot || this.status !== 'spawned' || !bot.entity?.position) return;

      if (this.afkPhase === 'moving') {
        bot.setControlState('forward', true);
        bot.setControlState('jump', true);

        const current = bot.entity.position;
        if (!center) center = current.clone();
        if (!lastPos) lastPos = current.clone();

        // 1. Detecao de bloqueio por obstaculo
        const distMoved = Math.hypot(current.x - lastPos.x, current.z - lastPos.z);
        lastPos = current.clone();

        if (distMoved < 0.02) {
          stuckTicks++;
          if (stuckTicks >= 12) { // 600ms bloqueado
            stuckTicks = 0;
            stuckCount++;
            if (stuckCount >= 2 && !this.config.movement.fixedCenter) {
              center = current.clone();
              direction = Math.random() < 0.5 ? 1 : -1;
              stuckCount = 0;
            } else {
              direction *= -1; // Inverte o sentido de rotacao para contornar obstaculo
            }
          }
        } else {
          if (stuckTicks > 0) stuckTicks--;
          if (distMoved > 0.05) stuckCount = 0;
        }

        // 2. Adaptacao de elevacao se mudar de patamar
        if (bot.entity.onGround && Math.abs(current.y - center.y) > 1.2 && !this.config.movement.fixedCenter) {
          center = current.clone();
        }

        // 3. Calculo do ponto alvo no perimetro do circulo
        const dx = current.x - center.x;
        const dz = current.z - center.z;
        const currentAngle = Math.atan2(dz, dx);
        const targetAngle = currentAngle + direction * LOOK_AHEAD_ANGLE;
        const targetX = center.x + R * Math.cos(targetAngle);
        const targetZ = center.z + R * Math.sin(targetAngle);

        // 4. Orientacao suave em direcao ao ponto alvo
        const toTargetX = targetX - current.x;
        const toTargetZ = targetZ - current.z;
        const desiredYaw = Math.atan2(-toTargetX, -toTargetZ);

        let diff = (desiredYaw - bot.entity.yaw) % (Math.PI * 2);
        if (diff < -Math.PI) diff += Math.PI * 2;
        if (diff > Math.PI) diff -= Math.PI * 2;
        const newYaw = bot.entity.yaw + diff * 0.4;

        bot.look(newYaw, 0, true);
      } else if (this.afkPhase === 'paused') {
        bot.clearControlStates();
      }
    };

    this.instance.on('physicsTick', this.movementTickListener);
    this.scheduleNextAfkPhase();
  }

  scheduleNextAfkPhase() {
    if (this.phaseTimer) clearTimeout(this.phaseTimer);

    if (this.afkPhase === 'moving') {
      const activeMs = (this.config.movement.activeDurationSeconds || 180) * 1000;
      this.phaseTimer = setTimeout(() => {
        if (this.status !== 'spawned' || !this.instance) return;
        this.afkPhase = 'paused';
        if (this.instance) {
          this.instance.clearControlStates();
        }
        const pauseSec = this.config.movement.pauseDurationSeconds || 30;
        console.log(`[${this.username}] Pausa anti-AFK: parado durante ${pauseSec} segundos...`);
        this.scheduleNextAfkPhase();
      }, activeMs);
    } else if (this.afkPhase === 'paused') {
      const pauseMs = (this.config.movement.pauseDurationSeconds || 30) * 1000;
      this.phaseTimer = setTimeout(() => {
        if (this.status !== 'spawned' || !this.instance) return;
        this.afkPhase = 'moving';
        const activeSec = this.config.movement.activeDurationSeconds || 180;
        console.log(`[${this.username}] A retomar ciclo anti-AFK: a andar em circulos e a saltar continuamente (${activeSec}s ativo)...`);
        this.scheduleNextAfkPhase();
      }, pauseMs);
    }
  }

  stopAfkMovement() {
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    if (this.movementTickListener && this.instance) {
      this.instance.removeListener('physicsTick', this.movementTickListener);
      this.movementTickListener = null;
    }
    if (this.instance) {
      try {
        this.instance.clearControlStates();
      } catch {}
    }
    this.afkPhase = 'stopped';
  }

  scheduleReconnect() {
    if (!this.shouldRun || !this.config.reconnect.enabled) return;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.status = 'reconnecting';
    this.reconnectAttempts++;
    const base = this.config.reconnect.initialDelaySeconds || 5;
    const max = this.config.reconnect.maxDelaySeconds || 60;
    const delay = Math.min(base * Math.pow(1.3, this.reconnectAttempts - 1), max);

    console.log(`[${this.username}] A reconectar em ${Math.round(delay)} segundos (tentativa ${this.reconnectAttempts})...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
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

if (require.main === module) {
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
}

module.exports = { BotSession, BotManager, loadSettings };
