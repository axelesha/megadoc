const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');

module.exports = registerCommand(['switch'], async (ctx) => {
    const args = ctx.message.text.split(' ');
    const userLanguage = ctx.session?.language || 'en';

    try {
        if (args.length < 2) {
            const usageMessage = await getTranslation('switch_branch_usage', userLanguage);
            return ctx.reply(usageMessage);
        }

        const branchName = args[1].trim();
        const chatId = ctx.chat.id;

        // Ищем ветку по имени
        const [branches] = await ctx.pool.execute(
            'SELECT id, name FROM branches WHERE chat_id = ? AND name = ?',
            [chatId, branchName]
        );

        if (branches.length === 0) {
            const notFoundMessage = await getTranslation('branch_not_found', userLanguage);
            return ctx.reply(notFoundMessage);
        }

        // Обновляем текущую ветку в сессии
        ctx.session.current_branch_id = branches[0].id;
        
        const successMessage = await getTranslation('branch_switched', userLanguage);
        await ctx.reply(successMessage.replace('{branch}', branches[0].name));

    } catch (error) {
        console.error('Switch command error:', error);
        const errorMessage = await getTranslation('error_occurred', userLanguage);
        await ctx.reply(errorMessage);
    }
});
