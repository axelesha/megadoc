// utils/moduleRegistry.js
class ModuleRegistry {
    constructor() {
        this.loadedModules = new Map();
    }

    registerModule(name, instance) {
        this.loadedModules.set(name, instance);
        console.log(`✓ Module registered: ${name}`);
    }

    isModuleLoaded(name) {
        return this.loadedModules.has(name);
    }

    getModule(name) {
        return this.loadedModules.get(name);
    }

    getAllModules() {
        return Array.from(this.loadedModules.entries());
    }
}

// Создаем глобальный экземпляр реестра
if (!global.moduleRegistry) {
    global.moduleRegistry = new ModuleRegistry();
}

module.exports = global.moduleRegistry;
