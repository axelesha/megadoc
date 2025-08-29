# bot.py
import logging
from telegram import Update, ReactionTypeEmoji 
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters, MessageReactionHandler 
import json
import os
import requests
import traceback
from dotenv import load_dotenv

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

DS_TOKEN = os.getenv("DS_TOKEN")
BOT_TOKEN = os.getenv("BOT_TOKEN")

api_url = "https://api.deepseek.com/v1/chat/completions"
headers = {
    "Authorization": f"Bearer {DS_TOKEN}",
    "Content-Type": "application/json"
}

async def ask_deepseek(update: Update, context=None):
    question = update.message.text
    
    payload = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", 
            "content": f"You are a helpful assistant specialized in MegaDoc project management.  You don't respond to any request, unless request either calling your name or giving the ! or ? mark in the start of messsage.  You are currently in the {context.chat_data['current_branch']} branch."},
            {"role": "user", "content": question}
        ],
        "max_tokens": 2000
    }
    
    # if context:
    #     payload["messages"].insert(1, {"role": "assistant", "content": json.dumps([context.chat_data, context.user_data])})

    logger.info(f"payload= {payload}")
    
    response = requests.post(api_url, json=payload, headers=headers)
    response.raise_for_status()

    logger.info(f"response= {response}")
    jsonResult = response.json()

    logger.info(f"response text is {jsonResult}")
    result = jsonResult["choices"][0]["message"]["content"]

    logger.info(f"reasult: {result}")

    # await update.message.reply_text(result)
    # Разделяем длинное сообщение на части
    max_length = 4096
    if len(result) > max_length:
        for i in range(0, len(result), max_length):
            await update.message.reply_text(result[i:i + max_length])
    else:
        await update.message.reply_text(result)


async def handle_reaction(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle emoji reactions and send to your API"""
    
    # Get the reaction data
    reaction = update.message_reaction


    if reaction is None:
        # Handle the case where reaction is None
        return

    user = reaction.user
    chat = reaction.chat
    
    print(f"Reaction detected from user {user.id} in chat {chat.id} {reaction}")

    # Get the emoji (if it's an emoji reaction)
    # new_reactions = reaction.new_reactions
    # old_reactions = reaction.old_reactions
    
    # Process new reactions
    react = reaction.new_reaction

    logger.info(f"Reaction {react}")

    if 1: # isinstance(react, ReactionTypeEmoji):
        logger.info("got reaction")

        # emoji = react.type.emoji
        
        # Prepare data for your API
        reaction_data = {
            "user_id": user.id,
            "chat_id": chat.id,
            "emoji": react[0].emoji,
            "message_id": reaction.message_id,
            "timestamp": reaction.date.isoformat(),
            "action": "added"
        }
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": "You are helpful assistant, and you received a reaction. No need to respond to it, just know that someone reacted to the messsage."},
                {"role": "user", "content": json.dumps(reaction_data)}
            ],
            "max_tokens": 2000
        }

        # Send to your API
        try:
            logger.info(f"payload= {payload}")

            response = requests.post(api_url, json=payload, headers=headers)
            response.raise_for_status()

            logger.info(f"response= {response}")
            jsonResult = response.json()

            logger.info(f"response text is {jsonResult}")
            result = jsonResult["choices"][0]["message"]["content"]

            # You can also send a message to a specific chat (e.g., your admin chat)
    # to get notified about errors.
    if update and update.effective_chat:
        tb_list = traceback.format_exception(None, context.error, context.error.__traceback__)
        tb_string = ''.join(tb_list)
        message = (
            f"An error occurred: {context.error}\n\n"
            f"Traceback:\n{tb_string}"
        )
    await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text=message[:4096] # Telegram message limit
    )

# Функция-фильтр. Реагирует ТОЛЬКО на команды и обращения
def message_filter(update: Update):
    user_text = update.message.text.lower()

    # Реагируем, если сообщение:
    is_command = user_text.startswith(('/','!','#')) # 1. Начинается с префикса команды
    is_mention = 'дик' in user_text or 'bot' in user_text # 2. Содержит обращение к боту
    is_reply_to_bot = update.message.reply_to_message and update.message.reply_to_message.from_user.is_bot # 3. Является ответом на сообщение бота

    return is_command or is_mention or is_reply_to_bot

def main():
    # Укажите токен бота
    application = Application.builder().token(f"{BOT_TOKEN}").build()
    application.add_error_handler(error_handler)

    # Обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("structure", structure))
    application.add_handler(CommandHandler("new_branch", new_branch))


# Обработчик для команд с !
    application.add_handler(MessageHandler(filters.TEXT & filters.UpdateType.MESSAGE,  handle_exclamation_commands))
    application.add_handler(MessageReactionHandler(handle_reaction))

    # Запуск бота
    application.run_polling(
        allowed_updates=Update.ALL_TYPES,
        drop_pending_updates=True
    )

if name == "__main__":
    main()