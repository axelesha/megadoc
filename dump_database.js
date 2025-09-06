const { exec } = require('child_process');
const fs = require('fs').promises;
require('dotenv').config();

/**
 * Database dump utility using mysqldump to export all tables and data to a single SQL file
 */
async function dumpDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `megadoc_dump_${timestamp}.sql`;
    
    // Build mysqldump command
    const command = `mysqldump --single-transaction --routines --triggers --add-drop-table --add-locks --create-options --disable-keys --extended-insert --quick --set-charset --host=${process.env.DB_HOST} --user=${process.env.DB_USER} --password=${process.env.DB_PASSWORD} ${process.env.DB_NAME} > ${filename}`;
    
    console.log('Starting database dump with mysqldump...');
    console.log(`Database: ${process.env.DB_NAME}`);
    console.log(`Output file: ${filename}`);
    
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Error during database dump:', error);
                reject(error);
                return;
            }
            
            if (stderr) {
                console.log('mysqldump info:', stderr);
            }
            
            console.log(`✅ Database dump completed successfully!`);
            console.log(`📁 File saved as: ${filename}`);
            
            resolve(filename);
        });
    });
}

// Run the dump if this script is executed directly
if (require.main === module) {
    dumpDatabase().catch(console.error);
}

module.exports = dumpDatabase;
