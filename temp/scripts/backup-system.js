const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BackupSystem {
    constructor() {
        this.backupDir = path.join(__dirname, '../backups');
        this.maxBackups = 30; // Keep 30 days of backups
    }

    async initialize() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            console.log('🔄 Backup system initialized');
        } catch (error) {
            console.error('❌ Failed to initialize backup system:', error);
            throw error;
        }
    }

    async createDatabaseBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.backupDir, `db-backup-${timestamp}.sql`);
        
        try {
            // Load database credentials
            const SecureCredentialsManager = require('../services/secureCredentialsManager');
            const credentialsManager = new SecureCredentialsManager();
            const credentials = await credentialsManager.getCredentials();
            
            const dbConfig = credentials.database;
            const dumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d ${dbConfig.database} > "${backupFile}"`;
            
            await execAsync(dumpCommand);
            
            // Compress backup
            await execAsync(`gzip "${backupFile}"`);
            
            console.log(`✅ Database backup created: ${backupFile}.gz`);
            return `${backupFile}.gz`;
        } catch (error) {
            console.error('❌ Database backup failed:', error);
            throw error;
        }
    }

    async createSecurityFilesBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.backupDir, `security-backup-${timestamp}.tar.gz`);
        
        try {
            const secureDir = path.join(__dirname, '../.secure');
            const sslDir = path.join(__dirname, '../.ssl');
            
            const tarCommand = `tar -czf "${backupFile}" -C "${path.dirname(secureDir)}" .secure .ssl`;
            await execAsync(tarCommand);
            
            console.log(`✅ Security files backup created: ${backupFile}`);
            return backupFile;
        } catch (error) {
            console.error('❌ Security files backup failed:', error);
            throw error;
        }
    }

    async createConfigBackup() {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(this.backupDir, `config-backup-${timestamp}.tar.gz`);
        
        try {
            const configDir = path.join(__dirname, '../config');
            const packageFile = path.join(__dirname, '../package.json');
            const envFile = path.join(__dirname, '../.env');
            
            let tarCommand = `tar -czf "${backupFile}" -C "${path.dirname(configDir)}" config package.json`;
            
            // Add .env if it exists
            try {
                await fs.access(envFile);
                tarCommand += ' .env';
            } catch (e) {
                // .env doesn't exist, skip it
            }
            
            await execAsync(tarCommand);
            
            console.log(`✅ Configuration backup created: ${backupFile}`);
            return backupFile;
        } catch (error) {
            console.error('❌ Configuration backup failed:', error);
            throw error;
        }
    }

    async cleanOldBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(file => file.includes('backup-'))
                .map(file => ({
                    name: file,
                    path: path.join(this.backupDir, file),
                    mtime: fs.stat(path.join(this.backupDir, file)).then(stats => stats.mtime)
                }));

            // Sort by modification time (newest first)
            const sortedFiles = await Promise.all(
                backupFiles.map(async file => ({
                    ...file,
                    mtime: await file.mtime
                }))
            );
            
            sortedFiles.sort((a, b) => b.mtime - a.mtime);

            // Remove old backups
            if (sortedFiles.length > this.maxBackups) {
                const filesToDelete = sortedFiles.slice(this.maxBackups);
                
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    console.log(`🗑️ Removed old backup: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('❌ Failed to clean old backups:', error);
        }
    }

    async createFullBackup() {
        console.log('🔄 Starting full backup...');
        
        try {
            await this.initialize();
            
            const results = await Promise.allSettled([
                this.createDatabaseBackup(),
                this.createSecurityFilesBackup(),
                this.createConfigBackup()
            ]);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            console.log(`📊 Backup complete: ${successful} successful, ${failed} failed`);
            
            if (failed > 0) {
                console.error('❌ Some backups failed:');
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        console.error(`  - Backup ${index + 1}: ${result.reason.message}`);
                    }
                });
            }
            
            await this.cleanOldBackups();
            
            return {
                successful,
                failed,
                backupDir: this.backupDir
            };
        } catch (error) {
            console.error('❌ Full backup failed:', error);
            throw error;
        }
    }

    async scheduleBackups() {
        const cron = require('node-cron');
        
        // Daily backup at 2 AM
        cron.schedule('0 2 * * *', async () => {
            console.log('🕐 Running scheduled backup...');
            try {
                await this.createFullBackup();
                console.log('✅ Scheduled backup completed');
            } catch (error) {
                console.error('❌ Scheduled backup failed:', error);
            }
        });
        
        console.log('⏰ Backup scheduler started (daily at 2 AM)');
    }
}

// CLI usage
if (require.main === module) {
    const backupSystem = new BackupSystem();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'full':
            backupSystem.createFullBackup()
                .then(result => {
                    console.log('✅ Backup completed:', result);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Backup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'db':
            backupSystem.createDatabaseBackup()
                .then(file => {
                    console.log('✅ Database backup:', file);
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Database backup failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'schedule':
            backupSystem.scheduleBackups();
            console.log('🔄 Backup scheduler running... Press Ctrl+C to stop');
            break;
            
        default:
            console.log('Usage: node backup-system.js [full|db|schedule]');
            process.exit(1);
    }
}

module.exports = BackupSystem;