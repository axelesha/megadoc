const registerCommand = require('../utils/registerCommand');

module.exports = (bot, pool) => {
    const handleTranslate = async (ctx) => {
        // Реализация команды для добавления/редактирования переводов
        // Например: !translate key en "English text"
        //           !translate key ru "Текст на русском"
    };

    registerCommand(bot, ['translate', 'перевод'], handleTranslate);
};