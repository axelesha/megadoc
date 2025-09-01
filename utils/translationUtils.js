const pool = require('../db.js'); // Или ваш путь к подключению БД

/**
 * Получает перевод для конкретного ключа и языка
 * @param {string} key - Ключ перевода (например: 'structure.title')
 * @param {string} languageCode - Код языка (ru, en, etc.)
 * @returns {Promise<string>} - Перевод или ключ, если перевод не найден
 */
async function getTranslation(key, languageCode = 'en') {
    try {
        const [rows] = await pool.execute(
            `SELECT t.text 
             FROM translations t
             JOIN languages l ON t.language_id = l.id
             WHERE t.key = ? AND l.code = ?`,
            [key, languageCode]
        );
        
        return rows[0]?.text || key;
    } catch (error) {
        console.error('Translation error:', error);
        return key; // Возвращаем ключ как fallback
    }
}

/**
 * Получает все переводы для конкретного ключа
 * @param {string} key - Ключ перевода
 * @returns {Promise<Object>} - Объект с переводами {en: 'text', ru: 'текст'}
 */
async function getAllTranslations(key) {
    try {
        const [rows] = await pool.execute(
            `SELECT l.code, t.text 
             FROM translations t
             JOIN languages l ON t.language_id = l.id
             WHERE t.key = ?`,
            [key]
        );
        
        const translations = {};
        rows.forEach(row => {
            translations[row.code] = row.text;
        });
        
        return translations;
    } catch (error) {
        console.error('Translation error:', error);
        return { en: key }; // Возвращаем ключ как fallback
    }
}

module.exports = {
    getTranslation,
    getAllTranslations
};