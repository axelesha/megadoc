// commands/admin/translations.js
const registerCommand = require('../../utils/registerCommand');
const { addTranslation, getTranslation } = require('../../utils/translations');

module.exports = registerCommand(['add_translation'], async (ctx) => {
    // Проверяем права администратора
    if (ctx.from.id !== ADMIN_USER_ID) {
        return ctx.reply('Access denied');
    }

    const args = ctx.message.text.split(' ');
    if (args.length < 4) {
        return ctx.reply('Usage: /add_translation <lang> <key> <text>');
    }

    const lang = args[1];
    const key = args[2];
    const text = args.slice(3).join(' ');

    const success = await addTranslation(lang, key, text);
    if (success) {
        await ctx.reply(`Translation added: ${lang}.${key} = ${text}`);
    } else {
        await ctx.reply('Error adding translation');
    }
});
