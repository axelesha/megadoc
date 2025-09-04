//---------------------------------------------------------------
// commands/history.js
//---------------------------------------------------------------
const registerCommand = require('../utils/registerCommand');
const { getTranslation } = require('../utils/translations');
const translationService = require('../services/translationService');
/**
 * Handler for history command with translation
 */
module.exports = (bot, pool) => {
  const handleHistory = async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const userLanguage = ctx.session.language || 'en';

    try {
      // Получаем историю сообщений
      const [messages] = await pool.execute(
        `SELECT m.id, m.user_id, m.content, m.detected_language, u.first_name
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.chat_id = ?
         ORDER BY m.timestamp DESC
         LIMIT 20`,
        [chatId]
      );
      
      if (messages.length === 0) {
        const noMessages = await getTranslation('no_messages_found', userLanguage);
        return ctx.reply(noMessages);
      }
      
      // Получаем настройки пользователя
      const preferences = await translationService.getUserLanguagePreference(pool, userId);
      
      // Переводим каждое сообщение при необходимости
      let historyText = '';
      for (const message of messages.reverse()) {
        let content = message.content;
        
        if (preferences.auto_translate && message.detected_language !== preferences.preferred_language) {
          content = await translationService.translateText(
            content,
            preferences.preferred_language,
            message.detected_language
          );
        }
        
        historyText += `**${message.first_name}**: ${content}\n\n`;
      }
      
      const historyTitle = await getTranslation('message_history', userLanguage);
      await ctx.replyWithMarkdown(`**${historyTitle}**:\n\n${historyText}`);
      
    } catch (error) {
      console.error('History command error:', error);
      const errorMessage = await getTranslation('error_retrieving_history', userLanguage);
      await ctx.reply(errorMessage);
    }
  };

  registerCommand(bot, ['history', 'история'], handleHistory);
};
//---------------------------------------------------------------

