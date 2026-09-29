const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const mcDataLib = require('minecraft-data');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const configPath = path.join(__dirname, 'settings.json');
const defaultConfigPath = path.join(__dirname, 'default.json');

// Valores de recurso para quando o settings.json não existe ou não pode ser
// lido. Têm o mesmo formato do default.json.
const FALLBACK_CONFIG = {
  server: { ip: '', port: 25565, version: '1.20.4' },
  'bot-account': { type: 'mojang', username: 'bot_placeholder', password: '' },
  language: 'eng',
  maxRam: '1G'
};

let config = null;
// Cópia do que está no disco, para escrever uma opção não apagar campos que o
// utilizador ou uma versão futura do bot acrescentaram.
let rawConfig = null;
let bot;
let messages = {};
let currentLang = 'eng';

// Função para carregar arquivo de idioma
function loadLanguage(lang) {
  const filePath = path.join(__dirname, 'lang', `${lang}.txt`);
  if (!fs.existsSync(filePath)) {
    console.log(`[${lang}] ${t('error_lang_load')}`);
    return false;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  messages = {};
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.substring(0, idx).trim();
    const value = line.substring(idx + 1).trim();
    messages[key] = value;
  }
  return true;
}

// Função de tradução
function t(key) {
  return messages[key] || key;
}

// Formata timestamp para logs
function formatTimestamp(date) {
  const YYYY = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const DD = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const mmm = String(date.getMilliseconds()).padStart(3, '0');
  return `[${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss}.${mmm}]`;
}

// Configurando o log
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}
const logStream = fs.createWriteStream(path.join(logsDir, 'latest.log'), { flags: 'a' });
function log(text, type = 'INFO') {
  const timestamp = formatTimestamp(new Date());
  const line = `${timestamp} [${type}] ${text}\n`;
  logStream.write(line);
  console.log(line.trim());
}

// Carrega idioma inicial
if (!loadLanguage(currentLang)) {
  currentLang = 'eng';
  loadLanguage(currentLang);
}

// ---------------------------------------------------------------- configuração

/** Valores por omissão vindos do default.json (ou dos internos). */
function readDefaultConfig() {
  try {
    const base = JSON.parse(fs.readFileSync(defaultConfigPath, 'utf8'));
    return {
      ...FALLBACK_CONFIG,
      ...base,
      server: { ...FALLBACK_CONFIG.server, ...(base.server || {}) },
      'bot-account': { ...FALLBACK_CONFIG['bot-account'], ...(base['bot-account'] || {}) }
    };
  } catch {
    return FALLBACK_CONFIG;
  }
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Lê o settings.json e completa o que falta com o default.json.
 * Nunca lança: o bot arranca sempre com alguma coisa e avisa do que está errado.
 */
function configRead() {
  let fromDisk = {};
  let estado = null;

  try {
    const bruto = fs.readFileSync(configPath, 'utf8');
    fromDisk = JSON.parse(bruto);
    if (!isPlainObject(fromDisk)) {
      fromDisk = {};
      estado = 'config_not_object';
    }
  } catch (err) {
    fromDisk = {};
    estado = err.code === 'ENOENT' ? 'config_missing' : 'config_unreadable';
    if (estado === 'config_unreadable') {
      log(`${t('config_unreadable')} ${err.message}`, 'ERROR');
    }
  }

  const base = readDefaultConfig();
  const final = {
    ...base,
    ...fromDisk,
    server: { ...base.server, ...(fromDisk.server || {}) },
    'bot-account': { ...base['bot-account'], ...(fromDisk['bot-account'] || {}) }
  };

  if (final.server) {
    const port = parseInt(final.server.port, 10);
    final.server.port = Number.isInteger(port) && port > 0 && port <= 65535 ? port : base.server.port;
    final.server.version = String(final.server.version || base.server.version);
  }
  if (final['bot-account'] && !['mojang', 'microsoft'].includes(final['bot-account'].type)) {
    final['bot-account'].type = 'mojang';
  }

  if (estado === 'config_missing' || estado === 'config_not_object') {
    log(t(estado), 'WARN');
  } else if (!fromDisk.server || !fromDisk['bot-account']) {
    log(t('config_filled'), 'WARN');
  }

  rawConfig = fromDisk;
  return final
}

/** Junta alterações a um objecto sem perder o que já lá estava. */
function deepMerge(base, updates) {
  const resultado = isPlainObject(base) ? { ...base } : {};
  for (const [chave, valor] of Object.entries(updates || {})) {
    resultado[chave] = isPlainObject(valor) ? deepMerge(resultado[chave], valor) : valor;
  }
  return resultado
}

/**
 * Grava alterações na configuração preservando os campos que o bot não conhece.
 */
function configSave(updates) {
  const merged = deepMerge(rawConfig || {}, updates);
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
  rawConfig = merged;
  config = configRead();
  return merged
}

// ------------------------------------------------------------------ reconexão

const RECONNECT = {
  ativo: false,
  tentativa: 0,
  maxTentativas: 10,
  atrasoMinimo: 1000,
  atrasoMaximo: 60000,
  temporizador: null
};

function clearReconnect() {
  if (RECONNECT.temporizador) {
    clearTimeout(RECONNECT.temporizador);
    RECONNECT.temporizador = null;
  }
}

/** Mudança deliberada: o bot não se deve ligar sozinho a seguir. */
function semReconexao() {
  RECONNECT.ativo = false;
  clearReconnect();
}

/** Tenta ligar-se outra vez, com recuo exponencial até RECONNECT.atrasoMaximo. */
function scheduleReconnect(motivo) {
  if (!RECONNECT.ativo) return;
  if (RECONNECT.tentativa >= RECONNECT.maxTentativas) {
    log(t('reconnect_give_up'), 'ERROR');
    return;
  }
  RECONNECT.tentativa += 1;
  const atraso = Math.min(
    RECONNECT.atrasoMinimo * Math.pow(2, RECONNECT.tentativa - 1),
    RECONNECT.atrasoMaximo
  );
  const segundos = Math.round(atraso / 1000);
  log(
    `${t('reconnect_wait')} ${segundos}s (motivo: ${motivo}, tentativa ${RECONNECT.tentativa}/${RECONNECT.maxTentativas})`,
    'WARN'
  );
  RECONNECT.temporizador = setTimeout(() => {
    RECONNECT.temporizador = null;
    createBot();
  }, atraso);
}

// Gera nome aleatório do formato bot_<6chars>
function getRandomBotName() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'bot_' + suffix;
}

// Ajusta nome do bot se não iniciar com "bot_"
function ensureBotName() {
  let username = config['bot-account']['username'];
  if (!username.startsWith('bot_')) {
    const newName = getRandomBotName();
    try {
      configSave({ 'bot-account': { username: newName } });
      console.log(`${t('cmd_changename')} ${newName}`);
    } catch (err) {
      console.log(`${t('error_generic')} ${err}`);
    }
  }
}

// Prompt para configurar o servidor se não definido
function promptServerSetup(callback) {
  console.log(t('prompt_server_setup'));
  rl.question('', (input) => {
    const val = input.trim();
    if (!val) {
      console.log(t('error_invalid_server'));
      return promptServerSetup(callback);
    }
    const parts = val.split(':');
    try {
      configSave({
        server: { ip: parts[0], port: parts[1] ? parseInt(parts[1], 10) : 25565 }
      });
      console.log(`${t('cmd_changeserver')} ${config.server.ip}:${config.server.port}`);
      callback();
    } catch (err) {
      console.log(`${t('error_generic')} ${err}`);
    }
  });
}

// Função para recarregar/reiniciar o script
function reloadScript() {
  // Limpa console
  process.stdout.write('\x1B[2J\x1B[0f');
  // Respawn do script
  const proc = spawn(process.argv[0], [process.argv[1]], { stdio: 'inherit' });
  proc.on('close', (code) => {
    process.exit(code);
  });
}

// Cria e conecta o bot
function createBot() {
  clearReconnect();
  const authType = config['bot-account']['type'];
  const username = config['bot-account']['username'];
  const password = config['bot-account']['password'] || undefined;
  const authMethod = authType === 'microsoft' ? 'microsoft' : 'mojang';

  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    version: config.server.version,
    username: username,
    password: authMethod === 'microsoft' ? password : undefined,
    auth: authMethod
  });

  bot.on('login', () => {
    log(t('login_success'));
  });

  bot.on('spawn', () => {
    RECONNECT.tentativa = 0;
    log(t('bot_has_arrived'));
  });

  bot.on('kicked', (reason, loggedIn) => {
    log(`${t('kicked_reason')} ${formatReason(reason)}`, 'WARN');
  });

  bot.on('error', (err) => {
    log(`${t('error_generic')} ${err}`, 'ERROR');
  });

  bot.on('end', () => {
    log(t('connection_closed'), 'WARN');
    scheduleReconnect(t('connection_closed'));
  });
}

// O servidor manda a razão da expulsão em vários formatos; mostra sempre texto.
function formatReason(reason) {
  if (typeof reason === 'string') return reason;
  if (reason && typeof reason === 'object') {
    if (typeof reason.message === 'string') return reason.message;
    if (Array.isArray(reason.with) && reason.with.length) {
      return [reason.translate, ...reason.with].filter(Boolean).join(' ');
    }
    try {
      return JSON.stringify(reason);
    } catch {
      return String(reason);
    }
  }
  return String(reason);
}

// Comandos auxiliares
function showServer() {
  console.log(`${t('cmd_server')} ${config.server.ip}:${config.server.port} (v${config.server.version})`);
}

function changeServer(newServer) {
  if (!newServer) {
    console.log(t('syntax_changeserver'));
    return;
  }
  const parts = newServer.split(':');
  const ipPart = parts[0];
  const portPart = parts[1];
  try {
    configSave({
      server: { ip: ipPart, port: portPart ? parseInt(portPart, 10) : 25565 }
    });
    console.log(`${t('cmd_changeserver')} ${config.server.ip}:${config.server.port}`);
    semReconexao();
    if (bot) bot.quit('Server changed');
    createBot();
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

function changeName(newName) {
  if (!newName) {
    console.log(t('syntax_changename'));
    return;
  }
  try {
    configSave({ 'bot-account': { username: newName } });
    console.log(`${t('cmd_changename')} ${newName}`);
    semReconexao();
    if (bot) bot.quit('Name changed');
    createBot();
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

function chatInGame(message) {
  if (!bot || !bot.chat) {
    console.log(t('chat_bot_not_connected'));
    return;
  }
  bot.chat(message);
}

function showPosition() {
  if (!bot || !bot.entity) {
    console.log(t('pos_unavailable'));
    return;
  }
  const pos = bot.entity.position;
  console.log(`${t('cmd_pos')} x=${pos.x.toFixed(2)}, y=${pos.y.toFixed(2)}, z=${pos.z.toFixed(2)}`);
}

function showPing() {
  if (!bot || !bot.players || !bot.players[bot.username] || bot.players[bot.username].ping === undefined) {
    console.log(t('ping_unavailable'));
    return;
  }
  const ping = bot.players[bot.username].ping;
  console.log(`${t('cmd_ping')} ${ping} ms`);
}

function changeRAM() {
  console.log(t('ram_restarting'));
}

function changeVersion(newVersion) {
  if (!newVersion) {
    console.log(`${t('cmd_version')} ${config.server.version}`);
    return;
  }
  if (!newVersion.startsWith('1.')) {
    console.log(t('error_invalid_version'));
    return;
  }
  try {
    configSave({ server: { version: newVersion } });
    console.log(`${t('cmd_version')} ${newVersion}`);
    semReconexao();
    if (bot) bot.quit('Version changed');
    createBot();
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

function changeLanguage(newLang) {
  if (!newLang) {
    console.log(t('syntax_lang'));
    return;
  }
  if (!loadLanguage(newLang)) {
    return;
  }
  try {
    configSave({ language: newLang });
    console.log(`${t('lang_changed')} ${newLang}`);
    rl.prompt();
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

function stopBot() {
  // Uma paragem propositada não deve ligar-se outra vez
  semReconexao();
  if (bot) bot.quit('Shutting down');
  process.exit(0);
}

/**
 * Função que trata o comando /default
 */
function defaultConfig() {
  try {
    // Guarda uma cópia do que ia ser perdido
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, configPath + '.bak');
    }
    fs.copyFileSync(defaultConfigPath, configPath);
    config = configRead();
    console.log(t('cmd_default'));
    ensureBotName();
    if (!config.server.ip) {
      promptServerSetup(() => {
        createBot();
      });
    } else {
      createBot();
    }
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

/**
 * Função que trata o comando /changetype
 */
function changeType(newType) {
  newType = (newType || '').toLowerCase();
  if (!['mojang', 'microsoft'].includes(newType)) {
    console.log(t('syntax_changetype'));
    return;
  }
  try {
    configSave({ 'bot-account': { type: newType } });
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
    return;
  }
  console.log(`${t('cmd_changetype')} ${newType}`);
  if (bot) {
    if (newType === 'microsoft') {
      bot.once('end', () => {
        rl.question(`${t('prompt_email')} `, (email) => {
          email = email.trim();
          if (!email) {
            console.log(t('error_invalid_email'));
            rl.prompt();
            return;
          }
          try {
            configSave({ 'bot-account': { username: email } });
            console.log(t('email_saved'));
          } catch (err) {
            console.log(`${t('error_generic')} ${err}`);
            rl.prompt();
            return;
          }
          createBot();
          rl.prompt();
        });
      });
    }
    bot.quit('Changing account type');
    if (newType === 'mojang') {
      createBot();
      rl.prompt();
    }
  } else {
    if (newType === 'microsoft') {
      rl.question(`${t('prompt_email')} `, (email) => {
        email = email.trim();
        if (!email) {
          console.log(t('error_invalid_email'));
          rl.prompt();
          return;
        }
        try {
          configSave({ 'bot-account': { username: email } });
          console.log(t('email_saved'));
        } catch (err) {
          console.log(`${t('error_generic')} ${err}`);
          rl.prompt();
          return;
        }
        createBot();
        rl.prompt();
      });
    } else {
      createBot();
      rl.prompt();
    }
  }
}

/**
 * Função que trata o comando /typeinfo
 */
function typeInfo() {
  const currentType = config['bot-account']['type'];
  console.log(`${t('cmd_typeinfo')} ${currentType}`);
}

/**
 * Função que exibe a lista de comandos disponíveis no terminal
 */
function showHelp() {
  console.log(t('help_header'));
  console.log(t('help_command_stop'));
  console.log(t('help_command_server'));
  console.log(t('help_command_changeserver'));
  console.log(t('help_command_changename'));
  console.log(t('help_command_chat'));
  console.log(t('help_command_pos'));
  console.log(t('help_command_ping'));
  console.log(t('help_command_ram'));
  console.log(t('help_command_version'));
  console.log(t('help_command_lang'));
  console.log(t('help_command_changetype'));
  console.log(t('help_command_typeinfo'));
  console.log(t('help_command_default'));
  console.log(t('help_command_reload'));
  console.log(t('help_command_restart'));
  console.log(t('help_command_help'));
}

// Interface de leitura de comandos no terminal
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '> '
});

// Antes de criar o bot, verificar servidor e nome
function init() {
  RECONNECT.ativo = true;
  config = configRead();
  if (config.language && config.language !== currentLang) {
    currentLang = config.language;
    if (!loadLanguage(currentLang)) {
      currentLang = 'eng';
      loadLanguage(currentLang);
    }
  }
  ensureBotName();
  if (!config.server.ip) {
    promptServerSetup(createBot);
  } else {
    createBot();
  }
}

rl.prompt();
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('/')) {
    console.log(t('error_unknown_command'));
    rl.prompt();
    return;
  }
  const parts = trimmed.split(' ');
  const rawCmd = parts.shift();
  const cmd = rawCmd.slice(1).toLowerCase();
  const args = parts;

  switch (cmd) {
    case 'stop':
      stopBot();
      break;
    case 'server':
      showServer();
      break;
    case 'changeserver':
      changeServer(args[0]);
      break;
    case 'changename':
      changeName(args[0]);
      break;
    case 'changetype':
      changeType(args[0]);
      break;
    case 'typeinfo':
      typeInfo();
      break;
    case 'chat':
      chatInGame(args.join(' '));
      break;
    case 'pos':
      showPosition();
      break;
    case 'ping':
      showPing();
      break;
    case 'ram':
      changeRAM();
      break;
    case 'version':
      changeVersion(args[0]);
      break;
    case 'lang':
      changeLanguage(args[0]);
      break;
    case 'default':
      defaultConfig();
      break;
    case 'reload':
      reloadScript();
      break;
    case 'restart':
      reloadScript();
      break;
    case 'help':
      showHelp();
      break;
    default:
      console.log(t('error_unknown_command'));
  }
  rl.prompt();
}).on('close', () => {
  stopBot();
});

// Inicia o bot com verificações iniciais
init();
