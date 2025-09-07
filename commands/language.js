const registerCommand = require('../utils/registerCommand');
const { getTranslation } = require('../utils/translations');

module.exports = registerCommand('language', async (ctx, pool) => {
  const args = ctx.message.text.split(' ').slice(1);
  const languageCode = args[0];
  
  try {
    if (!languageCode) {
      await showCurrentLanguage(ctx, pool);
      return;
    }
    
    await setUserLanguage(ctx, languageCode, pool);
    await ctx.reply(await getTranslation('language_set_success', languageCode));
  } catch (error) {
    console.error('Language command error:', error);
    await ctx.reply(`❌ ${error.message}`);
  }
}, {
  description: 'Set your preferred language',
  usage: '/language <language_code>',
  aliases: ['lang', 'язык'],
  category: 'Preferences'
});

async function showCurrentLanguage(ctx, pool) {
  // Получаем текущий язык из БД или сессии
  const userLanguage = ctx.session?.language || 'en';
  const languages = {
    'en': 'English',
    'ru': 'Русский',
    'zh': '中文',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'ja': '日本語',
    'ko': '한국어',
    'ar': 'العربية',
    'hi': 'हिन्दी',
    'pt': 'Português'
  };
  
  const response = `Your current language: ${languages[userLanguage] || userLanguage}\n\n` +
                   `Available languages:\n` +
                   Object.entries(languages)
                     .map(([code, name]) => `- ${code}: ${name}`)
                     .join('\n');
  
  await ctx.reply(response);
}

async function setUserLanguage(ctx, languageCode, pool) {
  const supportedLanguages = ['en', 'ru', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'ar', 'hi', 'pt'];
  
  if (!supportedLanguages.includes(languageCode)) {
    throw new Error(`Unsupported language: ${languageCode}. Use /language to see available options.`);
  }
  
  // Сохраняем в сессию
  ctx.session.language = languageCode;
  
  // Сохраняем в БД
  try {
    await pool.execute(
      `INSERT INTO user_language_preferences (user_id, chat_id, preferred_language) 
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE preferred_language = ?`,
      [ctx.from.id, ctx.chat.id, languageCode, languageCode]
    );
  } catch (error) {
    console.error('Error saving language preference:', error);
    throw new Error('Failed to save language preference');
  }
}