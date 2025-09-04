//-----------------------------------------------------------
// service/deepSeekService.js
//-----------------------------------------------------------
const axios = require('axios');

class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.baseURL = 'https://api.deepseek.com/v1/chat/completions';
    }

    async generateResponse(messages) {
        try {
            const response = await axios.post(this.baseURL, {
                model: "deepseek-chat",
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 секунд таймаут
            });

            return response.data.choices[0].message.content;
        } catch (error) {
            console.error('DeepSeek API Error:', error.response?.data || error.message);
            
            // Возвращаем заглушку в случае ошибки
            if (error.response?.status === 429) {
                return "Извините, превышен лимит запросов. Попробуйте позже.";
            }
            
            throw new Error('AI service unavailable');
        }
    }

    // Новый метод для проверки доступности API
    async checkAvailability() {
        try {
            await axios.get('https://api.deepseek.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return true;
        } catch (error) {
            console.error('DeepSeek API unavailable:', error.message);
            return false;
        }
    }
}

module.exports = DeepSeekService;
//-----------------------------------------------------------