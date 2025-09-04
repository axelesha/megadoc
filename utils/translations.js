//-------------------------------------------------------------
// utils/translations.js
//-------------------------------------------------------------
const translationsCache = new Map();
/**
 * Load all translations from database
 * @param {Pool} pool - MySQL connection pool
 */
async function loadTranslations(pool) {
  try {
    const [translations] = await pool.execute(
      'SELECT message_key, language_code, translation FROM message_translations'
    );
    
    translationsCache.clear();
    
    translations.forEach(({ message_key, language_code, translation }) => {
      if (!translationsCache.has(message_key)) {
        translationsCache.set(message_key, new Map());
      }
      translationsCache.get(message_key).set(language_code, translation);
    });
    
    console.log(`✓ Loaded ${translations.length} translations`);
  } catch (error) {
    console.error('Error loading translations:', error);
  }
}

/**
 * Get translation for a message key in specified language
 * @param {string} messageKey - Translation key
 * @param {string} languageCode - Language code (en, ru, etc.)
 * @param {Object} params - Parameters to replace in translation
 * @returns {string} Translated message or original key if not found
 */
async function getTranslation(messageKey, languageCode = 'en', params = {}) {
  let translation = messageKey;
  
  // Try to get translation for specified language
  if (translationsCache.has(messageKey)) {
    const languageTranslations = translationsCache.get(messageKey);
    
    // First try requested language
    if (languageTranslations.has(languageCode)) {
      translation = languageTranslations.get(languageCode);
    }
    // Fallback to English
    else if (languageTranslations.has('en')) {
      translation = languageTranslations.get('en');
    }
    // Fallback to any available translation
    else if (languageTranslations.size > 0) {
      translation = languageTranslations.values().next().value;
    }
  }
  
  // Replace parameters in translation
  Object.keys(params).forEach(key => {
    translation = translation.replace(new RegExp(`{${key}}`, 'g'), params[key]);
  });
  
  return translation;
}

/**
 * Get all available languages from database
 * @param {Pool} pool - MySQL connection pool
 * @returns {Array} Array of language codes
 */
async function getAvailableLanguages(pool) {
  try {
    const [languages] = await pool.execute(
      'SELECT code FROM languages ORDER BY code'
    );
    return languages.map(lang => lang.code);
  } catch (error) {
    console.error('Error getting available languages:', error);
    return ['en']; // Fallback to English
  }
}

/**
 * Add new translation to database and cache
 * @param {Pool} pool - MySQL connection pool
 * @param {string} messageKey - Translation key
 * @param {string} languageCode - Language code
 * @param {string} translation - Translated text
 */
async function addTranslation(pool, messageKey, languageCode, translation) {
  try {
    await pool.execute(
      'INSERT INTO message_translations (message_key, language_code, translation) VALUES (?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE translation = VALUES(translation)',
      [messageKey, languageCode, translation]
    );
    
    // Update cache
    if (!translationsCache.has(messageKey)) {
      translationsCache.set(messageKey, new Map());
    }
    translationsCache.get(messageKey).set(languageCode, translation);
    
    return true;
  } catch (error) {
    console.error('Error adding translation:', error);
    return false;
  }
}

module.exports = {
  loadTranslations,
  getTranslation,
  getAvailableLanguages,
  addTranslation
};
//-------------------------------------------------------------