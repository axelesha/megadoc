// utils/registerCommand.js
module.exports = (commandName, handler) => {
    return (bot, pool) => {
        bot.command(commandName, async (ctx) => {
            try {
                // Добавляем pool в контекст для использования в обработчике
                ctx.pool = pool;
                await handler(ctx);
            } catch (error) {
                console.error(`Error in command ${commandName}:`, error);
                const errorMessage = await require('./translations').getTranslation('error_occurred', ctx.session?.language || 'en');
                await ctx.reply(`${errorMessage}: ${error.message}`);
            }
        });
    };
};
