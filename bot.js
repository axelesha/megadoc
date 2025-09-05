//----------------------------------------------------------------------
// bot.js
// инициализация и запуск бота
//----------------------------------------------------------------------

require('dotenv').config();

const { Telegraf, session } = require('telegraf');
const pool = require('./db');
const setupCommands = require('./commands');
const { getTranslation, loadTranslations } = require('./utils/translations');

// Setup logging
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

const BOT_TOKEN = process.env.BOT_TOKEN;

// Check if token exists
if (!BOT_TOKEN) {
  logger.error('BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

// Basic command handlers
async function start(ctx) {
  try {
    // Get user language from session or default to English
    const userLanguage = ctx.session.language || 'en';
    const greeting = await getTranslation('greeting', userLanguage);
    await ctx.reply(greeting);
  } catch (error) {
    logger.error(`Error in start command: ${error.message}`);
  }
}

// Error handler
async function errorHandler(err, ctx) {
  logger.error(`Error: ${err.message}`);
  
  if (ctx && ctx.chat) {
    const userLanguage = ctx.session?.language || 'en';
    const errorMessage = await getTranslation('error_occurred', userLanguage);
    await ctx.reply(`${errorMessage}: ${err.message.substring(0, 4000)}`);
  }
}

async function main() {
  // Load translations first
  await loadTranslations(pool);
  
  const bot = new Telegraf(BOT_TOKEN);
  
  // Middleware initialization (после создания бота)
  const sessionAndSaveMiddleware = require('./middleware/sessionAndSave')(pool);
  const handleTranslationMiddleware = require('./middleware/handleTranslation')(bot, pool);
  const aiResponseMiddleware = require('./middleware/aiResponse')(pool);
  
  // Use session and save middleware
  bot.use(session());
  bot.use(sessionAndSaveMiddleware);
  
  // Use translation middleware
  bot.use(handleTranslationMiddleware);
  
  // Use AI response middleware
  bot.use(aiResponseMiddleware);
  
  // Basic command handlers
  bot.command('start', start);
  
  // Add tags command
  bot.command('tags', require('./commands/tags')(pool));
  
  // Automatically register all commands from commands folder
  setupCommands(bot, pool);
  
  // Error handler
  bot.catch(errorHandler);
  
  // Force reset before launch
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
  
  // Enable graceful stop
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
