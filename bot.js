// bot.js
require('dotenv').config();
const { Telegraf } = require('telegraf');
const axios = require('axios');

// Setup logging
const logger = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`)
};

const DS_TOKEN = process.env.DS_TOKEN;
const BOT_TOKEN = process.env.BOT_TOKEN;

const api_url = "https://api.deepseek.com/v1/chat/completions";
const headers = {
  "Authorization": `Bearer ${DS_TOKEN}`,
  "Content-Type": "application/json"
};

async function askDeepseek(ctx, question) {
  const payload = {
    "model": "deepseek-chat",
    "messages": [
      {
        "role": "system",
        "content": `You are a helpful assistant specialized in MegaDoc project management. You don't respond to any request, unless request either calling your name or giving the ! or ? mark in the start of message. You are currently in the ${ctx.session?.current_branch || 'main'} branch.`
      },
      {
        "role": "user",
        "content": question
      }
    ],
    "max_tokens": 2000
  };

  logger.info(`payload= ${JSON.stringify(payload)}`);

  try {
    const response = await axios.post(api_url, payload, { headers });
    logger.info(`response= ${JSON.stringify(response.data)}`);
    
    const result = response.data.choices[0].message.content;
    logger.info(`result: ${result}`);

    // Split long messages
    const max_length = 4096;
    if (result.length > max_length) {
      for (let i = 0; i < result.length; i += max_length) {
        await ctx.reply(result.substring(i, i + max_length));
      }
    } else {
      await ctx.reply(result);
    }
  } catch (error) {
    logger.error(`Error calling DeepSeek API: ${error.message}`);
    await ctx.reply('Sorry, I encountered an error processing your request.');
  }
}

async function handleReaction(ctx) {
  const reaction = ctx.messageReaction;
  
  if (!reaction) return;

  const user = reaction.user;
  const chat = reaction.chat;
  
  console.log(`Reaction detected from user ${user.id} in chat ${chat.id}`, reaction);

  const newReaction = reaction.new_reaction;
  logger.info(`Reaction ${JSON.stringify(newReaction)}`);

  if (newReaction && newReaction.length > 0) {
    logger.info("got reaction");

    const reactionData = {
      "user_id": user.id,
      "chat_id": chat.id,
      "emoji": newReaction[0].emoji,
      "message_id": reaction.message_id,
      "timestamp": new Date(reaction.date * 1000).toISOString(),
      "action": "added"
    };

    const payload = {
      "model": "deepseek-chat",
      "messages": [
        {
          "role": "system",
          "content": "You are helpful assistant, and you received a reaction. No need to respond to it, just know that someone reacted to the message."
        },
        {
          "role": "user",
          "content": JSON.stringify(reactionData)
        }
      ],
      "max_tokens": 2000
    };

    try {
      logger.info(`payload= ${JSON.stringify(payload)}`);
      const response = await axios.post(api_url, payload, { headers });
      logger.info(`response= ${JSON.stringify(response.data)}`);
      const result = response.data.choices[0].message.content;
      logger.info(`response text is ${result}`);
    } catch (error) {
      logger.error(`Error processing reaction: ${error.message}`);
    }
  }
}

// Message filter function
function messageFilter(ctx) {
  const userText = ctx.message.text.toLowerCase();
  
  const isCommand = /^[\/!#]/.test(userText);
  const isMention = userText.includes('дик') || userText.includes('bot');
  const isReplyToBot = ctx.message.reply_to_message && ctx.message.reply_to_message.from.is_bot;
  
  return isCommand || isMention || isReplyToBot;
}

// Command handlers
async function start(ctx) {
  await ctx.reply('Hello! I am your MegaDoc assistant. Use /structure to see project structure or /new_branch to create a new branch.');
}

async function structure(ctx) {
  await ctx.reply('Project structure command - implement your logic here');
}

async function newBranch(ctx) {
  await ctx.reply('New branch command - implement your logic here');
}

async function handleExclamationCommands(ctx) {
  if (messageFilter(ctx)) {
    await askDeepseek(ctx, ctx.message.text);
  }
}

// Error handler
async function errorHandler(err, ctx) {
  logger.error(`Error: ${err.message}`);
  
  if (ctx && ctx.chat) {
    const message = `An error occurred: ${err.message}`;
    await ctx.reply(message.substring(0, 4096));
  }
}

function main() {
  const bot = new Telegraf(BOT_TOKEN);
  
  // Middleware for session management
  bot.use((ctx, next) => {
    if (!ctx.session) {
      ctx.session = { current_branch: 'main' };
    }
    return next();
  });

  // Command handlers
  bot.command('start', start);
  bot.command('structure', structure);
  bot.command('new_branch', newBranch);
  
  // Message handler for ! commands and mentions
  bot.on('text', handleExclamationCommands);
  
  // Reaction handler
  bot.on('message_reaction', handleReaction);
  
  // Error handler
  bot.catch(errorHandler);
  
  // Launch bot
  bot.launch({
    allowedUpdates: ['message', 'message_reaction', 'callback_query']
  });
  
  logger.info('Bot started');
  
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

if (require.main === module) {
  main();
}
