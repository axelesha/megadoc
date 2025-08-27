# MegaDoc

Telegram-бот для управления структурой знаний (ветками) с поддержкой долговременной памяти (LTM). Первый этап проекта MegaDoc.

## Стек технологий
- Backend: Node.js + Express
- База данных: MySQL
- Telegram Bot API: telegraf.js
- Лицензия: MIT

## Команды бота
- `!new_branch` — создать ветку
- `!structure` — показать структуру веток
- `!edit_branch` — редактировать ветку (в разработке)

## Установка
1. Клонируйте репозиторий:  
   `git clone https://github.com/axelesha/megadoc.git`
2. Установите зависимости:  
   `npm install`
3. Настройте базу данных (см. `schema.sql`).
4. Запустите бота:  
   `npm start`
