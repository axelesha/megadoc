//-----------------------------------------------------------------
// middleware/aiResponse.js
//-----------------------------------------------------------------
const DeepSeekService = require('../services/deepSeekService');
const deepSeek = new DeepSeekService();

module.exports = (pool) => async (ctx, next) => {
    if (ctx.message && ctx.message.text && !ctx.message.text.startsWith('/')) {
        try {
            // Получаем историю сообщений ветки
            const [messages] = await pool.execute(
                `SELECT m.content, u.first_name 
                 FROM messages m 
                 JOIN users u ON m.user_id = u.id 
                 WHERE m.chat_id = ? AND m.branch_id = ? 
                 ORDER BY m.created_at DESC 
                 LIMIT 10`,
                [ctx.chat.id, ctx.session.current_branch]
            );
            
            // Форматируем историю для AI
            const history = messages.reverse().map(msg => ({
                role: 'user',
                content: `${msg.first_name}: ${msg.content}`
            }));
            
            // Добавляем текущее сообщение
            history.push({
                role: 'user',
                content: `${ctx.from.first_name}: ${ctx.message.text}`
            });
            
            // Получаем ответ от AI
            const response = await deepSeek.generateResponse(history);
            
            // Сохраняем ответ в БД
            const [savedMessage] = await pool.execute(
                `INSERT INTO messages (message_id, chat_id, branch_id, user_id, content, detected_language) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                 [
                     ctx.message.message_id + 1, // ID для ответа
                     ctx.chat.id,
                     ctx.session.current_branch,
                     (await ctx.telegram.getMe()).id, // Получаем ID бота динамически
                     response,
                     ctx.session.language || 'en'
                 ]
            );
            
            // Сохраняем взаимодействие с AI
            await pool.execute(
                `INSERT INTO ai_interactions (message_id, prompt, response) 
                 VALUES (?, ?, ?)`,
                [savedMessage.insertId, ctx.message.text, response]
            );
            
            // Отправляем пользователю
            await ctx.reply(response);
        } catch (error) {
            console.error('AI Middleware Error:', error);
            const errorMessage = await require('../utils/translations').getTranslation('error_occurred', ctx.session.language || 'en');
            await ctx.reply(`${errorMessage}: ${error.message}`);
        }
    }
    await next();
};
//-----------------------------------------------------------------
