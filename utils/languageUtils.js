// const pool = require('../db.js'); // Или ваш путь к подключению БД

// Стало (более гибкий вариант)
async function getUserLanguage(userId, pool) {
  const [rows] = await pool.execute(
    "SELECT language_code FROM users WHERE id = ?",
    [userId]
  );
  return rows[0]?.language_code || "ru";
}

async function getTranslation(branchId, field, languageCode, pool) {
  const [rows] = await pool.execute(
    `SELECT COALESCE(
        (SELECT ${field} FROM branch_translations 
         WHERE branch_id = ? AND language_code = ?),
        (SELECT ${field} FROM branches WHERE id = ?)
      ) as value`,
    [branchId, languageCode, branchId]
  );
  return rows[0].value;
}

module.exports = {
  getTranslation, // ... эту функцию тоже нужно принять pool, если она используется
  getUserLanguage,
};
