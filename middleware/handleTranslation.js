//---------------------------------------------------------
// middleware/handleTranslation.js

const translationService = require('../services/translationService');

module.exports = (bot, pool) => async (ctx, next) => {
    if (!ctx.message || !ctx.message.text || ctx.message.text.startsWith('/')) {
        return next();
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const originalText = ctx.message.text;

    try {
        // ���������� ���� ��������� ���������
        const detectedLanguage = await translationService.detectLanguage(originalText);
        
        // ��������� ���� ��������� � ��
        await pool.execute(
            'UPDATE messages SET detected_language = ? WHERE message_id = ? AND chat_id = ?',
            [detectedLanguage, ctx.message.message_id, chatId]
        );

        // �������� ���� ������������� � ���� � �� �����������
        const [users] = await pool.execute(
            `SELECT u.id, 
             COALESCE(ulp.preferred_language, 'en') as preferred_language,
             COALESCE(ulp.auto_translate, true) as auto_translate
             FROM users u
             LEFT JOIN user_language_preferences ulp ON u.id = ulp.user_id AND ulp.chat_id = ?
             WHERE EXISTS (
             SELECT 1 FROM messages WHERE chat_id = ? AND user_id = u.id
            )`,
            [chatId, chatId]
        );
        
        // ��� ������� ������������ ������� ������������ ������
        for (const user of users) {
            let translatedText = originalText;
            
            // ���� � ������������ ������� ����-������� � ���� ����������
            if (user.auto_translate && user.preferred_language !== detectedLanguage) {
                translatedText = await translationService.translateText(
                    originalText, 
                    user.preferred_language, 
                    detectedLanguage
                );
                
                // ��������� ������� � ��
                await pool.execute(
                    `INSERT INTO message_translations (message_id, language, translated_text) 
                     VALUES (?, ?, ?) 
                     ON DUPLICATE KEY UPDATE translated_text = ?`,
                    [ctx.message.message_id, user.preferred_language, translatedText, translatedText]
                );
            }
        }
        
    } catch (error) {
        console.error('Error in translation middleware:', error);
    }

    return next();
};
//---------------------------------------------------------
