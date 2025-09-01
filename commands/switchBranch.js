// commands/switchBranch.js
// Обработчик команды для переключения веток
module.exports = (pool) => async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
      return ctx.reply('Использование: /switch <имя_ветки>');
    }
  
    const userId = ctx.from.id;
    const newBranchId = args[1].toLowerCase(); // Пример: /switch project_alpha
  
    try {
      // 1. Проверяем, существует ли уже такая ветка для пользователя?
      // (В будущем здесь будет сложная логика проверки прав доступа)
      // Сейчас просто разрешим переключение на любую строку как имя ветки
  
      // 2. Обновляем текущую активную ветку в сессии пользователя
      ctx.session.current_branch = newBranchId;
  
      // 3. (ОПЦИОНАЛЬНО) Можно сохранить активную ветку и в БД для persistence между перезапусками сессии
      // await pool.execute(
      //  'UPDATE users SET current_branch_id = ? WHERE id = ?',
      //  [newBranchId, userId]
      // );
  
      ctx.reply(`Переключились на ветку: ${newBranchId}`);
    } catch (error) {
      console.error('Error switching branch:', error);
      ctx.reply('Произошла ошибка при переключении ветки.');
    }
  };
  