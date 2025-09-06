// services/deepSeekService.js
const axios = require('axios');

class DeepSeekService {
    constructor() {
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.baseURL = 'https://api.deepseek.com/v1/chat/completions';
        if (!this.apiKey) {
            console.error('DEEPSEEK_API_KEY is not defined in environment variables');
        }
    }

    async generateResponse(messages, maxTokens = 1000) {
        if (!this.apiKey) {
            throw new Error('DeepSeek API key not configured');
        }

        try {
            const response = await axios.post(this.baseURL, {
                model: "deepseek-chat",
                messages: messages,
                max_tokens: maxTokens,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            return {
                content: response.data.choices[0].message.content,
                usage: response.data.usage || { total_tokens: 0 }
            };
        } catch (error) {
            console.error('DeepSeek API error:', error.response?.data || error.message);
            throw new Error(`DeepSeek API request failed: ${error.message}`);
        }
    }

    async checkLimits(chatId, userId, date, pool) {
        try {
            const dailyLimit = 100000;
            const [rows] = await pool.execute(
                'SELECT tokens_used FROM daily_token_usage WHERE chat_id = ? AND user_id = ? AND date = ?',
                [chatId, userId, date]
            );

            let used = 0;
            if (rows.length > 0) {
                used = rows[0].tokens_used;
            }

            const remaining = Math.max(0, dailyLimit - used);
            const exceeded = used >= dailyLimit;

            return { used, remaining, exceeded, limit: dailyLimit };
        } catch (error) {
            console.error('Error checking token limits:', error);
            return { used: 0, remaining: dailyLimit, exceeded: false, limit: dailyLimit };
        }
    }

    async updateTokenUsage(chatId, userId, date, tokensUsed, pool) {
        try {
            const query = `
                INSERT INTO daily_token_usage (chat_id, user_id, date, tokens_used) 
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE tokens_used = tokens_used + ?
            `;
            await pool.execute(query, [chatId, userId, date, tokensUsed, tokensUsed]);
        } catch (error) {
            console.error('Error updating token usage:', error);
        }
    }
}

module.exports = DeepSeekService;
