// commands/index.js
const fs = require('fs');
const path = require('path');

module.exports = (bot, pool) => {
  const commandsDir = path.join(__dirname);
  
  fs.readdirSync(commandsDir).forEach(file => {
    if (file === 'index.js' || !file.endsWith('.js')) return;
    
    try {
      const commandHandler = require(`./${file}`);
      commandHandler(bot, pool);
      console.log(`✓ Command ${file} registered successfully`);
    } catch (error) {
      console.error(`✗ Error registering command ${file}:`, error);
    }
  });
};
