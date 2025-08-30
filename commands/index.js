const fs = require('fs');
const path = require('path');

function registerCommandsFromDirectory(dirPath, bot, pool) {
  fs.readdirSync(dirPath, { withFileTypes: true }).forEach(dirent => {
    const fullPath = path.join(dirPath, dirent.name);
    
    if (dirent.isDirectory()) {
      // Рекурсивно обрабатываем подпапки
      registerCommandsFromDirectory(fullPath, bot, pool);
    } else if (dirent.isFile() && 
               dirent.name !== 'index.js' && 
               dirent.name.endsWith('.js')) {
      // Регистрируем команду из файла
      const commandHandler = require(fullPath);
      commandHandler(bot, pool);
      console.log(`✅ Команда ${dirent.name} зарегистрирована`);
    }
  });
}

module.exports = (bot, pool) => {
  registerCommandsFromDirectory(__dirname, bot, pool);
};

