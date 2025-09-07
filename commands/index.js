const fs = require('fs');
const path = require('path');
const registerCommand = require('../utils/registerCommand');

module.exports = (bot, pool) => {
  function loadCommandsFromDir(dirPath) {
    console.log(`📁 Scanning directory: ${path.relative(process.cwd(), dirPath)}`);
    
    const files = fs.readdirSync(dirPath);
    let loadedCount = 0;

    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        console.log(`↳ Entering subdirectory: ${file}`);
        loadedCount += loadCommandsFromDir(fullPath);
      } else if (file.endsWith('.js') && file !== 'index.js') {
        try {
          console.log(`   🔍 Found command file: ${file}`);
          const commandHandler = require(fullPath);
          
          if (typeof commandHandler === 'function') {
            commandHandler(bot, pool);
            loadedCount++;
            console.log(`   ✅ Registered: ${file}`);
          } else {
            console.log(`   ⚠️ Skipped (not a function): ${file}`);
          }
        } catch (error) {
          console.error(`   ❌ Error loading ${file}:`, error.message);
        }
      }
    });
    
    return loadedCount;
  }

  console.log('🚀 Starting command registration...');
  const totalLoaded = loadCommandsFromDir(__dirname);
  console.log(`✅ Total commands registered: ${totalLoaded}\n`);
};