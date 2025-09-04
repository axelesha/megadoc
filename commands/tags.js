//---------------------------------------------------
// commands/tags.js
//---------------------------------------------------
const registerCommand = require('../utils/registerCommand');

module.exports = registerCommand('tags', async (ctx) => {
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
             ORDER BY count DESC
             LIMIT 10`,
            [chatId]
        );
        
        if (tags.length === 0) {
            await ctx.reply('📚 Пока нет тегов в этом чате. Теги будут автоматически создаваться из ваших сообщений.');
            return;
        }
        
        // Форматируем ответ
        let response = '📚 Популярные теги в этом чате:\n\n';
        tags.forEach((tag, index) => {
            response += `${index + 1}. #${tag.name} (${tag.count})\n`;
        });
        
        response += '\nИспользуйте теги в сообщениях, и они будут автоматически добавляться в систему.';
        
        await ctx.reply(response);
    } catch (error) {
        console.error('Error in tags command:', error);
        await ctx.reply('❌ Произошла ошибка при получении тегов.');
    }
}
);
//---------------------------------------------------