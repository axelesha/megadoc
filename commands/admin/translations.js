//-----------------------------------------------------------------
// commands/admin/translations.js
//-----------------------------------------------------------------
const registerCommand = require('../../../utils/registerCommand');
const { addTranslation, getTranslation } = require('../../../utils/translations');

module.exports = registerCommand(['add_translation', 'добавить_перевод'], async (ctx) => {
    const args = ctx.message.text.split(' ');
    const userLanguage = ctx.session.language || 'en';
    
    if (args.length < 4) {
        const usageMessage = await getTranslation('add_translation_usage', userLanguage);
        return ctx.reply(usageMessage);
    }
    
    const messageKey = args[1];
    const languageCode = args[2];
    const translation = args.slice(3).join(' ');
    
    try {
        const success = await addTranslation(ctx.pool, messageKey, languageCode, translation);
        
        if (success) {
            const successMessage = await getTranslation('translation_added', userLanguage);
            await ctx.reply(successMessage
                .replace('{key}', messageKey)
                .replace('{language}', languageCode)
            );
        } else {
            const errorMessage = await getTranslation('error_adding_translation', userLanguage);
            await ctx.reply(errorMessage);
        }
    } catch (error) {
        console.error('Add translation error:', error);
        const errorMessage = await getTranslation('error_adding_translation', userLanguage);
        await ctx.reply(errorMessage);
    }
});
//-----------------------------------------------------------------
