//-----------------------------------------------------------------
// middleware/aiResponse.js
//-----------------------------------------------------------------
const DeepSeekService = require('../services/deepSeekService');
const deepSeek = new DeepSeekService();

module.exports = (pool) => async (ctx, next) => {
    if (ctx.message && ctx.message.text && !ctx.message.text.startsWith('/')) {
        try {
            // �������� ������� ��������� �����
            const [messages] = await pool.execute(
                `SELECT m.content, u.first_name 
                 FROM messages m 
                 JOIN users u ON m.user_id = u.id 
                 WHERE m.chat_id = ? AND m.branch_id = ? 
                 ORDER BY m.created_at DESC 
                 LIMIT 10`,
                [ctx.chat.id, ctx.session.current_branch]
            );
            
            // ����������� ������� ��� AI
            const history = messages.reverse().map(msg => ({
                role: 'user',
                content: `${msg.first_name}: ${msg.content}`
            }));
            
            // ��������� ������� ���������
            history.push({
                role: 'user',
                content: `${ctx.from.first_name}: ${ctx.message.text}`
            });
            
            // �������� ����� �� AI
            const response = await deepSeek.generateResponse(history);
            
            // ��������� ����� � ��
            const [savedMessage] = await pool.execute(
                `INSERT INTO messages (message_id, chat_id, branch_id, user_id, content, detected_language) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                 [
                     ctx.message.message_id + 1, // ID ��� ������
                     ctx.chat.id,
                     ctx.session.current_branch,
                     (await ctx.telegram.getMe()).id, // �������� ID ���� �����������
                     response,
                     ctx.session.language || 'en'
                 ]
            );
            
            // ��������� �������������� � AI
            await pool.execute(
                `INSERT INTO ai_interactions (message_id, prompt, response) 
                 VALUES (?, ?, ?)`,
                [savedMessage.insertId, ctx.message.text, response]
            );
            
            // ���������� ������������
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
