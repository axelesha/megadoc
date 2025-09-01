module.exports = (bot, keywords, handler) => {
    keywords.forEach(keyword => {
      // Создаем регулярное выражение для каждой команды
      const regex = new RegExp(`^!${keyword}(\\s|$)`, 'i');
      bot.hears(regex, handler);
    });
  };