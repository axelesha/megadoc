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

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    first_name VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Таблица веток (обновленная структура)
CREATE TABLE IF NOT EXISTS branches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    chat_id BIGINT NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INT DEFAULT NULL,
    is_visible BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by BIGINT,
    FOREIGN KEY (parent_id) REFERENCES branches(id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

-- Таблица сообщений (обновленная структура)
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    branch_id INT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    detected_language VARCHAR(10) DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица переводов сообщений (для пользовательского контента)
CREATE TABLE IF NOT EXISTS message_translations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    language VARCHAR(10) NOT NULL,
    translated_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    UNIQUE(message_id, language)
);

-- Таблица языковых предпочтений пользователей
CREATE TABLE IF NOT EXISTS user_language_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    auto_translate BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, chat_id)
);

-- Таблица AI взаимодействий
CREATE TABLE IF NOT EXISTS ai_interactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    message_id INT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Таблица тегов
CREATE TABLE IF NOT EXISTS tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
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

-- Таблица системных переводов (для интерфейса бота)
CREATE TABLE IF NOT EXISTS system_translations (
    message_key VARCHAR(100) NOT NULL,
    language_code VARCHAR(10) NOT NULL,
    translation TEXT NOT NULL,
    PRIMARY KEY (message_key, language_code)
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
(0, 'Main', 'Основная ветка проекта'),
(0, 'MegaDoc Core', 'Основная ветка проекта'),
(0, 'Captain Pragmatic', 'Фокус на выгоде'),
(0, 'Ptolemy Paradox', 'Догма → застой');

INSERT IGNORE INTO system_translations (message_key, language_code, translation) VALUES
('greeting', 'en', 'Hello! I am your MegaDoc assistant.'),
('greeting', 'ru', 'Привет! Я ваш помощник MegaDoc.'),
('error_occurred', 'en', 'An error occurred'),
('error_occurred', 'ru', 'Произошла ошибка');
-- Добавьте остальные переводы из вашего файла

SELECT 'Database initialization completed successfully!' AS status;
