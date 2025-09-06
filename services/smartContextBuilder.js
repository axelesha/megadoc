const GemDetector = require('./gemDetector');
const tagExtractor = require('./tagExtractor');

class SmartContextBuilder {
    constructor(pool) {
        this.pool = pool;
        this.gemDetector = new GemDetector(pool);
    }

    async buildContextForAPI(message, branchId, chatId, userId) {
        try {
            const messageTags = await this.extractTagsFromMessage(message);
            const relevantContent = await this.findRelevantContent(messageTags, branchId, chatId, userId);
            const hiddenGems = await this.gemDetector.scanForGems(chatId, 30, 5);
            
            const balancedContext = this.balanceContext(relevantContent, hiddenGems, messageTags);
            return this.buildStructuredPrompt(message, balancedContext);
        } catch (error) {
            console.error('Error building context:', error);
            return this.buildFallbackPrompt(message);
        }
    }

    async extractTagsFromMessage(message) {
        if (!message || typeof message !== 'string') return [];
        
        try {
            // Используем существующий сервис извлечения тегов
            return await tagExtractor.extractTags(message);
        } catch (error) {
            console.error('Error extracting tags from message:', error);
            return [];
        }
    }

    async findRelevantContent(tags, branchId, chatId, userId) {
        if (!tags || tags.length === 0) {
            return { directRelevance: [], relatedConcepts: [] };
        }

        try {
            // Поиск напрямую релевантного контента
            const directRelevance = await this.findDirectlyRelevant(tags, branchId, chatId);
            
            // Поиск связанных концепций
            const relatedConcepts = await this.findRelatedConcepts(tags, branchId, chatId);
            
            return { directRelevance, relatedConcepts };
        } catch (error) {
            console.error('Error finding relevant content:', error);
            return { directRelevance: [], relatedConcepts: [] };
        }
    }

    async findDirectlyRelevant(tags, branchId, chatId) {
        const placeholders = tags.map(() => '?').join(',');
        const query = `
            SELECT DISTINCT m.id, m.content, m.detected_language,
                   GROUP_CONCAT(DISTINCT t.name) as tags,
                   COUNT(DISTINCT mt.tag_id) as relevance_score
            FROM messages m
            JOIN message_tags mt ON m.id = mt.message_id
            JOIN tags t ON mt.tag_id = t.id
            WHERE m.chat_id = ?
              AND m.branch_id = ?
              AND t.name IN (${placeholders})
            GROUP BY m.id
            ORDER BY relevance_score DESC, m.created_at DESC
            LIMIT 10
        `;

        const params = [chatId, branchId, ...tags];
        const [messages] = await this.pool.execute(query, params);
        
        return messages.map(msg => ({
            content: msg.content,
            language: msg.detected_language,
            tags: msg.tags ? msg.tags.split(',') : [],
            relevance: msg.relevance_score
        }));
    }

    async findRelatedConcepts(tags, branchId, chatId) {
        if (tags.length === 0) return [];

        const placeholders = tags.map(() => '?').join(',');
        const query = `
            SELECT DISTINCT m.id, m.content, m.detected_language,
                   GROUP_CONCAT(DISTINCT t.name) as tags,
                   COUNT(DISTINCT rt.related_tag_id) as relation_strength
            FROM messages m
            JOIN message_tags mt ON m.id = mt.message_id
            JOIN tags t ON mt.tag_id = t.id
            JOIN related_tags rt ON t.id = rt.tag_id
            WHERE m.chat_id = ?
              AND m.branch_id = ?
              AND rt.tag_id IN (
                  SELECT id FROM tags WHERE name IN (${placeholders})
              )
              AND rt.strength > 0.3
            GROUP BY m.id
            ORDER BY relation_strength DESC, m.created_at DESC
            LIMIT 5
        `;

        const params = [chatId, branchId, ...tags];
        const [messages] = await this.pool.execute(query, params);
        
        return messages.map(msg => ({
            content: msg.content,
            language: msg.detected_language,
            tags: msg.tags ? msg.tags.split(',') : [],
            relationStrength: msg.relation_strength
        }));
    }

    balanceContext(popularContent, hiddenGems, messageTags) {
        const maxGems = Math.max(2, Math.floor(popularContent.directRelevance.length * 0.3));
        const gemsToInclude = hiddenGems.slice(0, maxGems);
        
        return {
            mainContext: popularContent.directRelevance.slice(0, 8),
            hiddenGems: gemsToInclude,
            relatedConcepts: popularContent.relatedConcepts.slice(0, 3),
            balanceNote: "Контекст включает популярные обсуждения, редкие ценные идеи и связанные концепции."
        };
    }

    buildStructuredPrompt(message, context) {
        const systemMessage = {
            role: "system",
            content: `Ты — интеллектуальный ассистент, помогающий пользователю с анализом идей и их отражения в мире.

Контекст обсуждения:
${this.formatContext(context)}

Инструкции:
1. Проанализируй предоставленный контекст
2. Учитывай как популярные идеи, так и редкие, но ценные инсайты
3. Выяви связи между различными концепциями
4. Ответь на вопрос пользователя структурированно, но естественным языком`
        };

        const userMessage = {
            role: "user",
            content: message
        };

        return [systemMessage, userMessage];
    }

    formatContext(context) {
        let formatted = "";

        if (context.mainContext.length > 0) {
            formatted += "Основные обсуждения:\n";
            context.mainContext.forEach((item, index) => {
                formatted += `${index + 1}. ${item.content.substring(0, 100)}${item.content.length > 100 ? '...' : ''}\n`;
            });
            formatted += "\n";
        }

        if (context.hiddenGems.length > 0) {
            formatted += "Ценные идеи:\n";
            context.hiddenGems.forEach((gem, index) => {
                formatted += `${index + 1}. ${gem.content.substring(0, 100)}${gem.content.length > 100 ? '...' : ''}\n`;
            });
            formatted += "\n";
        }

        if (context.relatedConcepts.length > 0) {
            formatted += "Связанные концепции:\n";
            context.relatedConcepts.forEach((concept, index) => {
                formatted += `${index + 1}. ${concept.content.substring(0, 100)}${concept.content.length > 100 ? '...' : ''}\n`;
            });
        }

        return formatted || "Контекст отсутствует";
    }

    buildFallbackPrompt(message) {
        return [
            {
                role: "system",
                content: "Ты — полезный ассистент. Ответь на вопрос пользователя ясно и информативно."
            },
            {
                role: "user",
                content: message
            }
        ];
    }
}

module.exports = SmartContextBuilder;
