-- Инициализация базы данных MegaDoc
CREATE DATABASE IF NOT EXISTS megadoc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE megadoc;

-- Таблица чатов
CREATE TABLE IF NOT EXISTS chats (
    id BIGINT PRIMARY KEY,
    type ENUM('private', 'group', 'supergroup', 'channel') NOT NULL,
    title VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пользователей (добавлено поле last_name)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица веток (исправлена структура)
CREATE TABLE IF NOT EXISTS branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Таблица сообщений (добавлены недостающие поля)
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    branch_id INT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    detected_language VARCHAR(10) DEFAULT 'en',
    is_edited BOOLEAN DEFAULT FALSE,
    edit_count INT DEFAULT 0,
    novelty_score FLOAT DEFAULT 0.5,
    potential_score FLOAT DEFAULT 0.5,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_chat_branch (chat_id, branch_id)
);

-- Таблица переводов сообщений
CREATE TABLE IF NOT EXISTS message_translations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    language VARCHAR(10) NOT NULL,
    translated_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    UNIQUE KEY (message_id, language)
);

-- Таблица языковых предпочтений пользователей (исправлена структура)
CREATE TABLE IF NOT EXISTS user_language_preferences (
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    auto_translate BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, chat_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица AI взаимодействий (добавлено поле tokens_used)
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Таблица тегов (добавлены поля для весов)
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    weight FLOAT DEFAULT 1.0,
    usage_count INT DEFAULT 0,
    last_used TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица связи сообщений и тегов
CREATE TABLE IF NOT EXISTS message_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    tag_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(message_id, tag_id)
);

-- Таблица связанных тегов
CREATE TABLE IF NOT EXISTS related_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tag_id INT NOT NULL,
    related_tag_id INT NOT NULL,
    strength FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    FOREIGN KEY (related_tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(tag_id, related_tag_id)
);

-- Таблица переводов (переименована из system_translations)
CREATE TABLE IF NOT EXISTS translations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    language_code VARCHAR(10) NOT NULL DEFAULT 'en',
    translation_key VARCHAR(255) NOT NULL,
    translation_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_translation (language_code, translation_key)
);

-- Таблица ежедневного использования токенов
CREATE TABLE IF NOT EXISTS daily_token_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    tokens_used INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_daily_usage (chat_id, user_id, date)
);

-- Таблица поддерживаемых языков
CREATE TABLE IF NOT EXISTS languages (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    native_name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Индексы для улучшения производительности
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_branch_id ON messages(branch_id);
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_branches_chat_id ON branches(chat_id);
CREATE INDEX idx_message_tags_message_id ON message_tags(message_id);
CREATE INDEX idx_message_tags_tag_id ON message_tags(tag_id);
CREATE INDEX idx_translations_language ON translations(language_code);
CREATE INDEX idx_translations_key ON translations(translation_key);

-- Вставка начальных данных
INSERT IGNORE INTO chats (id, type, title) VALUES 
(0, 'private', 'Default Chat');

INSERT IGNORE INTO languages (code, name, native_name) VALUES 
('en', 'English', 'English'),
('ru', 'Russian', 'Русский'),
('zh', 'Chinese', '中文'),
('es', 'Spanish', 'Español'),
('fr', 'French', 'Français'),
('de', 'German', 'Deutsch'),
('ja', 'Japanese', '日本語'),
('ko', 'Korean', '한국어');

INSERT IGNORE INTO branches (chat_id, name, description) VALUES
(0, 'main', 'Основная ветка проекта'),
(0, 'core', 'Основная ветка проекта MegaDoc'),
(0, 'pragmatic', 'Фокус на выгоде'),
(0, 'paradox', 'Догма → застой');

-- Вставка базовых переводов

INSERT INTO translations (language_code, translation_key, translation_text) VALUES
('en', 'branch_structure', '🌳 Branch structure:'),
('ru', 'branch_structure', '🌳 Структура веток:'),
('en', 'switch_branch_usage', 'Usage: /switch <branch_name>'),
('ru', 'switch_branch_usage', 'Использование: /switch <имя_ветки>'),
('en', 'branch_not_found', 'Branch not found'),
('ru', 'branch_not_found', 'Ветка не найдена'),
('en', 'branch_switched', 'Active branch changed to: {branch}'),
('ru', 'branch_switched', 'Активная ветка изменена на: {branch}'),
('en', 'create_branch_usage', 'Usage: /create_branch <branch_name>'),
('ru', 'create_branch_usage', 'Использование: /create_branch <имя_ветки>'),
('en', 'invalid_branch_name', 'Invalid branch name. Use only letters, numbers, underscores and hyphens (3-50 characters)'),
('ru', 'invalid_branch_name', 'Недопустимое имя ветки. Используйте только буквы, цифры, подчеркивания и дефисы (3-50 символов)'),
('en', 'branch_already_exists', 'Branch {branch} already exists'),
('ru', 'branch_already_exists', 'Ветка {branch} уже существует'),
('en', 'branch_created', 'Branch {branch} created successfully'),
('ru', 'branch_created', 'Ветка {branch} успешно создана'),
('en', 'error_occurred', 'An error occurred'),
('ru', 'error_occurred', 'Произошла ошибка');


SELECT 'Database initialization completed successfully!' AS status;

-- Добавляем поле access_type, если оно еще не существует
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS access_type ENUM('public', 'protected', 'private') DEFAULT 'public';

-- Обновляем существующие записи, если нужно
UPDATE branches SET access_type = 'public' WHERE access_type IS NULL;
