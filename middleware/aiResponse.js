//-----------------------------------------------------------------
// middleware/aiResponse.js
//-----------------------------------------------------------------
const DeepSeekService = require('../services/deepSeekService');
const { getTranslation } = require('../utils/translations');

// Метаданные модуля
module.exports.moduleName = 'aiResponse';
module.exports.dependencies = ['sessionAndSave', 'handleTranslation'];

module.exports.factory = (bot, pool) => {
    if (global.moduleRegistry && global.moduleRegistry.isModuleLoaded('aiResponse')) {
        return (ctx, next) => next();
    }

    const deepSeek = new DeepSeekService();

    return async (ctx, next) => {
        console.log('AIResponse middleware executed');
        
        // Пропускаем команды и не-текстовые сообщения
        if (!ctx.message || !ctx.message.text || ctx.message.text.startsWith('/')) {
            return next();
        }

        try {
            const today = new Date().toISOString().split('T')[0];
            
            // Проверяем лимиты перед запросом
            const limits = await deepSeek.checkLimits(ctx.chat.id, ctx.from.id, today, pool);
            if (limits.exceeded) {
                const limitExceededText = await getTranslation('limit_exceeded', ctx.session?.language || 'en');
                await ctx.reply(limitExceededText);
                return next();
            }

            // Получаем историю сообщений для контекста
            const [messages] = await pool.execute(
                `SELECT m.content, m.detected_language, u.first_name 
                 FROM messages m 
                 JOIN users u ON m.user_id = u.id 
                 WHERE m.chat_id = ? AND m.branch_id = ?
                 ORDER BY m.created_at DESC 
                 LIMIT 10`,
                [ctx.chat.id, ctx.session.current_branch_id || 0]
            );

            // Формируем историю для AI
            const history = messages.reverse().map(msg => ({
                role: "user",
                content: msg.content
            }));

            // Добавляем текущее сообщение
            history.push({
                role: "user",
                content: ctx.message.text
            });

            // Генерируем ответ
            const aiResponse = await deepSeek.generateResponse(history);
            
            // Сохраняем взаимодействие с AI, связывая с ID сообщения в БД
            const messageDbId = ctx.state?.message_db_id;
            if (messageDbId) {
                await pool.execute(
                    `INSERT INTO ai_interactions (message_id, prompt, response, tokens_used) 
                     VALUES (?, ?, ?, ?)`,
                    [messageDbId, ctx.message.text, aiResponse.content, aiResponse.usage.total_tokens]
                );
            }

            // Обновляем использование токенов
            await deepSeek.updateTokenUsage(
                ctx.chat.id, 
                ctx.from.id, 
                today, 
                aiResponse.usage.total_tokens,
                pool
            );
            
            // Отправляем ответ
            await ctx.reply(aiResponse.content);
            
        } catch (error) {
            console.error('AI Middleware Error:', error);
            const errorMessage = await getTranslation('error_occurred', ctx.session?.language || 'en');
            await ctx.reply(`${errorMessage}: ${error.message}`);
        }
        
        await next();
    };
};
//-----------------------------------------------------------------
