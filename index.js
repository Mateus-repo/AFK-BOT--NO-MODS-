const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');

const { instalarVersaoPadrao } = require('./src/versoes');

// Torna conhecida a versão configurada antes de o Mineflayer carregar a
// biblioteca de versões. Sem isto, o Mineflayer recusa a conta.
const compatVersao = instalarVersaoPadrao();

const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;
const mcDataLib = require('minecraft-data');

const { createConfig } = require('./src/config');
const { createI18n } = require('./src/i18n');
const { createLog } = require('./src/log');
const { createReconnect } = require('./src/reconnect');
const { criarMovimento } = require('./src/movimento');

const configPath = path.join(__dirname, 'settings.json');
const defaultConfigPath = path.join(__dirname, 'default.json');

const log = createLog({ dir: path.join(__dirname, 'logs') }).log;
const i18n = createI18n({ dir: path.join(__dirname, 'lang') });

// Função de tradução
function t(key) {
  return i18n.t(key);
}

const configStore = createConfig({
  configPath,
  defaultConfigPath,
  log,
  t
});

// A configuração viva. configStore.read() é quem a preenche; os comandos
// escrevem com config = configStore.save(...), que a volta a ler — daí a
// atribuição: sem ela, o bot voltaria a ligar-se com os valores antigos.
let config = null;

const RECONNECT = createReconnect({
  log,
  t,
  aoTentar: () => createBot()
});

let bot;
let currentLang = 'eng';
let movimento = null;

// Carrega um idioma; devolve false se o ficheiro não existir
function loadLanguage(lang) {
  if (i18n.load(lang)) {
    return true;
  }
  console.log(`[${lang}] ${t('error_lang_load')}`);
  return false;
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
    try {
      config = configStore.save({ 'bot-account': { username: newName } });
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
      config = configStore.save({
        server: { ip: parts[0], port: parts[1] ? parseInt(parts[1], 10) : 25565 }
      });
      console.log(`${t('cmd_changeserver')} ${config.server.ip}:${config.server.port}`);
      callback();
    } catch (err) {
      console.log(`${t('error_generic')} ${err}`);
    }
  });
}

/**
 * Liga ou desliga o movimento anti-AFK sem mexer na configuração.
 * Para mudar a configuração, editar o settings.json.
 */
function changeMovement(estado) {
  if (!estado) {
    if (movimento) {
      console.log(`${t('movement_stopped')} ${t('cmd_andar')}`);
      return;
    }
    console.log(t('syntax_andar'));
    return;
  }
  if (estado !== 'on' && estado !== 'off') {
    console.log(t('syntax_andar'));
    return;
  }
  if (estado === 'off') {
    desligarMovimento();
    console.log(t('movement_stopped'));
    return;
  }
  if (config.movement && config.movement.enabled === false) {
    config.movement.enabled = true;
  }
  if (bot && bot.entity && bot.entity.position) {
    ligarMovimento(bot.entity.position);
  } else {
    console.log(t('chat_bot_not_connected'));
    return;
  }
  console.log(t('movement_started'));
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
  RECONNECT.clear();
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
    RECONNECT.reset();
    log(t('bot_has_arrived'));
    // O movimento só faz sentido com o bot dentro do mundo
    if (bot && bot.entity && bot.entity.position) {
      ligarMovimento(bot.entity.position);
    }
  });

  bot.on('kicked', (reason, loggedIn) => {
    log(`${t('kicked_reason')} ${formatReason(reason)}`, 'WARN');
  });

  bot.on('error', (err) => {
    log(`${t('error_generic')} ${err}`, 'ERROR');
  });

  bot.on('end', () => {
    log(t('connection_closed'), 'WARN');
    desligarMovimento();
    RECONNECT.agendar(t('connection_closed'));
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

/**
 * Liga o movimento anti-AFK depois de o bot entrar no mundo.
 * O módulo decide se liga ou não, consoante a configuração.
 */
function ligarMovimento(posicao) {
  if (!bot) return;
  if (movimento) movimento.parar();
  movimento = criarMovimento({ bot, config: config.movement, log, t });
  if (!movimento.iniciar(posicao)) {
    log(t('movement_disabled_in_config'), 'INFO');
  }
}

function desligarMovimento() {
  if (movimento) {
    movimento.parar();
    movimento = null;
  }
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
    config = configStore.save({
      server: { ip: ipPart, port: portPart ? parseInt(portPart, 10) : 25565 }
    });
    console.log(`${t('cmd_changeserver')} ${config.server.ip}:${config.server.port}`);
    RECONNECT.desativar();
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
    config = configStore.save({ 'bot-account': { username: newName } });
    console.log(`${t('cmd_changename')} ${newName}`);
    RECONNECT.desativar();
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
    config = configStore.save({ server: { version: newVersion } });
    console.log(`${t('cmd_version')} ${newVersion}`);
    RECONNECT.desativar();
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
    config = configStore.save({ language: newLang });
    console.log(`${t('lang_changed')} ${newLang}`);
    rl.prompt();
  } catch (err) {
    console.log(`${t('error_generic')} ${err}`);
  }
}

function stopBot() {
  // Uma paragem propositada não deve ligar-se outra vez
  RECONNECT.desativar();
  desligarMovimento();
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
    config = configStore.read();
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
    config = configStore.save({ 'bot-account': { type: newType } });
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
            config = configStore.save({ 'bot-account': { username: email } });
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
          config = configStore.save({ 'bot-account': { username: email } });
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
  console.log(t('help_command_andar'));
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
  RECONNECT.ativar();
  config = configStore.read();
  // O patch das versões é feito antes do Mineflayer carregar; só agora se pode
  // dizer o que aconteceu, já com o log e o idioma prontos.
  if (compatVersao.aplicada) {
    log(t('version_patch_applied'), 'INFO');
  } else if (compatVersao.motivo && !compatVersao.motivo.includes('já conhece')) {
    log(`${t('version_patch_failed')} ${compatVersao.motivo}`, 'WARN');
  }
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
    case 'andar':
      changeMovement(args[0]);
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
