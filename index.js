const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const mcDataLib = require('minecraft-data');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const configPath = path.join(__dirname, 'settings.json');
let config = require(configPath);

let bot;
let messages = {};
let currentLang = config.language || 'eng';

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
    config['bot-account']['username'] = newName;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`${t('cmd_changename')} ${newName}`);
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
    config.server.ip = parts[0];
    config.server.port = parts[1] ? parseInt(parts[1], 10) : 25565;
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
    log(t('bot_has_arrived'));
  });

  bot.on('kicked', (reason, loggedIn) => {
    log(t('kicked_reason') + ' ' + reason, 'WARN');
  });

  bot.on('error', (err) => {
    log(t('error_generic') + ' ' + err, 'ERROR');
  });

  bot.on('end', () => {
    log(t('connection_closed'), 'WARN');
  });
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
  config.server.ip = ipPart;
  config.server.port = portPart ? parseInt(portPart, 10) : 25565;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`${t('cmd_changeserver')} ${config.server.ip}:${config.server.port}`);
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
  config['bot-account']['username'] = newName;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`${t('cmd_changename')} ${newName}`);
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
  config.server.version = newVersion;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`${t('cmd_version')} ${newVersion}`);
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
  config.language = newLang;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`${t('lang_changed')} ${newLang}`);
    rl.prompt();
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

function stopBot() {
  if (bot) bot.quit('Shutting down');
  process.exit(0);
}

/**
 * Função que trata o comando /default
 */
function defaultConfig() {
  try {
    fs.copyFileSync(path.join(__dirname, 'default.json'), configPath);
    config = require(configPath);
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
  config['bot-account']['type'] = newType;
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
          config['bot-account']['username'] = email;
          try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
        config['bot-account']['username'] = email;
        try {
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
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
