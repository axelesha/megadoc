const registerCommand = require('../utils/registerCommand');
const { validateBranchId, parseCommandParams, checkBranchPermission } = require('../utils/commandUtils');

module.exports = registerCommand('branch', async (ctx, pool) => {
  const params = parseCommandParams(ctx.message.text);
  const subcommand = params._[0];
  
  try {
    switch (subcommand) {
      case 'create':
        await handleCreateBranch(ctx, params, pool);
        break;
      case 'switch':
        await handleSwitchBranch(ctx, params, pool);
        break;
      case 'close':
        await handleCloseBranch(ctx, params, pool);
        break;
      case 'archive':
        await handleArchiveBranch(ctx, params, pool);
        break;
      case 'delete':
        await handleDeleteBranch(ctx, params, pool);
        break;
      case 'info':
        await handleBranchInfo(ctx, params, pool);
        break;
      case 'edit':
        await handleEditBranch(ctx, params, pool);
        break;
      case 'permission':
        await handlePermissionBranch(ctx, params, pool);
        break;
      default:
        await showBranchHelp(ctx);
    }
  } catch (error) {
    console.error('Branch command error:', error);
    await ctx.reply(`❌ ${error.message}`);
  }
}, {
  description: 'Manage branches',
  usage: '/branch <create|switch|close|archive|delete|info|edit|permission> [parameters]',
  aliases: ['br'],
  category: 'Branches'
});

async function handleEditBranch(ctx, params, pool) {
    const branchId = validateBranchId(params.id);
    const newId = params.newid ? validateBranchId(params.newid) : null;
    const name = params.name;
    const description = params.description;
    const accessType = params.access;
  
    // Находим ветку
    const [branches] = await pool.execute(
      'SELECT id, created_by FROM branches WHERE chat_id = ? AND branch_id = ?',
      [ctx.chat.id, branchId]
    );
  
    if (branches.length === 0) {
      throw new Error(`Branch ${branchId} not found`);
    }
  
    const branch = branches[0];
  
    // Проверяем права (только владелец или admin может редактировать)
    const hasAccess = await checkBranchPermission(pool, branch.id, ctx.from.id, 'admin');
    if (!hasAccess) {
      throw new Error(`You don't have permission to edit this branch`);
    }
  
    // Подготавливаем поля для обновления
    const updateFields = [];
    const updateValues = [];
  
    if (newId) {
      // Проверяем, что новый ID не занят
      const [existing] = await pool.execute(
        'SELECT id FROM branches WHERE chat_id = ? AND branch_id = ?',
        [ctx.chat.id, newId]
      );
      if (existing.length > 0) {
        throw new Error(`Branch ID ${newId} is already taken`);
      }
      updateFields.push('branch_id = ?');
      updateValues.push(newId);
    }
  
    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
  
    if (description) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
  
    if (accessType && ['public', 'protected', 'private'].includes(accessType)) {
      updateFields.push('access_type = ?');
      updateValues.push(accessType);
    }
  
    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }
  
    updateValues.push(branch.id);
  
    // Выполняем обновление
    await pool.execute(
      `UPDATE branches SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
  
    await ctx.reply(`✅ Branch ${branchId} updated successfully`);
  }
  
  async function handlePermissionBranch(ctx, params, pool) {
    // Заглушка для будущей реализации управления правами
    // Реализуем позже, когда будем работать с системой прав доступа
    await ctx.reply('⚠️ Permission management will be implemented in the next phase');
  }
  
  // Обновляем функцию создания ветки для поддержки access_type
  async function handleCreateBranch(ctx, params, pool) {
    const branchId = validateBranchId(params.id);
    const parentId = params.parent || ctx.session.current_branch;
    const name = params.name || `Branch ${branchId}`;
    const description = params.description || '';
    const accessType = params.access || 'public';
  
    // Проверяем существование ветки
    const [existing] = await pool.execute(
      'SELECT id FROM branches WHERE chat_id = ? AND branch_id = ?',
      [ctx.chat.id, branchId]
    );
  
    if (existing.length > 0) {
      throw new Error(`Branch ${branchId} already exists`);
    }
  
    // Создаем ветку
    const [result] = await pool.execute(
      `INSERT INTO branches (chat_id, branch_id, parent_id, name, description, access_type, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [ctx.chat.id, branchId, parentId, name, description, accessType, ctx.from.id]
    );
  
    // Даем создателю права owner
    await pool.execute(
      `INSERT INTO branch_permissions (branch_id, user_id, permission_level, granted_by) 
       VALUES (?, ?, 'owner', ?)`,
      [result.insertId, ctx.from.id, ctx.from.id]
    );
  
    await ctx.reply(`✅ Branch ${branchId} created successfully with ${accessType} access`);
  }
  
  // Обновляем справку
  async function showBranchHelp(ctx) {
    const helpText = `
  🌿 Branch Management:
  
  /branch create id=<id> [parent=<parent>] [name="Name"] [description="Description"] [access=public|protected|private]
  - Create a new branch
  
  /branch switch id=<id>
  - Switch to another branch
  
  /branch close id=<id>
  - Close a branch (read-only)
  
  /branch archive id=<id>
  - Archive a branch (hidden)
  
  /branch delete id=<id>
  - Mark branch as deleted
  
  /branch info id=<id>
  - Show branch information
  
  /branch edit id=<id> [newid=<new_id>] [name="New Name"] [description="New Description"] [access=public|protected|private]
  - Edit branch properties
  
  /branch permission [subcommand]
  - Manage user permissions (coming soon)
  
  Examples:
  /branch create id=LTM-1 name="Long Term Memory" access=protected
  /branch switch id=LTM-1
  /branch edit id=LTM-1 newid=LTM-2 name="Updated Name" access=private
    `.trim();
    
    await ctx.reply(helpText);
  }
