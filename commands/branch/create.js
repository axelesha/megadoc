const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');

module.exports = registerCommand(['create_branch', 'new_branch'], async (ctx) => {
    const args = ctx.message.text.split(' ');
    const userLanguage = ctx.session?.language || 'en';

    try {
        if (args.length < 2) {
            const usageMessage = await getTranslation('create_branch_usage', userLanguage);
            return ctx.reply(usageMessage);
        }

        const branchName = args[1].trim();
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;

        // Проверяем валидность имени
        if (!/^[a-zA-Z0-9_-]{3,50}$/.test(branchName)) {
            const invalidMessage = await getTranslation('invalid_branch_name', userLanguage);
            return ctx.reply(invalidMessage);
        }

        // Проверяем существование ветки
        const [existingBranches] = await ctx.pool.execute(
            'SELECT id FROM branches WHERE chat_id = ? AND name = ?',
            [chatId, branchName]
        );

        if (existingBranches.length > 0) {
            const existsMessage = await getTranslation('branch_already_exists', userLanguage);
            return ctx.reply(existsMessage.replace('{branch}', branchName));
        }

        // Создаем новую ветку
        await ctx.pool.execute(
            'INSERT INTO branches (chat_id, name, created_by) VALUES (?, ?, ?)',
            [chatId, branchName, userId]
        );

        const successMessage = await getTranslation('branch_created', userLanguage);
        await ctx.reply(successMessage.replace('{branch}', branchName));

    } catch (error) {
        console.error('Create branch error:', error);
        const errorMessage = await getTranslation('error_occurred', userLanguage);
        await ctx.reply(errorMessage);
    }
});
