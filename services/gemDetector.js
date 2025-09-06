class GemDetector {
    constructor(pool) {
        this.pool = pool;
    }

    async scanForGems(chatId = null, lookbackDays = 30, limit = 20) {
        try {
            const [novelIdeas, engagingIdeas, highlyRatedIdeas] = await Promise.all([
                this.findNovelIdeas(chatId, lookbackDays, limit),
                this.findEngagingIdeas(chatId, lookbackDays, limit),
                this.findHighlyRatedIdeas(chatId, lookbackDays, limit)
            ]);

            const allGems = [...novelIdeas, ...engagingIdeas, ...highlyRatedIdeas];
            const uniqueGems = this.removeDuplicates(allGems, 'id');
            
            await this.updateScores(uniqueGems);
            return this.rankGems(uniqueGems).slice(0, limit);
        } catch (error) {
            console.error('Error scanning for gems:', error);
            return [];
        }
    }

    async findNovelIdeas(chatId, lookbackDays, limit) {
        const query = `
            SELECT m.id, m.content, m.created_at,
                COUNT(DISTINCT mt.tag_id) as unique_tag_count,
                COUNT(mt.tag_id) as total_tags
            FROM messages m
            JOIN message_tags mt ON m.id = mt.message_id
            WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ${chatId ? 'AND m.chat_id = ?' : ''}
            GROUP BY m.id
            HAVING unique_tag_count >= 2 AND total_tags >= 2
            ORDER BY (unique_tag_count / total_tags) DESC, m.created_at DESC
            LIMIT ?
        `;

        const params = [lookbackDays];
        if (chatId) params.push(chatId);
        params.push(limit);

        const [ideas] = await this.pool.execute(query, params);
        return ideas.map(idea => ({ 
            ...idea, 
            gem_type: 'novelty',
            score: idea.unique_tag_count / idea.total_tags
        }));
    }

    async findEngagingIdeas(chatId, lookbackDays, limit) {
        const query = `
            SELECT m.id, m.content, m.created_at,
                COUNT(DISTINCT r.user_id) as unique_reactors,
                COUNT(r.id) as total_reactions
            FROM messages m
            LEFT JOIN message_reactions r ON m.id = r.message_id
            WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ${chatId ? 'AND m.chat_id = ?' : ''}
            GROUP BY m.id
            HAVING unique_reactors >= 2
            ORDER BY total_reactions DESC, unique_reactors DESC
            LIMIT ?
        `;

        const params = [lookbackDays];
        if (chatId) params.push(chatId);
        params.push(limit);

        const [ideas] = await this.pool.execute(query, params);
        return ideas.map(idea => ({ 
            ...idea, 
            gem_type: 'engagement',
            score: idea.total_reactions * 0.7 + idea.unique_reactors * 0.3
        }));
    }

    async findHighlyRatedIdeas(chatId, lookbackDays, limit) {
        // Проверяем существование таблицы message_valuations
        const [tableExists] = await this.pool.execute(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() AND table_name = 'message_valuations'
        `);

        if (tableExists[0].count === 0) {
            return []; // Таблица не существует
        }

        const query = `
            SELECT m.id, m.content, m.created_at,
                COALESCE(AVG(v.score), 0) as avg_rating,
                COUNT(v.id) as rating_count
            FROM messages m
            LEFT JOIN message_valuations v ON m.id = v.message_id
            WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                ${chatId ? 'AND m.chat_id = ?' : ''}
            GROUP BY m.id
            HAVING avg_rating >= 0.5 AND rating_count >= 1
            ORDER BY avg_rating DESC, rating_count DESC
            LIMIT ?
        `;

        const params = [lookbackDays];
        if (chatId) params.push(chatId);
        params.push(limit);

        const [ideas] = await this.pool.execute(query, params);
        return ideas.map(idea => ({ 
            ...idea, 
            gem_type: 'high_rating',
            score: idea.avg_rating * 0.6 + Math.min(idea.rating_count / 10, 1) * 0.4
        }));
    }

    removeDuplicates(array, key) {
        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            return seen.has(value) ? false : seen.add(value);
        });
    }

    rankGems(gems) {
        return gems.sort((a, b) => {
            // Приоритет: новизна > вовлеченность > оценки
            const typeWeights = { novelty: 3, engagement: 2, high_rating: 1 };
            const aWeight = typeWeights[a.gem_type] || 1;
            const bWeight = typeWeights[b.gem_type] || 1;
            
            return (b.score * bWeight) - (a.score * aWeight);
        });
    }

    async updateScores(gems) {
        if (gems.length === 0) return;

        const updatePromises = gems.map(gem => 
            this.pool.execute(
                `UPDATE messages 
                 SET novelty_score = GREATEST(COALESCE(novelty_score, 0), ?),
                     potential_score = GREATEST(COALESCE(potential_score, 0), ?)
                 WHERE id = ?`,
                [
                    gem.gem_type === 'novelty' ? 0.7 : 0.3,
                    gem.gem_type === 'high_rating' ? 0.8 : 0.5,
                    gem.id
                ]
            )
        );

        await Promise.all(updatePromises);
    }
}

module.exports = GemDetector;
