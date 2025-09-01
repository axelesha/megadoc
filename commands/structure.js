const registerCommand = require("../utils/registerCommand");
const { getTranslation } = require("../utils/translationUtils");
const { getUserLanguage } = require("../utils/languageUtils");


// Пример получения переведенного названия ветки
async function getBranchName(branchId, languageCode) {
    const [rows] = await pool.execute(
      `SELECT COALESCE(
        (SELECT name FROM branch_translations 
         WHERE branch_id = ? AND language_code = ?),
        (SELECT name FROM branches WHERE id = ?)
      ) as name`,
      [branchId, languageCode, branchId]
    );
    return rows[0].name;
  }

  
/**
 * Рекурсивно строит дерево веток
 */
async function buildTree(parentId = null, level = 0, pool, languageCode) {
  const [branches] = await pool.execute(
    "SELECT id, name FROM branches WHERE parent_id = ? ORDER BY sort_order ASC",
    [parentId]
  );

  let treeText = "";

  for (const branch of branches) {
    // Получаем перевод названия ветки или используем английское название из БД
    const branchName =
      (await getTranslation(`branch.${branch.id}.name`, languageCode)) ||
      branch.name;

    // Добавляем отступы и название ветки
    treeText += `${"  ".repeat(level)}• ${branchName}\n`;

    // Рекурсивно добавляем потомков
    treeText += await buildTree(branch.id, level + 1, pool, languageCode);
  }

  return treeText;
}

module.exports = (bot, pool) => {
  const handleStructure = async (ctx) => {
    try {
      const userLanguage = await getUserLanguage(ctx.from.id, pool);

      // Получаем перевод заголовка
      const title = await getTranslation("structure.title", userLanguage);

      // Строим дерево
      const treeStructure = await buildTree(null, 0, pool, userLanguage);

      // Формируем сообщение
      const message = `🌳 *${title}:*\n\n${
        treeStructure || (await getTranslation("structure.empty", userLanguage))
      }`;

      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error("Structure command error:", error);

      // Используем перевод для ошибки или fallback на английский
      const errorMessage =
        (await getTranslation(
          "error.general",
          await getUserLanguage(ctx.from.id, pool)
        )) || "An error occurred";
      ctx.reply(errorMessage);
    }
  };

  // Регистрируем команду на всех языках
  registerCommand(bot, ["structure", "структура", "дерево"], handleStructure);
};
