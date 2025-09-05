const fs = require("fs");
const path = require("path");

module.exports = (bot, pool) => {
  // Получаем путь к директории с командами
  const commandsDir = path.join(__dirname);

  // Читаем все файлы в директории
  fs.readdirSync(commandsDir).forEach((file) => {
    // Пропускаем index.js и файлы, которые не являются JavaScript-файлами
    if (file === "index.js" || !file.endsWith(".js")) return;

    // Получаем имя команды из имени файла (без расширения .js)
    const commandName = path.basename(file, ".js");

    try {
      // Импортируем обработчик команды
      const commandHandler = require(`./${file}`);

      // Регистрируем команду
      commandHandler(bot, pool);

      console.log(`✅ Команда ${commandName} успешно зарегистрирована`);
    } catch (error) {
      console.error(`❌ Ошибка при регистрации команды ${commandName}:`, error);
    }
  });
};
