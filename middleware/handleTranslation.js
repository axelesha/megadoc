//---------------------------------------------------------
// middleware/handleTranslation.js
//---------------------------------------------------------
const translationService = require('../services/translationService');

// Метаданные модуля
module.exports.moduleName = 'handleTranslation';
module.exports.dependencies = ['sessionAndSave'];

module.exports.factory = (bot, pool) => {
    if (global.moduleRegistry && global.moduleRegistry.isModuleLoaded('handleTranslation')) {
        return (ctx, next) => next();
    }

    // Кэш для пользовательских предпочтений
    const userPrefsCache = new Map();

    return async (ctx, next) => {
        // Пропускаем не текстовые сообщения и команды
        if (!ctx.message || !ctx.message.text || ctx.message.text.startsWith('/')) {
            return next();
        }

        console.log('HandleTranslation middleware executed');
        
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;
        const originalText = ctx.message.text;

        try {
            // Сначала проверяем, что сообщение существует в БД
            const [existingMessage] = await pool.execute(
                'SELECT id FROM messages WHERE message_id = ? AND chat_id = ?',
                [ctx.message.message_id, chatId]
            );

            if (existingMessage.length === 0) {
                console.log('Message not found in DB, skipping translation');
                return next();
            }

            // Определяем язык сообщения
            const detectedLanguage = await translationService.detectLanguage(originalText);
            
            // Обновляем язык сообщения в БД
            await pool.execute(
                'UPDATE messages SET detected_language = ? WHERE message_id = ? AND chat_id = ?',
                [detectedLanguage, ctx.message.message_id, chatId]
            );

            // Получаем настройки языка текущего пользователя (с кэшированием)
            const cacheKey = `${userId}_${chatId}`;
            let userPrefs = userPrefsCache.get(cacheKey);
            
            if (!userPrefs) {
                const [prefs] = await pool.execute(
                    `SELECT preferred_language, auto_translate 
                     FROM user_language_preferences 
                     WHERE user_id = ? AND chat_id = ?`,
                    [userId, chatId]
                );

                if (prefs.length > 0) {
                    userPrefs = prefs[0];
                } else {
                    // Создаем запись по умолчанию
                    await pool.execute(
                        'INSERT INTO user_language_preferences (user_id, chat_id, preferred_language, auto_translate) VALUES (?, ?, ?, ?)',
                        [userId, chatId, 'en', true]
                    );
                    userPrefs = { preferred_language: 'en', auto_translate: true };
                }
                userPrefsCache.set(cacheKey, userPrefs);
            }

            const userLanguage = userPrefs.preferred_language;
            const autoTranslate = userPrefs.auto_translate;

            // Если нужно переводить и язык отличается
            if (autoTranslate && userLanguage !== detectedLanguage) {
                const translatedText = await translationService.translateText(
                    originalText, 
                    userLanguage, 
                    detectedLanguage
                );
                
                // Сохраняем перевод
                await pool.execute(
                    `INSERT INTO message_translations (message_id, language, translated_text) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE translated_text = ?`,
                    [ctx.message.message_id, userLanguage, translatedText, translatedText]
                );

                // Обновляем сессию пользователя
                ctx.session.language = userLanguage;
            }
            
        } catch (error) {
            console.error('Error in translation middleware:', error);
        }
        
        await next();
    };
};
//---------------------------------------------------------
