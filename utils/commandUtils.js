// Валидация идентификатора ветки
function validateBranchId(id) {
    if (!id) {
      throw new Error('Branch ID is required');
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('Branch ID must contain only letters, numbers, underscores and hyphens');
    }
    
    return id.toUpperCase();
  }
  
  // Парсинг параметров команды
  function parseCommandParams(text) {
    const params = { _: [] };
    const args = text.split(' ').slice(1);
    
    args.forEach(arg => {
      if (arg.includes('=')) {
        const [key, value] = arg.split('=');
        // Убираем кавычки вокруг значения, если они есть
        params[key] = value.replace(/^["']|["']$/g, '');
      } else {
        params._.push(arg);
      }
    });
    
    return params;
  }
  
  // Проверка прав доступа к ветке
  async function checkBranchPermission(pool, branchId, userId, requiredLevel) {
    const permissionLevels = {
      'reader': 1,
      'writer': 2,
      'admin': 3,
      'owner': 4
    };
    
    const [permissions] = await pool.execute(
      `SELECT permission_level FROM branch_permissions 
       WHERE branch_id = ? AND user_id = ?`,
      [branchId, userId]
    );
    
    if (permissions.length === 0) {
      return false;
    }
    
    const userLevel = permissionLevels[permissions[0].permission_level];
    const requiredLevelValue = permissionLevels[requiredLevel];
    
    return userLevel >= requiredLevelValue;
  }
  
  module.exports = {
    validateBranchId,
    parseCommandParams,
    checkBranchPermission
  };