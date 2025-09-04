//----------------------------------------------------------------
// commands/setLanguage.js
//----------------------------------------------------------------
const registerCommand = require('../utils/registerCommand');
const { getTranslation, getAvailableLanguages } = require('../utils/translations');
/**
 * Handler for language setting command
 * Dynamically shows available languages from database
 */
module.exports = (bot, pool) => {
  const handleSetLanguage = async (ctx) => {
    const args = ctx.message.text.split(' ');
    const currentLanguage = ctx.session.language || 'en';

    try {
      if (args.length < 2) {
        // Show available languages dynamically from database
        const availableLanguages = await getAvailableLanguages(pool);
        let message = await getTranslation('available_languages', currentLanguage);
        
        availableLanguages.forEach(lang => {
          message += `\n/${lang} - ${lang}`;
        });
        
        return ctx.reply(message);
      }

      const langCode = args[1].toLowerCase();
      
      // Check if language is supported
      const availableLanguages = await getAvailableLanguages(pool);
      if (!availableLanguages.includes(langCode)) {
        const notSupportedMessage = await getTranslation('language_not_supported', currentLanguage);
        return ctx.reply(notSupportedMessage.replace('{langCode}', langCode));
      }

      // Set language in session
      ctx.session.language = langCode;
      const successMessage = await getTranslation('language_set', langCode);
      ctx.reply(successMessage);
      
    } catch (error) {
      console.error('Set language error:', error);
      const errorMessage = await getTranslation('error_setting_language', currentLanguage);
      await ctx.reply(errorMessage);
    }
  };

  // Register with English keywords only
  registerCommand(bot, ['set_language'], handleSetLanguage, pool);
};
//----------------------------------------------------------------
