// services/tagExtractor.js
class TagExtractor {
    constructor() {
        this.commonWords = new Set([
            'the', 'and', 'for', 'with', 'this', 'that', 'are', 'you', 'not', 'but',
            'was', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'what', 'which',
            'how', 'when', 'where', 'why', 'who', 'whom', 'its', 'our', 'their', 'your',
            'это', 'что', 'как', 'для', 'при', 'над', 'под', 'из', 'от', 'до', 'не', 'на', 'за', 'к', 'по', 'со', 'во'
        ]);
    }

    async extractTags(text, minWordLength = 3, maxTags = 5) {
        if (!text || typeof text !== 'string') return [];

        try {
            // Извлекаем хэштеги
            const hashtagRegex = /#(\w+)/gi;
            const hashtags = [];
            let match;
            
            while ((match = hashtagRegex.exec(text)) !== null) {
                if (match[1].length >= minWordLength) {
                    hashtags.push(match[1].toLowerCase());
                }
            }

            // Извлекаем ключевые слова
            const keywordRegex = /\b([A-Z][a-z]+|[a-z]+(_[a-z]+)+)\b/g;
            const keywords = [];
            
            while ((match = keywordRegex.exec(text)) !== null) {
                const word = match[1].toLowerCase();
                if (word.length >= minWordLength && !this.commonWords.has(word)) {
                    keywords.push(word);
                }
            }

            // Извлекаем существительные/длинные слова
            const words = text.split(/\s+/)
                .map(word => word.replace(/[^\wа-яА-Я]/g, '').toLowerCase())
                .filter(word => 
                    word.length >= minWordLength && 
                    !this.commonWords.has(word) &&
                    !hashtags.includes(word) &&
                    !keywords.includes(word)
                );

            // Объединяем и убираем дубликаты
            const allTags = [...new Set([...hashtags, ...keywords, ...words])];
            
            return allTags.slice(0, maxTags);
        } catch (error) {
            console.error('Error extracting tags:', error);
            return [];
        }
    }

    async saveTags(pool, messageId, tags) {
        if (!tags || tags.length === 0) return;

        try {
            const savedTagIds = [];
            
            for (const tagName of tags) {
                // Проверяем существование тега
                let [tagRows] = await pool.execute(
                    'SELECT id FROM tags WHERE name = ?',
                    [tagName]
                );

                let tagId;
                if (tagRows.length === 0) {
                    // Создаем новый тег
                    const [insertResult] = await pool.execute(
                        'INSERT INTO tags (name) VALUES (?)',
                        [tagName]
                    );
                    tagId = insertResult.insertId;
                } else {
                    tagId = tagRows[0].id;
                }

                // Связываем тег с сообщением
                await pool.execute(
                    'INSERT IGNORE INTO message_tags (message_id, tag_id) VALUES (?, ?)',
                    [messageId, tagId]
                );

                savedTagIds.push(tagId);
            }

            // Обновляем связи между тегами
            for (const tagId of savedTagIds) {
                await this.updateTagRelationships(pool, tagId, savedTagIds);
            }
        } catch (error) {
            console.error('Error saving tags:', error);
        }
    }

    async updateTagRelationships(pool, currentTagId, allTagIds) {
        try {
            for (const relatedTagId of allTagIds) {
                if (currentTagId !== relatedTagId) {
                    // Увеличиваем силу связи между тегами
                    await pool.execute(
                        `INSERT INTO related_tags (tag_id, related_tag_id, strength) 
                         VALUES (?, ?, 1.0)
                         ON DUPLICATE KEY UPDATE strength = strength + 0.1`,
                        [currentTagId, relatedTagId]
                    );
                }
            }
        } catch (error) {
            console.error('Error updating tag relationships:', error);
        }
    }
}

module.exports = new TagExtractor();
