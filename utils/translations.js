const NodeCache = require('node-cache');

// Кэш переводов (обновляется каждые 5 минут)
const translationsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

class TranslationService {
    constructor(pool) {
        this.pool = pool;
    }

    // Загрузка всех переводов в кэш
    async loadTranslations() {
        try {
            const [translations] = await this.pool.execute(`
                SELECT language_code, translation_key, translation_text 
                FROM translations
            `);

            const translationsByLang = {};
            translations.forEach(row => {
                if (!translationsByLang[row.language_code]) {
                    translationsByLang[row.language_code] = {};
                }
                translationsByLang[row.language_code][row.translation_key] = row.translation_text;
            });

            // Сохраняем в кэш
            for (const [lang, translations] of Object.entries(translationsByLang)) {
                translationsCache.set(lang, translations);
            }

            console.log('✓ Translations loaded from database');
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    // Получение перевода
    async getTranslation(key, language = 'en') {
        // Пытаемся получить из кэша
        const langTranslations = translationsCache.get(language) || {};
        let translation = langTranslations[key];

        // Если перевод не найден, пробуем английскую версию
        if (!translation && language !== 'en') {
            const enTranslations = translationsCache.get('en') || {};
            translation = enTranslations[key];
        }

        // Если всё еще не найден, возвращаем ключ
        return translation || key;
    }

    // Добавление нового перевода
    async addTranslation(languageCode, key, text) {
        try {
            await this.pool.execute(`
                INSERT INTO translations (language_code, translation_key, translation_text)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE translation_text = VALUES(translation_text)
            `, [languageCode, key, text]);

            // Обновляем кэш
            const langTranslations = translationsCache.get(languageCode) || {};
            langTranslations[key] = text;
            translationsCache.set(languageCode, langTranslations);

            console.log(`✓ Translation added: ${languageCode}.${key}`);
            return true;
        } catch (error) {
            console.error('Error adding translation:', error);
            return false;
        }
    }

    // Получение всех переводов для языка
    async getTranslationsForLanguage(languageCode) {
        return translationsCache.get(languageCode) || {};
    }
}

// Создаем экземпляр и экспортируем
let translationServiceInstance = null;

module.exports = {
    getTranslation: (key, language) => {
        if (!translationServiceInstance) {
            console.error('Translation service not initialized!');
            return key;
        }
        return translationServiceInstance.getTranslation(key, language);
    },
    
    addTranslation: (languageCode, key, text) => {
        if (!translationServiceInstance) {
            console.error('Translation service not initialized!');
            return false;
        }
        return translationServiceInstance.addTranslation(languageCode, key, text);
    },
    
    loadTranslations: (pool) => {
        translationServiceInstance = new TranslationService(pool);
        
        if (!translationServiceInstance) {
            console.error('Translation service not initialized!');
            return false;
        }
        return translationServiceInstance.loadTranslations();
    }
};
