//---------------------------------------------------------------
// commands/history.js
//---------------------------------------------------------------
const registerCommand = require('../utils/registerCommand');
const { getTranslation } = require('../utils/translations');
const translationService = require('../services/translationService');

module.exports = registerCommand(['history', 'история'], async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const userLanguage = ctx.session?.language || 'en';
    const branchId = ctx.session?.current_branch_id || 0;

    try {
        // Получаем историю сообщений
        const [messages] = await ctx.pool.execute(
            `SELECT m.id, m.user_id, m.content, m.detected_language, 
                    u.first_name, u.username, m.created_at
             FROM messages m
             JOIN users u ON m.user_id = u.id
             WHERE m.chat_id = ? AND m.branch_id = ?
             ORDER BY m.created_at DESC
             LIMIT 20`,
            [chatId, branchId]
        );
        
        if (messages.length === 0) {
            const noMessages = await getTranslation('no_messages_found', userLanguage);
            return ctx.reply(noMessages);
        }
        
        // Получаем настройки пользователя
        const preferences = await translationService.getUserLanguagePreference(ctx.pool, userId, chatId);
        
        // Формируем историю сообщений
        let historyText = '';
        
        for (const message of messages.reverse()) {
            let content = message.content;
            let displayName = message.first_name;
            
            if (message.username) {
                displayName = `@${message.username}`;
            }
            
            // Перевод при необходимости
            if (preferences.auto_translate && message.detected_language !== preferences.preferred_language) {
                try {
                    content = await translationService.translateText(
                        content,
                        preferences.preferred_language,
                        message.detected_language
                    );
                } catch (translationError) {
                    console.error('Translation error:', translationError);
                    // Оставляем оригинальный текст в случае ошибки перевода
                }
            }
            
            // Обрезаем длинные сообщения
            if (content.length > 200) {
                content = content.substring(0, 200) + '...';
            }
            
            const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            historyText += `🕒 ${time} **${displayName}**: ${content}\n\n`;
        }
        
        const historyTitle = await getTranslation('message_history', userLanguage);
        await ctx.reply(`${historyTitle}:\n\n${historyText}`);
        
    } catch (error) {
        console.error('History command error:', error);
        const errorMessage = await getTranslation('error_retrieving_history', userLanguage);
        await ctx.reply(`${errorMessage}: ${error.message}`);
    }
});
//---------------------------------------------------------------
