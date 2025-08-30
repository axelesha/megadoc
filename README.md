# MegaDoc

Telegram-бот для управления структурой знаний (ветками) с поддержкой долговременной памяти (LTM). Первый этап проекта MegaDoc.

## Стек технологий
- Backend: Node.js + Express
- База данных: MySQL
- Telegram Bot API: telegraf.js
- Лицензия: MIT

## 📚 Документация

- [Руководство по разработке команд](docs/command-development-guide.md) - правила написания новых команд для бота
- [Структура базы данных](docs/DATABASE.md) - описание схемы БД

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
