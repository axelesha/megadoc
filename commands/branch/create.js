//-----------------------------------------------------------------------------------
// commands/branch/create.js
// команда создания новой ветки
//-----------------------------------------------------------------------------------
const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');

module.exports = registerCommand(['create_branch', 'new_branch'], async (ctx) => {
    const args = ctx.message.text.split(' ');
    const userLanguage = ctx.session.language || 'en';

    try {
        const usageMessage = await getTranslation('create_branch_usage', userLanguage);
        if (args.length < 2) {
            return ctx.reply(usageMessage);
        }

        const newBranchId = args[1].toLowerCase();
        const chatId = ctx.chat.id;
        const userId = ctx.from.id;

        const invalidNameMessage = await getTranslation('invalid_branch_name', userLanguage);
        if (!/^[a-zA-Z0-9_]+$/.test(newBranchId)) {
            return ctx.reply(invalidNameMessage);
        }

        const [existingBranches] = await ctx.pool.execute(
            'SELECT id FROM branches WHERE id = ? AND chat_id = ?',
            [newBranchId, chatId]
        );

        if (existingBranches.length > 0) {
            const branchExistsMessage = await getTranslation('branch_already_exists', userLanguage);
            return ctx.reply(branchExistsMessage.replace('{branchName}', newBranchId));
        }

        await ctx.pool.execute(
            'INSERT INTO branches (id, chat_id, name, created_by) VALUES (?, ?, ?, ?)',
            [newBranchId, chatId, newBranchId, userId]
        );

        const successMessage = await getTranslation('branch_created_success', userLanguage);
        await ctx.reply(successMessage.replace(/{branchName}/g, newBranchId));

    } catch (error) {
        console.error('Create branch error:', error);
        const errorMessage = await getTranslation('error_creating_branch', userLanguage);
        await ctx.reply(errorMessage);
    }
}
);
//-----------------------------------------------------------------------------------
