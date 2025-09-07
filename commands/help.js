const registerCommand = require('../utils/registerCommand');
const { getTranslation } = require('../utils/translations');

module.exports = registerCommand('help', async (ctx) => {
  const args = ctx.message.text.split(' ').slice(1);
  const commandName = args[0];
  const showExamples = args.includes('example');
  
  if (!commandName) {
    await showGeneralHelp(ctx);
  } else {
    await showCommandHelp(ctx, commandName, showExamples);
  }
}, {
  description: 'Show help information',
  usage: '/help [command] [example]',
  aliases: ['h', 'помощь'],
  category: 'General'
});

async function showGeneralHelp(ctx) {
  // Группируем команды по категориям
  const commandsByCategory = {};
  
  if (global.commandsRegistry) {
    global.commandsRegistry.forEach((cmd, name) => {
      const category = cmd.category || 'General';
      commandsByCategory[category] = commandsByCategory[category] || [];
      commandsByCategory[category].push(`/${name} - ${cmd.description}`);
    });
  }
  
  let response = 'Available commands:\n\n';
  
  Object.keys(commandsByCategory).sort().forEach(category => {
    response += `**${category}**:\n${commandsByCategory[category].join('\n')}\n\n`;
  });
  
  response += 'Use /help <command> for more information about a specific command.';
  
  await ctx.reply(response, { parse_mode: 'Markdown' });
}

async function showCommandHelp(ctx, commandName, showExamples) {
  // Убираем слеш, если он есть
  if (commandName.startsWith('/')) {
    commandName = commandName.substring(1);
  }
  
  // Ищем команду в реестре
  let commandInfo = null;
  
  if (global.commandsRegistry) {
    // Прямой поиск
    commandInfo = global.commandsRegistry.get(commandName);
    
    // Поиск по алиасам
    if (!commandInfo) {
      global.commandsRegistry.forEach((cmd, name) => {
        if (cmd.aliases && cmd.aliases.includes(commandName)) {
          commandInfo = cmd;
          commandInfo.name = name;
        }
      });
    }
  }
  
  if (!commandInfo) {
    await ctx.reply(`Command "${commandName}" not found.`);
    return;
  }
  
  let response = `**/${commandInfo.name}** - ${commandInfo.description}\n\n`;
  response += `Usage: ${commandInfo.usage || 'No usage information'}\n`;
  
  if (commandInfo.aliases && commandInfo.aliases.length > 0) {
    response += `Aliases: ${commandInfo.aliases.join(', ')}\n`;
  }
  
  if (showExamples) {
    // Здесь можно добавить примеры использования
    response += `\nExamples:\n`;
    response += `- /${commandInfo.name} example1\n`;
    response += `- /${commandInfo.name} example2\n`;
  }
  
  await ctx.reply(response, { parse_mode: 'Markdown' });
}