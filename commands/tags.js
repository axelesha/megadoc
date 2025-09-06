//---------------------------------------------------
// commands/tags.js
//---------------------------------------------------
const registerCommand = require('../utils/registerCommand');
const { getTranslation } = require('../utils/translations');

module.exports = registerCommand(['tags', 'теги'], async (ctx) => {
    const userLanguage = ctx.session?.language || 'en';
    
    try {
        const pool = ctx.pool;
        const chatId = ctx.chat.id;
        
        // Получаем популярные теги для этого чата
        const [tags] = await pool.execute(
            `SELECT t.name, COUNT(mt.message_id) as count 
             FROM tags t
             JOIN message_tags mt ON t.id = mt.tag_id
             JOIN messages m ON mt.message_id = m.id
             WHERE m.chat_id = ?
             GROUP BY t.id
             ORDER BY count DESC, t.name ASC
             LIMIT 15`,
            [chatId]
        );
        
        if (tags.length === 0) {
            const noTagsMessage = await getTranslation('no_tags_found', userLanguage);
            return ctx.reply(noTagsMessage);
        }
        
        // Форматируем ответ
        let response = await getTranslation('popular_tags', userLanguage) + ':\n\n';
        
        tags.forEach((tag, index) => {
            const barLength = Math.min(Math.ceil(tag.count / 5), 10); // Максимум 10 символов
            const bar = '▰'.repeat(barLength) + '▱'.repeat(10 - barLength);
            response += `${index + 1}. #${tag.name} ${bar} ${tag.count}\n`;
        });
        
        response += '\n' + await getTranslation('tags_usage_hint', userLanguage);
        
        await ctx.reply(response);
    } catch (error) {
        console.error('Error in tags command:', error);
        const errorMessage = await getTranslation('error_occurred', userLanguage);
        await ctx.reply(`${errorMessage}: ${error.message}`);
    }
});
//---------------------------------------------------
