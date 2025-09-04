
const registerCommand = require('../../utils/registerCommand');
const { getTranslation } = require('../../utils/translations');

module.exports = registerCommand(['switch'], async (ctx) => {
    const args = ctx.message.text.split(' ');
    const userLanguage = ctx.session.language || 'en';

    try {
        const usageMessage = await getTranslation('switch_branch_usage', userLanguage);
        if (args.length < 2) {
            return ctx.reply(usageMessage);
        }

        const newBranchId = args[1].toLowerCase();
        const chatId = ctx.chat.id;

        // Check if branch exists in this chat
        const [branches] = await ctx.pool.execute(
            'SELECT id FROM branches WHERE id = ? AND chat_id = ?',
            [newBranchId, chatId]
        );

        // Create branch if doesn't exist
        if (branches.length === 0) {
            await ctx.pool.execute(
                'INSERT INTO branches (id, chat_id, name) VALUES (?, ?, ?)',
                [newBranchId, chatId, newBranchId]
            );
        }

        // Update current branch in session
        ctx.session.current_branch = newBranchId;
        const successMessage = await getTranslation('branch_switched', userLanguage);
        await ctx.reply(successMessage.replace('{branchName}', newBranchId));

    } catch (error) {
        console.error('Switch command error:', error);
        const errorMessage = await getTranslation('error_switching_branch', userLanguage);
        await ctx.reply(errorMessage);
    }
});