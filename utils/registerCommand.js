// utils/registerCommand.js
if (!global.__registeredCommands) {
    global.__registeredCommands = new Set();
}
module.exports = (commandName, handler) => {
    return (bot, pool) => {
        // Регистрируем имена команд в глобальном реестре для диагностического логирования
        const names = Array.isArray(commandName) ? commandName : [commandName];
        names.forEach((n) => typeof n === 'string' && global.__registeredCommands.add(n));

        bot.command(commandName, async (ctx) => {
            try {
                // Добавляем pool в контекст для использования в обработчике
                ctx.pool = pool;

                // Определяем, какая команда была вызвана
                const rawText = ctx.message?.text || '';
                const usedCommand = rawText.startsWith('/')
                    ? rawText.slice(1).split(' ')[0].split('@')[0]
                    : (Array.isArray(commandName) ? commandName[0] : String(commandName));

                // Помечаем, что команда обработана, для последующего аудита
                ctx.state = ctx.state || {};
                ctx.state.commandHandled = true;
                ctx.state.commandName = usedCommand;

                console.log(`[CMD] Executing: /${usedCommand} user=${ctx.from?.id} chat=${ctx.chat?.id}`);

                await handler(ctx);

                console.log(`[CMD] Completed: /${usedCommand}`);
            } catch (error) {
                const rawText = ctx.message?.text || '';
                const usedCommand = rawText.startsWith('/')
                    ? rawText.slice(1).split(' ')[0].split('@')[0]
                    : (Array.isArray(commandName) ? commandName[0] : String(commandName));
                console.error(`[CMD] Error: /${usedCommand} - ${error.message}`);
                const errorMessage = await require('./translations').getTranslation('error_occurred', ctx.session?.language || 'en');
                await ctx.reply(`${errorMessage}: ${error.message}`);
            }
        });
    };
};
