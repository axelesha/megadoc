//-----------------------------------------------------------------------
// utils/loadCommands.js
// рекурсивный обход папок в 
// директории commands и регистрация их
// в диспетчере
//------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

function loadCommands(bot, pool, dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Рекурсивный обход подпапок
            loadCommands(bot, pool, fullPath);
        } else if (file.endsWith('.js') && file !== 'index.js') {
            try {
                const commandHandler = require(fullPath);
                if (typeof commandHandler === 'function') {
                    commandHandler(bot, pool);
                    console.log(`✓ Command loaded: ${file}`);
                }
            } catch (error) {
                console.error(`✗ Error loading command ${file}:`, error.message);
            }
        }
    });
}

module.exports = loadCommands;
//------------------------------------------------------------------------

