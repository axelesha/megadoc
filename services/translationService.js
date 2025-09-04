// services/translationService.js

const DeepSeekService = require('./deepSeekService');
const deepSeek = new DeepSeekService();

class TranslationService {
    constructor() {
        this.supportedLanguages = ['en', 'ru', 'zh', 'es', 'fr', 'de', 'ja', 'ko', 'ar', 'hi', 'pt'];
    }

    async detectLanguage(text) {
        // Используем DeepSeek для определения языка
        try {
            const response = await deepSeek.generateResponse([{
                role: 'user',
                content: `Определи язык этого текста и верни только код языка (en, ru, etc.): "${text}"`
            }]);
            
            // Извлекаем код языка из ответа
            const languageCode = response.trim().toLowerCase();
            return this.supportedLanguages.includes(languageCode) ? languageCode : 'en';
        } catch (error) {
            console.error('Error detecting language:', error);
            
            // Резервная логика для коротких сообщений
            if (text.length < 10) return 'en';
            if (/[\u0400-\u04FF]/.test(text)) return 'ru';
            if (/[\u4E00-\u9FFF]/.test(text)) return 'zh';
            if (/[\u3040-\u309F]/.test(text)) return 'ja';
            if (/[\u30A0-\u30FF]/.test(text)) return 'ja';
            if (/[\uAC00-\uD7AF]/.test(text)) return 'ko';
            
            return 'en';
        }
    }

    async translateText(text, targetLanguage, sourceLanguage = 'auto') {
        if (!text || !targetLanguage || targetLanguage === sourceLanguage) return text;
        
        try {
            const response = await deepSeek.generateResponse([{
                role: 'user',
                content: `Переведи этот текст с ${sourceLanguage} на ${targetLanguage}: "${text}"`
            }]);
            
            return response;
        } catch (error) {
            console.error('Error translating text:', error);
            return text; // Возвращаем оригинал в случае ошибки
        }
    }

    async getUserLanguagePreference(pool, userId, chatId = 0) {
        try {
            const [preferences] = await pool.execute(
                'SELECT preferred_language, auto_translate FROM user_language_preferences WHERE user_id = ? AND chat_id = ?',
                [userId, chatId]
            );
            
            if (preferences.length > 0) {
                return preferences[0];
            }
            
            // Создаем запись по умолчанию
            await pool.execute(
                'INSERT INTO user_language_preferences (user_id, chat_id, preferred_language, auto_translate) VALUES (?, ?, ?, ?)',
                [userId, chatId, 'en', true]
            );
            
            return { preferred_language: 'en', auto_translate: true };
        } catch (error) {
            console.error('Error getting user language preference:', error);
            return { preferred_language: 'en', auto_translate: true };
        }
    }
    
    getSupportedLanguages() {
        return this.supportedLanguages;
    }
}

module.exports = new TranslationService();
