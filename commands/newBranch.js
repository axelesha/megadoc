const registerCommand = require('../utils/registerCommand');
const { validateBranchId } = require('../utils/validators');
const { getUserLanguage } = require('../utils/languageUtils');

/**
 * Обработчик команды !new_branch
 * Создает новую ветку в системе.
 * Синтаксис: !new_branch ID [--parent PARENT_ID] [--description "Описание"]
 */
module.exports = (bot, pool) => {
    const handleNewBranch = async (ctx) => {
        try {
            const args = ctx.message.text.split(' ').slice(1);
            const userId = ctx.from.id;
            const userLanguage = await getUserLanguage(userId, pool);

            // ———————————————— 1. ВАЛИДАЦИЯ И ПАРСИНГ АРГУМЕНТОВ ————————————————
            if (args.length < 1) {
                const message = userLanguage === 'ru' 
                    ? '✗ Использование: `!new_branch ID [--parent PARENT_ID] [--description "Описание"]`'
                    : '✗ Usage: `!new_branch ID [--parent PARENT_ID] [--description "Description"]`';
                return ctx.replyWithMarkdown(message);
            }

            let branchId = args[0];
            let parentId = null;
            let description = '';

            // Парсим опции (--parent, --description)
            for (let i = 1; i < args.length; i++) {
                if (args[i] === '--parent' && args[i + 1]) {
                    parentId = args[i + 1];
                    i++; // Пропускаем следующее значение, так как оно является parentId
                } else if (args[i] === '--description' && args[i + 1]) {
                    // Берем всю оставшуюся строку как описание
                    description = args.slice(i + 1).join(' ').replace(/^"|"$/g, '');
                    break; // Описание всегда последнее
                }
            }

            // Валидация ID ветки
            if (!validateBranchId(branchId)) {
                const message = userLanguage === 'ru'
                    ? '✗ Неверный формат ID. Используйте только латинские буквы, цифры и подчеркивание (A-Z, a-z, 0-9, _).'
                    : '✗ Invalid ID format. Use only Latin letters, numbers, and underscore (A-Z, a-z, 0-9, _).';
                return ctx.reply(message);
            }

            // ———————————————— 2. ПРОВЕРКА РОДИТЕЛЬСКОЙ ВЕТКИ ————————————————
            if (parentId) {
                if (!validateBranchId(parentId)) {
                    const message = userLanguage === 'ru'
                        ? '✗ Неверный формат ID родительской ветки.'
                        : '✗ Invalid parent branch ID format.';
                    return ctx.reply(message);
                }
                // Проверяем существование родительской ветки
                const [parentRows] = await pool.execute(
                    'SELECT id FROM branches WHERE id = ?',
                    [parentId]
                );
                if (parentRows.length === 0) {
                    const message = userLanguage === 'ru'
                        ?` ✗ Родительская ветка с ID "${parentId}" не найдена`.
                        : `✗ Parent branch with ID "${parentId}" not found.`;
                    return ctx.reply(message);
                }
            }

            // ———————————————— 3. СОЗДАНИЕ ВЕТКИ В БАЗЕ ДАННЫХ ————————————————
            // Определяем order для новой ветки (максимальный order среди детей родителя + 1)
            let sortOrder = 0;
            if (parentId) {
                const [orderRows] = await pool.execute(
                    'SELECT MAX(sort_order) as max_order FROM branches WHERE parent_id = ?',
                    [parentId]
                );
                sortOrder = (orderRows[0].max_order || 0) + 1;
            } else {
                // Для корневых веток
                const [orderRows] = await pool.execute(
                    'SELECT MAX(sort_order) as max_order FROM branches WHERE parent_id IS NULL'
                );
                sortOrder = (orderRows[0].max_order || 0) + 1;
            }

            // Вставляем новую ветку
            await pool.execute(
              `  INSERT INTO branches (id, name, description, parent_id, sort_order, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [branchId, branchId, description, parentId, sortOrder, userId]
            );

            // ———————————————— 4. ОБНОВЛЕНИЕ СПИСКА ПОТОМКОВ У РОДИТЕЛЯ ————————————————
            // (Опционально, если у вас есть поле children_ids, которое нужно поддерживать актуальным)
            // Эту логику можно вынести в триггер БД или отдельную функцию.

            // ———————————————— 5. УСПЕШНЫЙ ОТВЕТ ПОЛЬЗОВАТЕЛЮ ————————————————
            const successMessage = userLanguage === 'ru'
                ? `✅ Ветка "*${branchId}*" успешно создана!`
                : `✅ Branch "*${branchId}*" created successfully!`;
            await ctx.replyWithMarkdown(successMessage);

        } catch (error) {
            console.error('Ошибка в команде new_branch:', error);

            // Обработка специфичных ошибок БД
            if (error.code === 'ER_DUP_ENTRY') {
                const message = await getUserLanguage(ctx.from.id, pool) === 'ru'
                    ? `✗ Ветка с ID "${branchId}" уже существует.`
                    : `✗ Branch with ID "${branchId}" already exists.`;
                return ctx.reply(message);
            }

            // Общая ошибка
            const errorMessage = await getUserLanguage(ctx.from.id, pool) === 'ru'
                ? '✗ Произошла ошибка при создании ветки.'
                : '✗ An error occurred while creating the branch.';
            ctx.reply(errorMessage);
        }
    };

    // Регистрируем команду и её алиасы
    registerCommand(bot, ['new_branch', 'новая_ветка'], handleNewBranch);
};