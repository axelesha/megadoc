const NodeCache = require('node-cache');

class TagWeightCalculator {
    constructor(pool) {
        this.pool = pool;
        this.cache = new NodeCache({ 
            stdTTL: 300, // 5 минут кэширования
            checkperiod: 60 // Проверка каждую минуту
        });
    }

    async calculateAndUpdateWeights(chatId = null, daysLimit = 90) {
        const cacheKey = `tag_weights_${chatId || 'global'}_${daysLimit}`;
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        try {
            const [idfMap, tfMap] = await Promise.all([
                this.calculateIDF(daysLimit),
                this.calculateTF(chatId, daysLimit)
            ]);

            // Пакетное обновление весов
            const updatePromises = [];
            for (const [tagId, tf] of Object.entries(tfMap)) {
                const idf = idfMap[tagId] || 1.0;
                const weight = tf * idf;
                
                updatePromises.push(
                    this.pool.execute(
                        'UPDATE tags SET weight = ?, last_calculated = NOW() WHERE id = ?',
                        [weight, tagId]
                    )
                );
            }

            await Promise.all(updatePromises);

            const result = { tfMap, idfMap };
            this.cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error calculating tag weights:', error);
            throw error;
        }
    }

    async calculateTF(chatId, daysLimit) {
        let query = `
            SELECT mt.tag_id, COUNT(DISTINCT mt.message_id) as doc_count 
            FROM message_tags mt
            JOIN messages m ON mt.message_id = m.id
            WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        `;
        const params = [daysLimit];

        if (chatId) {
            query += ' AND m.chat_id = ?';
            params.push(chatId);
        }

        query += ' GROUP BY mt.tag_id';

        const [rows] = await this.pool.execute(query, params);
        const totalDocs = rows.reduce((sum, row) => sum + row.doc_count, 0);
        
        if (totalDocs === 0) return {};

        const tfMap = {};
        rows.forEach(row => {
            // Нормализованная частота (TF)
            tfMap[row.tag_id] = row.doc_count / totalDocs;
        });

        return tfMap;
    }

    async calculateIDF(daysLimit) {
        const [[{ count: totalDocs }]] = await this.pool.execute(
            'SELECT COUNT(DISTINCT id) as count FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)',
            [daysLimit]
        );

        if (totalDocs === 0) return {};

        const [tagFrequency] = await this.pool.execute(`
            SELECT mt.tag_id, COUNT(DISTINCT mt.message_id) as doc_count 
            FROM message_tags mt
            JOIN messages m ON mt.message_id = m.id
            WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
            GROUP BY mt.tag_id
        `, [daysLimit]);

        const idfMap = {};
        tagFrequency.forEach(row => {
            // Обратная частота документа (IDF) с сглаживанием
            idfMap[row.tag_id] = Math.log(totalDocs / (row.doc_count + 1)) + 1;
        });

        return idfMap;
    }

    // Новый метод для получения весов тегов
    async getTagWeights(tagIds, chatId = null) {
        const cacheKey = `tag_weights_${chatId || 'global'}`;
        let weights = this.cache.get(cacheKey);
        
        if (!weights) {
            // Если весов нет в кэше, вычисляем их
            await this.calculateAndUpdateWeights(chatId);
            weights = this.cache.get(cacheKey) || {};
        }

        const result = {};
        tagIds.forEach(tagId => {
            result[tagId] = weights[tagId] || 1.0; // Значение по умолчанию
        });

        return result;
    }
}

module.exports = TagWeightCalculator;
