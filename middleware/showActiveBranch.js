//---------------------------------------------------------------
// middleware/showActiveBranch.js
//---------------------------------------------------------------
// Метаданные модуля
module.exports.moduleName = 'showActiveBranch';
module.exports.dependencies = ['sessionAndSave'];

module.exports.factory = (bot, pool) => {
    if (global.moduleRegistry && global.moduleRegistry.isModuleLoaded('showActiveBranch')) {
        return (ctx, next) => next();
    }

    return async (ctx, next) => {
        await next();
        
        // Показываем активную ветку после каждого сообщения (с вероятностью 20%)
        if (ctx.message && !ctx.message.text.startsWith('/') && Math.random() < 0.2) {
            try {
                const branchId = ctx.session?.current_branch_id || 0;
                const [branch] = await pool.execute(
                    'SELECT name FROM branches WHERE id = ?',
                    [branchId]
                );
                
                const branchName = branch.length > 0 ? branch[0].name : 'Основная ветка';
                await ctx.reply(
                    `📂 Активная ветка: ${branchName}\nИспользуйте /structure для навигации`,
                    { reply_to_message_id: ctx.message.message_id }
                );
            } catch (error) {
                console.error('Error showing active branch:', error);
            }
        }
    };
};
//---------------------------------------------------------------
