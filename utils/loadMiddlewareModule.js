// utils/loadMiddlewareModule.js
const fs = require('fs');
const path = require('path');
const moduleRegistry = require('./moduleRegistry');

function loadMiddlewareModule(moduleName, bot, pool, modulesPath, loadingStack = new Set()) {
    // Защита от циклических зависимостей
    if (loadingStack.has(moduleName)) {
        console.error(`✗ Cyclic dependency detected: ${Array.from(loadingStack).join(' -> ')} -> ${moduleName}`);
        return false;
    }

    try {
        const modulePath = path.join(modulesPath, `${moduleName}.js`);
        
        if (!fs.existsSync(modulePath)) {
            console.error(`✗ Module file not found: ${modulePath}`);
            return false;
        }

        const middlewareModule = require(modulePath);
        
        if (!middlewareModule.moduleName || !middlewareModule.factory) {
            console.error(`✗ Module ${moduleName} has invalid format`);
            return false;
        }
        
        if (moduleRegistry.isModuleLoaded(moduleName)) {
            console.log(`✓ Module already loaded: ${moduleName}`);
            return true;
        }
        
        // Загружаем зависимости
        if (middlewareModule.dependencies && middlewareModule.dependencies.length > 0) {
            const newLoadingStack = new Set(loadingStack);
            newLoadingStack.add(moduleName);
            
            for (const dep of middlewareModule.dependencies) {
                if (!moduleRegistry.isModuleLoaded(dep)) {
                    console.log(`📦 Loading dependency: ${dep} for ${moduleName}`);
                    const success = loadMiddlewareModule(dep, bot, pool, modulesPath, newLoadingStack);
                    if (!success) {
                        console.error(`✗ Failed to load dependency ${dep} for ${moduleName}`);
                        return false;
                    }
                }
            }
        }
        
        // Загружаем сам модуль
        const middleware = middlewareModule.factory(bot, pool);
        if (typeof middleware === 'function') {
            bot.use(middleware);
            moduleRegistry.registerModule(moduleName, middleware);
            console.log(`✓ Module loaded: ${moduleName}`);
            return true;
        } else {
            console.error(`✗ Module ${moduleName} factory didn't return a function`);
            return false;
        }
    } catch (error) {
        console.error(`✗ Error loading module ${moduleName}:`, error.message);
        return false;
    }
}

module.exports = loadMiddlewareModule;
