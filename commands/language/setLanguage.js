//-------------------------------------------------------
// commands/language/setLanguage.js
//-------------------------------------------------------
const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');
const translationService = require('../../services/translationService');

module.exports = registerCommand(['set_language', 'язык'], async (ctx) => {
    const args = ctx.message.text.split(' ');
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const currentLanguage = ctx.session?.language || 'en';

    try {
        if (args.length < 2) {
            const usageMessage = await getTranslation('set_language_usage', currentLanguage);
            return ctx.reply(usageMessage);
        }

        const langCode = args[1].toLowerCase().trim();
        
        // Проверяем поддержку языка
        const supportedLanguages = translationService.getSupportedLanguages();
        if (!supportedLanguages.includes(langCode)) {
            const errorMessage = await getTranslation('language_not_supported', currentLanguage);
            return ctx.reply(errorMessage);
        }

        // Обновляем настройки языка
        await ctx.pool.execute(
            `INSERT INTO user_language_preferences (user_id, chat_id, preferred_language, auto_translate) 
             VALUES (?, ?, ?, true) 
             ON DUPLICATE KEY UPDATE 
                 preferred_language = VALUES(preferred_language),
                 updated_at = NOW()`,
            [userId, chatId, langCode]
        );
        
        // Обновляем сессию
        ctx.session.language = langCode;
        
        const successMessage = await getTranslation('language_set', langCode);
        await ctx.reply(successMessage.replace('{language}', langCode.toUpperCase()));
        
    } catch (error) {
        console.error('Set language error:', error);
        const errorMessage = await getTranslation('error_setting_language', currentLanguage);
        await ctx.reply(`${errorMessage}: ${error.message}`);
    }
});
//-------------------------------------------------------
