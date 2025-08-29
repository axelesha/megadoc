📘 Памятка по написанию команд для MegaDoc Bot

🎯 Общие принципы

1. Структура файла команды

Каждая команда должна быть в отдельном файле в папке commands/ и экспортировать функцию с сигнатурой (bot, pool):

```javascript
// commands/exampleCommand.js
const registerCommand = require('../utils/registerCommand');

module.exports = (bot, pool) => {
  const handler = async (ctx) => {
    // Логика обработки команды
  };

  // Регистрируем команду и её алиасы
  registerCommand(bot, ['command', 'команда'], handler);
};
```

2. Именование файлов

· Используйте английские названия в стиле camelCase или kebab-case
· Название должно отражать суть команды
· Пример: newBranch.js, edit-branch.js

3. Многоязычность

· Все команды должны поддерживать минимум 2 языка (русский и английский)
· Используйте функцию registerCommand для регистрации алиасов
· Все тексты для пользователя должны быть переводимыми

```javascript
// Правильно
registerCommand(bot, ['structure', 'структура'], handler);

// Неправильно
registerCommand(bot, ['structure'], handler);
```

4. Работа с базой данных

· Все запросы к БД должны использовать переданный pool
· Обязательна обработка ошибок при работе с БД
· Используйте параметризованные запросы для защиты от SQL-инъекций

```javascript
// Правильно
await pool.execute('SELECT * FROM branches WHERE id = ?', [branchId]);

// Неправильно
await pool.execute(`SELECT * FROM branches WHERE id = ${branchId}`);
```

5. Обработка ошибок

· Все команды должны иметь try/catch блоки
· Пользователь должен получать понятные сообщения об ошибках
· Все ошибки должны логироваться в консоль

```javascript
try {
  // Логика команды
} catch (error) {
  console.error('Ошибка в команде X:', error);
  ctx.reply('❌ Произошла ошибка при выполнении команды');
}
```

6. Валидация входных данных

· Проверяйте все входные параметры
· Используйте единые функции-валидаторы из utils/validators.js

```javascript
const { validateBranchId } = require('../utils/validators');

if (!validateBranchId(branchId)) {
  return ctx.reply('❌ Неверный формат ID ветки');
}
```

📝 Пример правильной команды

```javascript
// commands/newBranch.js
const registerCommand = require('../utils/registerCommand');
const { validateBranchId } = require('../utils/validators');
const { getUserLanguage } = require('../utils/languageUtils');

module.exports = (bot, pool) => {
  const handleNewBranch = async (ctx) => {
    try {
      const args = ctx.message.text.split(' ').slice(1);
      const userLanguage = await getUserLanguage(ctx.from.id);
      
      // Валидация и парсинг аргументов
      if (args.length < 1) {
        const message = userLanguage === 'ru' 
          ? '❌ Использование: !new_branch ID [--parent PARENT_ID] [--description "Описание"]'
          : '❌ Usage: !new_branch ID [--parent PARENT_ID] [--description "Description"]';
        return ctx.reply(message);
      }

      const branchId = args[0];
      
      if (!validateBranchId(branchId)) {
        const message = userLanguage === 'ru'
          ? '❌ Неверный формат ID. Используйте только латинские буквы, цифры, дефис и подчеркивание.'
          : '❌ Invalid ID format. Use only Latin letters, numbers, hyphen and underscore.';
        return ctx.reply(message);
      }

      // Логика создания ветки...
      
      const successMessage = userLanguage === 'ru'
        ? `✅ Ветка "${branchId}" успешно создана!`
        : `✅ Branch "${branchId}" created successfully!`;
      
      ctx.reply(successMessage);
      
    } catch (error) {
      console.error('Ошибка в команде new_branch:', error);
      
      const errorMessage = await getUserLanguage(ctx.from.id) === 'ru'
        ? '❌ Ошибка при создании ветки'
        : '❌ Error creating branch';
      
      ctx.reply(errorMessage);
    }
  };

  // Регистрируем команду и её алиасы
  registerCommand(bot, ['new_branch', 'новая_ветка'], handleNewBranch);
};
```

🔧 Утилиты, которые нужно использовать

1. registerCommand - для регистрации команд и алиасов
2. Валидаторы из utils/validators.js - для проверки входных данных
3. Функции из utils/languageUtils.js - для работы с переводами
4. Логирование ошибок - всегда используйте console.error

📋 Процесс добавления новой команды

1. Создайте файл в папке commands/ по образцу
2. Реализуйте логику команды с обработкой ошибок
3. Добавьте поддержку многоязычности
4. Протестируйте команду
5. Убедитесь, что команда автоматически подхватывается системой

❌ Чего избегать

1. Не добавляйте команды вручную в index.js - система делает это автоматически
2. Не используйте глобальные переменные - вся необходимая информация передается через параметры
3. Не игнорируйте ошибки - все исключения должны быть обработаны
4. Не забывайте про многоязычность - все пользовательские сообщения должны быть переводимыми

Эта памятка поможет поддерживать единый стиль кода и обеспечит стабильную работу бота при добавлении новых команд! 🚀

---

Примечание: Полный код утилит (registerCommand, validators, languageUtils) должен быть добавлен в соответствующие файлы в папке utils/ перед использованием.
