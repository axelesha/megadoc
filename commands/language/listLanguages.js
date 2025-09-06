//-------------------------------------------------------
// commands/language/listLanguages.js
//-------------------------------------------------------
const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');
const translationService = require('../../services/translationService');

module.exports = registerCommand(['languages', 'языки'], async (ctx) => {
    const userLanguage = ctx.session?.language || 'en';
    
    try {
        const supportedLanguages = translationService.getSupportedLanguages();
        
        let message = await getTranslation('supported_languages', userLanguage) + ':\n\n';
        
        // Добавляем emoji для каждого языка
        const languageEmojis = {
            'en': '🇺🇸', 'ru': '🇷🇺', 'es': '🇪🇸', 'fr': '🇫🇷', 
            'de': '🇩🇪', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
            'ar': '🇸🇦', 'hi': '🇮🇳', 'pt': '🇵🇹'
        };
        
        supportedLanguages.forEach(lang => {
            const emoji = languageEmojis[lang] || '🌐';
            message += `${emoji} ${lang.toUpperCase()} - ${await getTranslation('language_' + lang, userLanguage)}\n`;
        });
        
        message += '\n' + await getTranslation('set_language_usage', userLanguage);
        
        await ctx.reply(message);
        
    } catch (error) {
        console.error('List languages error:', error);
        const errorMessage = await getTranslation('error_occurred', userLanguage);
        await ctx.reply(`${errorMessage}: ${error.message}`);
    }
});
//-------------------------------------------------------
