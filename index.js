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
const { gerarNome, normalizarBots, criarGerenciador } = require('./src/sessoes');
const deteccao = require('./src/deteccao');

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

// O gerenciador de sessões. `bot` continua a ser a sessão principal, para
// que os comandos antigos (/pos, /ping, /chat) não mudem de comportamento.
let bot = null;
let gerenciador = null;
// O que descobrimos sobre o servidor: versão, protocolo, jogadores.
let infoServidor = null;
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

/**
 * Cria uma sessão: uma instância do Mineflayer, com o seu movimento e a sua
 * reconexão. Uma sessão caída não afecta as outras.
 */
function criarSessao(configBot) {
  const nome = gerarNome(configBot.username);
  const reconexao = createReconnect({
    log,
    t,
    aoTentar: () => {
      s.nome = gerarNome(configBot.username);
      s.ligar();
    }
  });
  const movimentoSessao = { instancia: null };

  const s = {
    nome,
    estado: 'desligado',
    bot: null,
    ligar() {
      reconexao.clear();
      reconexao.ativar();
      const authMethod = configBot.type === 'microsoft' ? 'microsoft' : 'mojang';
      s.estado = 'a_ligar';
      s.bot = mineflayer.createBot({
        host: config.server.ip,
        port: config.server.port,
        version: versaoParaLigar(),
        username: s.nome,
        password: authMethod === 'microsoft' ? configBot.password || undefined : undefined,
        auth: authMethod
      });
      s.bot.once('login', () => {
        s.estado = 'ligada';
        log(`${t('login_success')} [${s.nome}]`);
      });
      s.bot.once('spawn', () => {
        s.estado = 'no_mundo';
        reconexao.reset();
        log(`${t('bot_has_arrived')} [${s.nome}]`);
        if (s.bot.entity && s.bot.entity.position) {
          movimentoSessao.instancia = criarMovimento({ bot: s.bot, config: config.movement, log, t });
          if (!movimentoSessao.instancia.iniciar(s.bot.entity.position)) {
            log(t('movement_disabled_in_config'), 'INFO');
          }
        }
      });
      s.bot.on('kicked', (reason) => {
        s.estado = 'expulso';
        log(`${t('kicked_reason')} ${formatReason(reason)} [${s.nome}]`, 'WARN');
      });
      s.bot.on('error', (err) => {
        log(`${t('error_generic')} ${err} [${s.nome}]`, 'ERROR');
      });
      s.bot.on('end', () => {
        s.estado = 'desligado';
        log(`${t('connection_closed')} [${s.nome}]`, 'WARN');
        if (movimentoSessao.instancia) {
          movimentoSessao.instancia.parar();
          movimentoSessao.instancia = null;
        }
        reconexao.agendar(t('connection_closed'));
      });
      return s;
    },
    parar() {
      s.estado = 'parado';
      reconexao.desativar();
      if (movimentoSessao.instancia) {
        movimentoSessao.instancia.parar();
        movimentoSessao.instancia = null;
      }
      if (s.bot) {
        try {
          s.bot.removeAllListeners('end');
          s.bot.quit('A parar');
        } catch {
          // o bot pode já estar desligado
        }
      }
    },
    movimento: () => movimentoSessao.instancia
  };
  return s;
}

/** Liga todas as sessões da configuração. */
function createBot() {
  RECONNECT.clear();
  const bots = normalizarBots(config);
  gerenciador = criarGerenciador({
    criarSessao,
    log,
    t
  });
  for (const b of bots) gerenciador.adicionar(b);
  const quantas = gerenciador.ligarTodas();
  bot = gerenciador.sessoes.length ? gerenciador.sessoes[0].bot : null;
  if (quantas > 1) {
    log(`${t('bots_started')} ${quantas}`, 'INFO');
  }
  return quantas;
}

/**
 * Reinicia a ligação. `indice` diz quantas sessões recomeçam: ao mudar o
 * servidor ou o nome, as que já mudaram não devem voltar a ligar.
 */
function reiniciarSessoes(indice) {
  if (gerenciador) {
    for (const s of gerenciador.abaixo(indice === undefined ? gerenciador.tamanho() : indice)) {
      s.parar();
    }
  }
  createBot();
}

/**
 * Descobre com que versão falar com o servidor.
 *
 * Com "version": "auto" faz um pedido de estado ao servidor e escolhe a versão
 * da biblioteca cujo protocolo bate certo. Se a detecção falhar, não deixa o
 * utilizador sem bot: cai na versão mais recente que a biblioteca conhece.
 * Nunca lança.
 */
async function detectarVersao() {
  if (!config || !config.server || !config.server.ip) {
    infoServidor = null;
    return null;
  }
  const configurada = config.server.version;
  const conhecidas = deteccao.versoesConhecidas();
  const maisRecente = conhecidas.length ? conhecidas[conhecidas.length - 1] : '1.20.4';

  if (configurada && configurada !== 'auto') {
    const escolha = deteccao.escolherVersao({ configurada, conhecidas });
    infoServidor = Object.assign({}, escolha, { titulo: null, protocolo: null, detetado: false });
    if (!escolha.suportada) {
      log(`${t('version_auto_failed')} ${escolha.motivo}`, 'WARN');
    }
    return escolha.versao;
  }

  let ping = { ok: false, motivo: 'sem tentativa' };
  try {
    ping = await deteccao.criarPinger()(config.server.ip, config.server.port);
  } catch (err) {
    ping = { ok: false, motivo: err.message };
  }

  const descrito = deteccao.descreverServidor(ping);
  const escolha = deteccao.escolherVersao({
    configurada: 'auto',
    protocoloServidor: descrito.protocolo,
    conhecidas
  });

  if (escolha.suportada) {
    infoServidor = Object.assign({}, escolha, descrito, { detetado: true });
    log(`${t('version_auto_detected')} ${escolha.versao}`, 'INFO');
    return escolha.versao;
  }

  infoServidor = Object.assign({}, escolha, descrito, { detetado: false, versao: maisRecente });
  log(
    `${t('version_auto_failed')} ${escolha.motivo || ping.motivo} ${t('version_auto_fallback')} ${maisRecente}`,
    'WARN'
  );
  return maisRecente;
}

/** Versão a passar ao Mineflayer: a detectada, se houver, senão a configurada. */
function versaoParaLigar() {
  if (infoServidor && infoServidor.versao) return infoServidor.versao;
  return config.server.version;
}

/** O comando /diagnostico: o que o bot sabe sobre si e sobre o servidor. */
function showDiagnostic() {
  console.log(`${t('diagnostic_header')} ${t('cmd_diagnostic')}`);
  console.log(`  node: ${process.version}`);
  console.log(
    `  ${t('diagnostic_patch')}: ${
      compatVersao.aplicada ? t('diagnostic_patch_yes') : compatVersao.motivo || '-'
    }`
  );
  console.log(`  ${t('diagnostic_server')}: ${config.server.ip}:${config.server.port}`);
  console.log(`  ${t('diagnostic_version_config')}: ${config.server.version}`);
  if (infoServidor) {
    const origem = infoServidor.detetado ? ` (${t('version_auto_source')})` : '';
    console.log(`  ${t('diagnostic_version_used')}: ${versaoParaLigar()}${origem}`);
    if (infoServidor.titulo) console.log(`  ${t('diagnostic_title')}: ${infoServidor.titulo}`);
    if (infoServidor.protocolo) console.log(`  ${t('diagnostic_protocol')}: ${infoServidor.protocolo}`);
    if (infoServidor.jogadores !== null && infoServidor.jogadores !== undefined) {
      console.log(`  ${t('diagnostic_players')}: ${infoServidor.jogadores}/${infoServidor.maxJogadores}`);
    }
    if (infoServidor.motivo) console.log(`  ${t('diagnostic_note')}: ${infoServidor.motivo}`);
  } else {
    console.log(`  ${t('diagnostic_version_used')}: ${t('diagnostic_not_detected')}`);
  }
  const movimentoAtivo = config.movement ? config.movement.enabled : false;
  console.log(`  ${t('diagnostic_movement')}: ${movimentoAtivo ? t('movement_started') : t('movement_stopped')}`);
  console.log(`  ${t('diagnostic_sessions')}: ${gerenciador ? gerenciador.tamanho() : 0}`);
  console.log(
    `  ${t('diagnostic_reconnect')}: ${RECONNECT.opcoes.maxTentativas}x ${t('diagnostic_until')} ${Math.round(
      RECONNECT.opcoes.atrasoMaximo / 1000
    )}s`
  );
  if (gerenciador) {
    for (const s of gerenciador.sessoes) {
      console.log(`    ${s.nome}: ${s.estado}`);
    }
  }
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

/**
 * Mostra o estado de cada sessão: nome, situação e posição.
 */
function showBots() {
  if (!gerenciador || !gerenciador.tamanho()) {
    console.log(t('bots_none'));
    return;
  }
  console.log(`${t('bots_started')} ${gerenciador.tamanho()}`);
  for (const s of gerenciador.sessoes) {
    const pos = s.bot && s.bot.entity && s.bot.entity.position
      ? ` (${formatCoords(s.bot.entity.position)})`
      : '';
    console.log(`  ${s.nome}: ${s.estado}${pos}`);
  }
}

function formatCoords(pos) {
  if (!pos) return '';
  return `X: ${pos.x.toFixed(1)}, Y: ${pos.y.toFixed(1)}, Z: ${pos.z.toFixed(1)}`;
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
    // Todas as sessões reiniciam com a nova configuração
    reiniciarSessoes();
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
    // Todas as sessões reiniciam com a nova configuração
    reiniciarSessoes();
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
    // Todas as sessões reiniciam com a nova configuração
    reiniciarSessoes();
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
  if (gerenciador) gerenciador.pararTodas();
  if (gerenciador) gerenciador.pararTodas();
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
  console.log(t('help_command_bots'));
  console.log(t('help_command_diagnostic'));
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
async function init() {
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
    return;
  }
  // Detecta a versão antes de ligar, para o /diagnostico ter o que mostrar
  detectarVersao()
    .catch((err) => log(D + "{t('version_auto_failed')} " + err.message, 'WARN'))
    .then(() => createBot());
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
    case 'bots':
      showBots();
      break;
    case 'diagnostico':
    case 'diagnostic':
      showDiagnostic();
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
