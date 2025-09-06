require('dotenv').config();

const { Telegraf, session } = require('telegraf');
const pool = require('./db');
const setupCommands = require('./commands');
const { getTranslation, loadTranslations } = require('./utils/translations');

const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

async function handleStart(ctx) {
  try {
    ctx.state = ctx.state || {};
    ctx.state.commandHandled = true;
    ctx.state.commandName = 'start';
    console.log(`[CMD] Executing: /start user=${ctx.from?.id} chat=${ctx.chat?.id}`);
    const userLanguage = ctx.session.language || 'en';
    const greeting = await getTranslation('greeting', userLanguage);
    await ctx.reply(greeting);
    console.log('[CMD] Completed: /start');
  } catch (error) {
    logger.error(`Error in start command: ${error.message}`);
  }
}

async function handleError(err, ctx) {
  logger.error(`Error: ${err.message}`);
  
  if (!ctx?.chat) return;
  
  const userLanguage = ctx.session?.language || 'en';
  const errorMessage = await getTranslation('error_occurred', userLanguage);
  await ctx.reply(`${errorMessage}: ${err.message.substring(0, 4000)}`);
}

async function main() {
  await loadTranslations(pool);
  
  const bot = new Telegraf(BOT_TOKEN);
  const me = await bot.telegram.getMe();
  const botUsername = me?.username || '';
  
  // Логирование входящих команд и причин пропуска неизвестных
  bot.use(async (ctx, next) => {
    const text = ctx.message?.text;
    if (typeof text === 'string' && text.startsWith('/')) {
      const firstToken = text.slice(1).split(' ')[0];
      const [cmd, mention] = firstToken.split('@');
      logger.info(`Incoming command: /${cmd}${mention ? '@' + mention : ''} from user=${ctx.from?.id} chat=${ctx.chat?.id}`);
    }

    await next();

    if (typeof text === 'string' && text.startsWith('/')) {
      const firstToken = text.slice(1).split(' ')[0];
      const [cmd, mention] = firstToken.split('@');
      const mentionLower = mention?.toLowerCase();
      const botLower = botUsername?.toLowerCase() || '';
      const addressedToAnotherBot = !!mentionLower && mentionLower !== botLower;
      const isKnown = (global.__registeredCommands?.has(cmd)) || cmd === 'start';

      if (!ctx.state?.commandHandled) {
        if (addressedToAnotherBot) {
          logger.info(`Command not executed: addressed to another bot /${cmd}@${mention} user=${ctx.from?.id} chat=${ctx.chat?.id}`);
        } else if (!isKnown) {
          logger.info(`Command not executed: unknown command /${cmd} user=${ctx.from?.id} chat=${ctx.chat?.id}`);
        } else {
          logger.info(`Command not executed: handler not invoked /${cmd} user=${ctx.from?.id} chat=${ctx.chat?.id}`);
        }
      }
    }
  });

  const sessionAndSaveMiddleware = require('./middleware/sessionAndSave')(bot, pool);
  const handleTranslationMiddleware = require('./middleware/handleTranslation')(bot, pool);
  const aiResponseMiddleware = require('./middleware/aiResponse').factory(bot, pool);
  
  bot.use(session());
  bot.use(sessionAndSaveMiddleware);
  bot.use(handleTranslationMiddleware);
  bot.use(aiResponseMiddleware);
  
  bot.command('start', handleStart);
  
  setupCommands(bot, pool);
  bot.catch(handleError);
  
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    logger.info('Webhook reset successfully');
    
    await bot.launch({
      allowedUpdates: ['message', 'message_reaction', 'callback_query']
    });
    
    logger.info('Bot started successfully');
  } catch (error) {
    logger.error(`Error starting bot: ${error.message}`);
    process.exit(1);
  }
  
  process.once('SIGINT', () => {
    logger.info('SIGINT received');
    bot.stop('SIGINT');
    process.exit(0);
  });
  
  process.once('SIGTERM', () => {
    logger.info('SIGTERM received');
    bot.stop('SIGTERM');
    process.exit(0);
  });
}

// Start application
if (require.main === module) {
  main().catch(error => {
    logger.error(`Failed to start bot: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main };
