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
    const userLanguage = ctx.session.language || 'en';
    const greeting = await getTranslation('greeting', userLanguage);
    await ctx.reply(greeting);
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
