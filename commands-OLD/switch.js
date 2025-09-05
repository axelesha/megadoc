// commands/switch.js
module.exports = (bot, pool) => {
    const handleSwitch = async (ctx) => {
        const branchId = ctx.message.text.split(' ')[1];
        // Сохраняем выбор ветки для пользователя
        await pool.execute(
            'UPDATE users SET current_branch_id = ? WHERE id = ?',
            [branchId, ctx.from.id]
        );
        ctx.reply(`Переключились на ветку: ${branchId}`);
    };
    registerCommand(bot, ['switch', 'переключить'], handleSwitch);
};
