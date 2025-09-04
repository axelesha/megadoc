//---------------------------------------------------------------
// middleware/sessionAndSave.js
//---------------------------------------------------------------
// middleware/sessionAndSave.js
const translationService = require('../services/translationService');
const tagExtractor = require('../services/tagExtractor');

/**
 * Middleware for session management and message saving
 * Now with language detection
 */
module.exports = (pool) => async (ctx, next) => {
  const chatId = ctx.chat.id;
  const userId = ctx.from.id;

  // Initialize session if not exists
  if (!ctx.session) {
    ctx.session = {};
  }

  // Initialize current branch for this chat
  if (!ctx.session.current_branch) {
    ctx.session.current_branch = 'main';
  }

  // Initialize language for this user
  if (!ctx.session.language) {
    const preferences = await translationService.getUserLanguagePreference(pool, userId);
    ctx.session.language = preferences.preferred_language;
    ctx.session.auto_translate = preferences.auto_translate;
  }

  // Save chat and user to database
  try {
    await pool.execute(
      'INSERT IGNORE INTO chats (id, type, title) VALUES (?, ?, ?)',
      [chatId, ctx.chat.type, ctx.chat.title || ctx.chat.first_name]
    );

    await pool.execute(
      'INSERT IGNORE INTO users (id, username, first_name) VALUES (?, ?, ?)',
      [userId, ctx.from.username, ctx.from.first_name]
    );
  } catch (error) {
    console.error('Error saving chat/user:', error);
  }

  // Save message to database (if not a command)
  if (ctx.message && ctx.message.text && !ctx.message.text.startsWith('/')) {
    try {
      // Detect message language
      const detectedLanguage = await translationService.detectLanguage(ctx.message.text);
      
      const [result] = await pool.execute(
        `INSERT INTO messages (message_id, chat_id, branch_id, user_id, content, timestamp, detected_language) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ctx.message.message_id,
          chatId,
          ctx.session.current_branch,
          userId,
          ctx.message.text,
          new Date(ctx.message.date * 1000),
          detectedLanguage
        ]
      );

      //
     const tags = await tagExtractor.extractTags(ctx.message.text);
     await tagExtractor.saveTags(pool, result.insertId, tags);

    } catch (error) {
      console.error('Error saving message:', error);
    }
  }

  return next();
};
//---------------------------------------------------------------