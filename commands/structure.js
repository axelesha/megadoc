//---------------------------------------------------------------------------
// commands/structure.js
// команда вывода структура чата
//---------------------------------------------------------------------------
const registerCommand = require('../utils/registerCommand');
const { getTranslation } = require('../utils/translations');
/**
 * Handler for structure command
 * Shows the branch structure for the current chat using dynamic translations
 */
module.exports = (bot, pool) => {
  const handleStructure = async (ctx) => {
    const chatId = ctx.chat.id;
    const userLanguage = ctx.session.language || 'en';

    try {
      // Get branches for this specific chat
      const [branches] = await pool.execute(
        'SELECT id, name, parent_id FROM branches WHERE chat_id = ? ORDER BY parent_id, sort_order',
        [chatId]
      );
      
      // Build branch tree
      let treeText = '';
      
      // Function to build tree structure
      const buildTree = (parentId = null, level = 0) => {
        const children = branches.filter(branch => branch.parent_id === parentId);
        
        for (const branch of children) {
          treeText += `${'  '.repeat(level)}• ${branch.name} (${branch.id})\n`;
          buildTree(branch.id, level + 1);
        }
      };
      
      buildTree();
      
      // Send message with dynamic translations
      if (treeText) {
        const structureMessage = await getTranslation('structure_response', userLanguage);
        await ctx.replyWithMarkdown(`${structureMessage}:\n\n${treeText}`);
      } else {
        const noBranchesMessage = await getTranslation('no_branches_found', userLanguage);
        const createBranchHint = await getTranslation('use_new_branch_hint', userLanguage);
        await ctx.reply(`${noBranchesMessage}. ${createBranchHint}`);
      }
      
    } catch (error) {
      console.error('Structure command error:', error);
      const errorMessage = await getTranslation('error_retrieving_structure', userLanguage);
      await ctx.reply(errorMessage);
    }
  };

  // Register with English keywords only
  registerCommand(bot, ['structure'], handleStructure, pool);
};
//--------------------------------------------------------------------------

