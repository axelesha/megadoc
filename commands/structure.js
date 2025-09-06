const { Markup } = require('telegraf');
const NodeCache = require('node-cache');
const { getTranslation } = require('../utils/translations');

const treeCache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

module.exports = (bot, pool) => {
    // Основная команда структуры
    bot.command('structure', async (ctx) => {
        try {
            const userLanguage = ctx.session?.language || 'en';
            const chatId = ctx.chat.id;
            const userId = ctx.from.id;
            const cacheKey = `tree_${chatId}_${userId}`;

            let treeState = treeCache.get(cacheKey) || {
                expandedBranches: [],
                currentPage: 0
            };

            const [branches] = await pool.execute(
                `SELECT id, name, parent_id, description 
                 FROM branches 
                 WHERE chat_id = ? AND is_visible = TRUE 
                 ORDER BY parent_id, sort_order, name`,
                [chatId]
            );

            const treeButtons = buildTreeButtons(branches, treeState.expandedBranches, userLanguage);
            const messageText = await formatTreeText(branches, treeState.expandedBranches, userLanguage);

            const keyboard = Markup.inlineKeyboard(treeButtons);
            
            if (ctx.callbackQuery) {
                await ctx.editMessageText(messageText, keyboard);
                await ctx.answerCbQuery();
            } else {
                await ctx.reply(messageText, keyboard);
            }

            treeCache.set(cacheKey, treeState);

        } catch (error) {
            console.error('Structure command error:', error);
            const errorMessage = await getTranslation('error_occurred', ctx.session?.language || 'en');
            await ctx.reply(errorMessage);
        }
    });

    // ... остальные обработчики с использованием getTranslation
};

// Обновленные функции для поддержки переводов
async function formatTreeText(branches, expandedBranches, userLanguage, parentId = 0, level = 0) {
    const children = branches.filter(branch => branch.parent_id === parentId);
    let text = await getTranslation('branch_structure', userLanguage) + '\n\n';

    children.forEach(branch => {
        const isExpanded = expandedBranches.includes(branch.id);
        const icon = isExpanded ? '📂' : '📁';
        const indent = '│   '.repeat(level);
        
        text += `${indent}${icon} ${branch.name}\n`;
        
        if (isExpanded) {
            text += formatTreeText(branches, expandedBranches, userLanguage, branch.id, level + 1);
        }
    });

    return text;
}
