//-------------------------------------------------------------------------------
// commands/index.js
// ����� utils/loadCommands.js ��� ������
// �� �������� ���� ������ � �� �����������
//-------------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');

module.exports = (bot, pool) => {
    // ��������� ��� ����� ������ �� ������� ����������
    const files = fs.readdirSync(__dirname);
    
    files.forEach(file => {
        if (file !== 'index.js' && file.endsWith('.js')) {
            const command = require(path.join(__dirname, file));
            if (typeof command === 'function') {
                command(bot, pool);
            }
        }
    });
    
    // ���������� ��������� ������� �� �������������
    const directories = files.filter(file => 
        fs.statSync(path.join(__dirname, file)).isDirectory()
    );
    
    directories.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        const dirFiles = fs.readdirSync(dirPath);
        
        dirFiles.forEach(file => {
            if (file.endsWith('.js')) {
                const command = require(path.join(dirPath, file));
                if (typeof command === 'function') {
                    command(bot, pool);
                }
            }
        });
    });
};
//-------------------------------------------------------------------------------
