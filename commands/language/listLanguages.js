//-------------------------------------------------------
// commands/language/listLanguages.js
//-------------------------------------------------------
const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');
const translationService = require('../../services/translationService');

module.exports = registerCommand(['languages', 'языки'], async (ctx) => {
    const userLanguage = ctx.session.language || 'en';
    
    try {
        const supportedLanguages = translationService.getSupportedLanguages();
        
        let message = await getTranslation('supported_languages', userLanguage) + ':\n\n';
        
        supportedLanguages.forEach(lang => {
            message += `• ${lang}\n`;
        });
        
        message += '\n' + await getTranslation('set_language_usage', userLanguage);
        
        await ctx.reply(message);
        
    } catch (error) {
        console.error('List languages error:', error);
        const errorMessage = await getTranslation('error_listing_languages', userLanguage);
        await ctx.reply(errorMessage);
    }
});
//-------------------------------------------------------
