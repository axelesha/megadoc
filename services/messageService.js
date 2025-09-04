//----------------------------------------------------------
// services/messageService.js
//----------------------------------------------------------
const translationService = require('./translationService');

class MessageService {
  /**
   * ���������� ��������� � �������������� ��������� ��� ������� ������������
   */
  async sendTranslatedMessage(bot, pool, chatId, originalText, originalLanguage = 'en') {
    try {
      // �������� ���� ������������� � ����
      const [users] = await pool.execute(
        `SELECT DISTINCT u.id, ulp.preferred_language, ulp.auto_translate
         FROM users u
         JOIN messages m ON u.id = m.user_id
         LEFT JOIN user_language_preferences ulp ON u.id = ulp.user_id
         WHERE m.chat_id = ?`,
        [chatId]
      );
      
      // ��� ������� ������������ ���������� ������������ ���������
      for (const user of users) {
        let textToSend = originalText;
        
        // ���� � ������������ ������� ����-������� � ���� ����������
        if (user.auto_translate && user.preferred_language !== originalLanguage) {
          textToSend = await translationService.translateText(
            originalText, 
            user.preferred_language, 
            originalLanguage
          );
          
          // ��������� ������� � ���
          // Note: ����� ����� ����� ID ���������, ������� �� ��� �� ���������
          // ���� ������ ����� ����������
        }
        
        // ���������� ��������� ������������
        await bot.telegram.sendMessage(user.id, textToSend);
      }
    } catch (error) {
      console.error('Error sending translated message:', error);
    }
  }
  
  /**
   * �������� ������� ���������, ������������ �� ���� ������������
   */
  async getTranslatedMessageHistory(pool, userId, chatId, limit = 50) {
    try {
      // �������� ���� ������������ ������������
      const preferences = await translationService.getUserLanguagePreference(pool, userId);
      const targetLanguage = preferences.preferred_language;
      
      // �������� ��������� �� �������
      const [messages] = await pool.execute(
        `SELECT m.id, m.user_id, m.content, m.detected_language, u.first_name
         FROM messages m
         JOIN users u ON m.user_id = u.id
         WHERE m.chat_id = ?
         ORDER BY m.timestamp DESC
         LIMIT ?`,
        [chatId, limit]
      );
      
      // ��������� ������ ��������� ��� �������������
      const translatedMessages = [];
      for (const message of messages.reverse()) { // reverse to get chronological order
        let content = message.content;
        
        if (preferences.auto_translate && message.detected_language !== targetLanguage) {
          // ��������� ��� ��������
          const [cachedTranslations] = await pool.execute(
            'SELECT translated_text FROM message_translations_cache WHERE original_message_id = ? AND target_language = ?',
            [message.id, targetLanguage]
          );
          
          if (cachedTranslations.length > 0) {
            content = cachedTranslations[0].translated_text;
          } else {
            // ��������� � ��������� � ���
            content = await translationService.translateText(
              message.content,
              targetLanguage,
              message.detected_language
            );
            
            await pool.execute(
              'INSERT INTO message_translations_cache (original_message_id, target_language, translated_text) VALUES (?, ?, ?)',
              [message.id, targetLanguage, content]
            );
          }
        }
        
        translatedMessages.push({
          user: message.first_name,
          content: content,
          original_language: message.detected_language
        });
      }
      
      return translatedMessages;
    } catch (error) {
      console.error('Error getting translated message history:', error);
      return [];
    }
  }
}

module.exports = new MessageService();
//----------------------------------------------------------
