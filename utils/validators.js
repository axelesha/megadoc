// Валидация ID ветки
const validateBranchId = (id) => {
  return /^[a-zA-Z0-9_-]+$/.test(id);
};

// Валидация прав пользователя
const hasPermission = (userRole, requiredRole) => {
  const roles = {
    user: 0,
    moderator: 1,
    admin: 2,
  };
  return roles[userRole] >= roles[requiredRole];
};

module.exports = {
  validateBranchId,
  hasPermission,
};
