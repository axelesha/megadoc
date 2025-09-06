const fs = require('fs');
const path = require('path');
const moduleRegistry = require('./moduleRegistry');
const loadMiddlewareModule = require('./loadMiddlewareModule');

function loadMiddlewares(bot, pool, dirPath) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            loadMiddlewares(bot, pool, fullPath);
        } else if (file.endsWith('.js') && file !== 'index.js') {
            try {
                const middlewareModule = require(fullPath);
                
                if (!middlewareModule.moduleName || !middlewareModule.factory) {
                    console.log(`✗ Middleware ${file} doesn't use unified format`);
                    return;
                }
                
                const moduleName = middlewareModule.moduleName;
                
                if (moduleRegistry.isModuleLoaded(moduleName)) {
                    console.log(`✓ Middleware already loaded: ${moduleName}`);
                    return;
                }
                
                // Загружаем зависимости
                if (middlewareModule.dependencies && middlewareModule.dependencies.length > 0) {
                    console.log(`📦 Loading dependencies for ${moduleName}: ${middlewareModule.dependencies.join(', ')}`);
                    
                    middlewareModule.dependencies.forEach(dep => {
                        if (!moduleRegistry.isModuleLoaded(dep)) {
                            console.log(`   ⚠️ Loading dependency: ${dep}`);
                            loadMiddlewareModule(dep, bot, pool, dirPath);
                        }
                    });
                }
                
                // Загружаем сам модуль
                const middleware = middlewareModule.factory(bot, pool);
                if (typeof middleware === 'function') {
                    bot.use(middleware);
                    moduleRegistry.registerModule(moduleName, middleware);
                    console.log(`✓ Middleware loaded: ${moduleName}`);
                }
            } catch (error) {
                console.error(`✗ Error loading middleware ${file}:`, error.message);
            }
        }
    });
}

module.exports = loadMiddlewares;
