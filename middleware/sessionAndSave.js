//---------------------------------------------------------------
// middleware/sessionAndSave.js
//---------------------------------------------------------------
const translationService = require('../services/translationService');
const tagExtractor = require('../services/tagExtractor');

// Метаданные модуля
module.exports.moduleName = 'sessionAndSave';
module.exports.dependencies = []; // Базовый модуль без зависимостей

module.exports.factory = (bot, pool) => {
    if (global.moduleRegistry && global.moduleRegistry.isModuleLoaded('sessionAndSave')) {
        return (ctx, next) => next();
    }

    // Кэш для пользовательских предпочтений (с TTL 5 минут)
    const userPrefsCache = new Map();
    const CACHE_TTL = 5 * 60 * 1000;

    /**
     * Middleware for session management and message saving
     */
    return async (ctx, next) => {
        // Проверка наличия необходимых данных
        if (!ctx.message || !ctx.from) {
            return next();
        }

        const chatId = ctx.chat.id;
        const userId = ctx.from.id;

        // Initialize session if not exists
        if (!ctx.session) {
            ctx.session = {};
        }

        // Save chat and user to database (must precede branch creation due to FK)
        try {
            await pool.execute(
                'INSERT IGNORE INTO chats (id, type, title) VALUES (?, ?, ?)',
                [chatId, ctx.chat.type, ctx.chat.title || ctx.chat.first_name]
            );

            await pool.execute(
                'INSERT IGNORE INTO users (id, username, first_name, last_name) VALUES (?, ?, ?, ?)',
                [userId, ctx.from.username, ctx.from.first_name, ctx.from.last_name || '']
            );
        } catch (error) {
            console.error('Error saving chat/user:', error);
        }

        // Initialize current branch for this chat (default to main branch with ID 1)
        if (!ctx.session.current_branch_id) {
            try {
                const [mainBranch] = await pool.execute(
                    'SELECT id FROM branches WHERE chat_id = ? AND name = ?',
                    [chatId, 'main']
                );

                if (mainBranch.length > 0) {
                    ctx.session.current_branch_id = mainBranch[0].id;
                } else {
                    const [result] = await pool.execute(
                        'INSERT INTO branches (chat_id, name, parent_id) VALUES (?, ?, ?)',
                        [chatId, 'main', 0]
                    );
                    ctx.session.current_branch_id = result.insertId;
                }
            } catch (error) {
                console.error('Error initializing branch:', error);
                ctx.session.current_branch_id = 1; // Fallback
            }
        }

        // Initialize language for this user (with caching)
        if (!ctx.session.language) {
            const cacheKey = `${userId}_${chatId}`;
            const cached = userPrefsCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                ctx.session.language = cached.preferred_language;
                ctx.session.auto_translate = cached.auto_translate;
            } else {
                try {
                    const preferences = await translationService.getUserLanguagePreference(pool, userId, chatId);
                    ctx.session.language = preferences.preferred_language;
                    ctx.session.auto_translate = preferences.auto_translate;
                    
                    // Сохраняем в кэш
                    userPrefsCache.set(cacheKey, {
                        preferred_language: preferences.preferred_language,
                        auto_translate: preferences.auto_translate,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    console.error('Error getting user language preference:', error);
                    ctx.session.language = 'en';
                    ctx.session.auto_translate = true;
                }
            }
        }

        // Language preferences and message saving follow after branch init

        // Save message to database (if not a command)
        if (ctx.message.text && !ctx.message.text.startsWith('/')) {
            try {
                // Detect message language
                const detectedLanguage = await translationService.detectLanguage(ctx.message.text);
                
                // Сохраняем сообщение в БД
                const [result] = await pool.execute(
                    `INSERT INTO messages (message_id, chat_id, branch_id, user_id, content, detected_language) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        ctx.message.message_id,
                        chatId,
                        ctx.session.current_branch_id,
                        userId,
                        ctx.message.text,
                        detectedLanguage
                    ]
                );

                // Expose saved message DB id for downstream middlewares
                if (result && result.insertId) {
                    ctx.state = ctx.state || {};
                    ctx.state.message_db_id = result.insertId;
                }

                // Extract and save tags
                if (result && result.insertId) {
                    try {
                        const tags = await tagExtractor.extractTags(ctx.message.text);
                        if (tags.length > 0) {
                            await tagExtractor.saveTags(pool, result.insertId, tags);
                        }
                    } catch (error) {
                        console.error('Error extracting tags:', error);
                    }
                }
            } catch (error) {
                console.error('Error saving message:', error);
                
                // Если ошибка связана с отсутствием ветки, создаем ее
                if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                    try {
                        // Создаем основную ветку
                        const [branchResult] = await pool.execute(
                            'INSERT INTO branches (chat_id, name, parent_id) VALUES (?, ?, ?)',
                            [chatId, 'main', 0]
                        );
                        ctx.session.current_branch_id = branchResult.insertId;
                        
                        // Повторяем попытку сохранения сообщения
                        await pool.execute(
                            `INSERT INTO messages (message_id, chat_id, branch_id, user_id, content, detected_language) 
                             VALUES (?, ?, ?, ?, ?, ?)`,
                            [
                                ctx.message.message_id,
                                chatId,
                                ctx.session.current_branch_id,
                                userId,
                                ctx.message.text,
                                detectedLanguage || 'en'
                            ]
                        );
                        ctx.state = ctx.state || {};
                        ctx.state.message_db_id = branchResult.insertId;
                    } catch (retryError) {
                        console.error('Error retrying message save:', retryError);
                    }
                }
            }
        }

        await next();
    };
};

module.exports = module.exports.factory;
//---------------------------------------------------------------
