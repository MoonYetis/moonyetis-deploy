const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class DisasterRecovery {
    constructor() {
        this.projectRoot = path.join(__dirname, '..');
        this.backupDir = path.join(this.projectRoot, 'backups');
        this.recoveryLogFile = path.join(this.projectRoot, 'logs/disaster-recovery.log');
        
        this.config = {
            maxRecoveryTime: 300, // 5 minutes target
            criticalServices: [
                'postgresql',
                'redis',
                'moonyetis-backend'
            ]
        };
    }

    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        
        console.log(message);
        
        try {
            await fs.mkdir(path.dirname(this.recoveryLogFile), { recursive: true });
            await fs.appendFile(this.recoveryLogFile, logMessage);
        } catch (error) {
            console.error('Failed to write to recovery log:', error);
        }
    }

    // Main disaster recovery procedure
    async executeDisasterRecovery(scenario = 'full') {
        const startTime = Date.now();
        
        await this.log('🚨 DISASTER RECOVERY INITIATED');
        await this.log(`Scenario: ${scenario}`);
        await this.log('================================');
        
        try {
            const recoveryPlan = await this.assessDamage();
            await this.log(`Assessment complete. Recovery plan: ${recoveryPlan.type}`);
            
            switch (scenario) {
                case 'database':
                    await this.recoverDatabase();
                    break;
                case 'security':
                    await this.recoverSecurityFiles();
                    break;
                case 'config':
                    await this.recoverConfiguration();
                    break;
                case 'full':
                    await this.fullSystemRecovery();
                    break;
                default:
                    throw new Error(`Unknown recovery scenario: ${scenario}`);
            }
            
            await this.verifyRecovery();
            
            const totalTime = Math.round((Date.now() - startTime) / 1000);
            await this.log(`✅ DISASTER RECOVERY COMPLETED in ${totalTime} seconds`);
            
            if (totalTime > this.config.maxRecoveryTime) {
                await this.log(`⚠️ WARNING: Recovery took longer than target (${this.config.maxRecoveryTime}s)`);
            }
            
            return {
                success: true,
                duration: totalTime,
                scenario
            };
            
        } catch (error) {
            const totalTime = Math.round((Date.now() - startTime) / 1000);
            await this.log(`❌ DISASTER RECOVERY FAILED after ${totalTime} seconds`);
            await this.log(`Error: ${error.message}`);
            
            throw error;
        }
    }

    // Assess what needs to be recovered
    async assessDamage() {
        await this.log('🔍 Assessing system damage...');
        
        const damage = {
            database: false,
            security: false,
            config: false,
            application: false
        };
        
        // Check database
        try {
            await execAsync('pg_isready -h localhost -p 5432');
            await this.log('  ✅ Database is accessible');
        } catch (error) {
            damage.database = true;
            await this.log('  ❌ Database is not accessible');
        }
        
        // Check security files
        try {
            await fs.access(path.join(this.projectRoot, '.secure/master.key'));
            await fs.access(path.join(this.projectRoot, '.secure/credentials.enc'));
            await this.log('  ✅ Security files are accessible');
        } catch (error) {
            damage.security = true;
            await this.log('  ❌ Security files are missing or corrupted');
        }
        
        // Check SSL certificates
        try {
            await fs.access(path.join(this.projectRoot, '.ssl/dev-cert.pem'));
            await fs.access(path.join(this.projectRoot, '.ssl/dev-key.pem'));
            await this.log('  ✅ SSL certificates are accessible');
        } catch (error) {
            damage.security = true;
            await this.log('  ❌ SSL certificates are missing');
        }
        
        // Check application files
        try {
            await fs.access(path.join(this.projectRoot, 'server.js'));
            await fs.access(path.join(this.projectRoot, 'package.json'));
            await this.log('  ✅ Application files are accessible');
        } catch (error) {
            damage.application = true;
            await this.log('  ❌ Application files are missing');
        }
        
        // Determine recovery plan
        if (damage.database && damage.security && damage.application) {
            return { type: 'full', damage };
        } else if (damage.database) {
            return { type: 'database', damage };
        } else if (damage.security) {
            return { type: 'security', damage };
        } else {
            return { type: 'config', damage };
        }
    }

    // Full system recovery
    async fullSystemRecovery() {
        await this.log('🔄 Starting full system recovery...');
        
        await this.stopServices();
        await this.recoverSecurityFiles();
        await this.recoverDatabase();
        await this.recoverConfiguration();
        await this.startServices();
    }

    // Recover database from backup
    async recoverDatabase() {
        await this.log('🗃️ Recovering database...');
        
        // Find latest database backup
        const latestBackup = await this.findLatestBackup('db-backup-');
        
        if (!latestBackup) {
            throw new Error('No database backup found');
        }
        
        await this.log(`  Using backup: ${latestBackup}`);
        
        // Stop database if running
        try {
            await execAsync('docker stop moonyetis-postgres-primary');
        } catch (error) {
            // Database might not be running
        }
        
        // Start fresh database container
        await this.log('  Starting fresh database container...');
        await execAsync('docker-compose -f docker-compose.replication.yml up -d postgres-primary');
        
        // Wait for database to be ready
        await this.waitForService('postgresql', 'pg_isready -h localhost -p 5432');
        
        // Restore from backup
        await this.log('  Restoring from backup...');
        
        const backupPath = path.join(this.backupDir, latestBackup);
        
        // Decompress if needed
        if (latestBackup.endsWith('.gz')) {
            await execAsync(`gunzip -c "${backupPath}" > "${backupPath.replace('.gz', '')}"`);
        }
        
        const sqlFile = backupPath.replace('.gz', '');
        
        // Get database credentials
        const SecureCredentialsManager = require('../services/secureCredentialsManager');
        const credentialsManager = new SecureCredentialsManager();
        const credentials = await credentialsManager.getCredentials();
        
        // Restore database
        const restoreCmd = `PGPASSWORD="${credentials.database.password}" psql -h localhost -p 5432 -U ${credentials.database.user} -d ${credentials.database.database} < "${sqlFile}"`;
        await execAsync(restoreCmd);
        
        await this.log('  ✅ Database restored successfully');
        
        // Clean up temporary SQL file
        if (latestBackup.endsWith('.gz')) {
            await fs.unlink(sqlFile);
        }
    }

    // Recover security files
    async recoverSecurityFiles() {
        await this.log('🔐 Recovering security files...');
        
        const latestSecurityBackup = await this.findLatestBackup('security-backup-');
        
        if (!latestSecurityBackup) {
            throw new Error('No security backup found');
        }
        
        await this.log(`  Using backup: ${latestSecurityBackup}`);
        
        const backupPath = path.join(this.backupDir, latestSecurityBackup);
        
        // Extract security backup
        await execAsync(`tar -xzf "${backupPath}" -C "${this.projectRoot}"`);
        
        // Set correct permissions
        await execAsync(`chmod 700 "${path.join(this.projectRoot, '.secure')}"`);
        await execAsync(`chmod 700 "${path.join(this.projectRoot, '.ssl')}"`);
        await execAsync(`chmod 600 "${path.join(this.projectRoot, '.secure')}/*"`);
        await execAsync(`chmod 600 "${path.join(this.projectRoot, '.ssl')}/*"`);
        
        await this.log('  ✅ Security files restored successfully');
    }

    // Recover configuration
    async recoverConfiguration() {
        await this.log('⚙️ Recovering configuration...');
        
        const latestConfigBackup = await this.findLatestBackup('config-backup-');
        
        if (!latestConfigBackup) {
            await this.log('  ⚠️ No config backup found, using defaults');
            return;
        }
        
        await this.log(`  Using backup: ${latestConfigBackup}`);
        
        const backupPath = path.join(this.backupDir, latestConfigBackup);
        
        // Extract config backup
        await execAsync(`tar -xzf "${backupPath}" -C "${this.projectRoot}"`);
        
        await this.log('  ✅ Configuration restored successfully');
    }

    // Find latest backup file
    async findLatestBackup(prefix) {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupFiles = files
                .filter(file => file.startsWith(prefix))
                .sort((a, b) => {
                    // Extract timestamp from filename and sort by newest first
                    const timestampA = a.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
                    const timestampB = b.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/);
                    
                    if (timestampA && timestampB) {
                        return timestampB[1].localeCompare(timestampA[1]);
                    }
                    
                    return b.localeCompare(a);
                });
            
            return backupFiles[0] || null;
        } catch (error) {
            return null;
        }
    }

    // Stop critical services
    async stopServices() {
        await this.log('🛑 Stopping services...');
        
        const services = [
            'docker-compose -f docker-compose.replication.yml down',
            'pkill -f "node.*server.js"'
        ];
        
        for (const service of services) {
            try {
                await execAsync(service);
                await this.log(`  ✅ Stopped: ${service}`);
            } catch (error) {
                await this.log(`  ⚠️ Could not stop: ${service}`);
            }
        }
    }

    // Start critical services
    async startServices() {
        await this.log('🚀 Starting services...');
        
        // Start database services
        await execAsync('docker-compose -f docker-compose.replication.yml up -d');
        await this.waitForService('postgresql', 'pg_isready -h localhost -p 5432');
        
        // Start Redis
        await this.waitForService('redis', 'redis-cli ping');
        
        await this.log('  ✅ All services started');
    }

    // Wait for service to be ready
    async waitForService(serviceName, healthCheck, maxWaitTime = 60000) {
        await this.log(`  Waiting for ${serviceName} to be ready...`);
        
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                await execAsync(healthCheck);
                await this.log(`  ✅ ${serviceName} is ready`);
                return;
            } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        throw new Error(`${serviceName} did not become ready within ${maxWaitTime}ms`);
    }

    // Verify recovery was successful
    async verifyRecovery() {
        await this.log('🔍 Verifying recovery...');
        
        const checks = [
            this.verifyDatabase(),
            this.verifySecurityFiles(),
            this.verifyApplication()
        ];
        
        const results = await Promise.allSettled(checks);
        
        const failures = results.filter(result => result.status === 'rejected');
        
        if (failures.length > 0) {
            throw new Error(`Recovery verification failed: ${failures.length} checks failed`);
        }
        
        await this.log('  ✅ All recovery checks passed');
    }

    // Verify database is working
    async verifyDatabase() {
        await execAsync('pg_isready -h localhost -p 5432');
        
        // Test database connection with credentials
        const SecureCredentialsManager = require('../services/secureCredentialsManager');
        const credentialsManager = new SecureCredentialsManager();
        const credentials = await credentialsManager.getCredentials();
        
        const testQuery = `PGPASSWORD="${credentials.database.password}" psql -h localhost -p 5432 -U ${credentials.database.user} -d ${credentials.database.database} -c "SELECT 1"`;
        await execAsync(testQuery);
        
        await this.log('  ✅ Database verification passed');
    }

    // Verify security files are accessible
    async verifySecurityFiles() {
        await fs.access(path.join(this.projectRoot, '.secure/master.key'));
        await fs.access(path.join(this.projectRoot, '.secure/credentials.enc'));
        await fs.access(path.join(this.projectRoot, '.ssl/dev-cert.pem'));
        await fs.access(path.join(this.projectRoot, '.ssl/dev-key.pem'));
        
        // Test that credentials can be decrypted
        const SecureCredentialsManager = require('../services/secureCredentialsManager');
        const credentialsManager = new SecureCredentialsManager();
        await credentialsManager.getCredentials();
        
        await this.log('  ✅ Security files verification passed');
    }

    // Verify application can start
    async verifyApplication() {
        await fs.access(path.join(this.projectRoot, 'server.js'));
        await fs.access(path.join(this.projectRoot, 'package.json'));
        
        // Try to require the main modules (syntax check)
        try {
            require(path.join(this.projectRoot, 'services/secureCredentialsManager'));
            require(path.join(this.projectRoot, 'config/database'));
        } catch (error) {
            throw new Error(`Application verification failed: ${error.message}`);
        }
        
        await this.log('  ✅ Application verification passed');
    }

    // Test backup integrity
    async testBackupIntegrity() {
        await this.log('🧪 Testing backup integrity...');
        
        const backupTypes = ['db-backup-', 'security-backup-', 'config-backup-'];
        
        for (const type of backupTypes) {
            const latestBackup = await this.findLatestBackup(type);
            
            if (!latestBackup) {
                await this.log(`  ⚠️ No backup found for type: ${type}`);
                continue;
            }
            
            const backupPath = path.join(this.backupDir, latestBackup);
            
            try {
                if (latestBackup.endsWith('.gz')) {
                    // Test gzip integrity
                    await execAsync(`gzip -t "${backupPath}"`);
                } else if (latestBackup.endsWith('.tar.gz')) {
                    // Test tar.gz integrity
                    await execAsync(`tar -tzf "${backupPath}" > /dev/null`);
                }
                
                await this.log(`  ✅ Backup integrity verified: ${latestBackup}`);
            } catch (error) {
                await this.log(`  ❌ Backup integrity failed: ${latestBackup}`);
                throw new Error(`Backup corruption detected: ${latestBackup}`);
            }
        }
    }

    // Generate disaster recovery report
    async generateRecoveryReport() {
        const reportPath = path.join(this.projectRoot, 'disaster-recovery-report.md');
        
        const report = `# Disaster Recovery Report

**Generated:** ${new Date().toISOString()}

## Recovery Procedures Available

### 1. Database Recovery
- \`node scripts/disaster-recovery.js database\`
- Restores from latest database backup
- Estimated time: 2-5 minutes

### 2. Security Files Recovery  
- \`node scripts/disaster-recovery.js security\`
- Restores .secure and .ssl directories
- Estimated time: 1-2 minutes

### 3. Configuration Recovery
- \`node scripts/disaster-recovery.js config\`
- Restores config files and environment
- Estimated time: 1 minute

### 4. Full System Recovery
- \`node scripts/disaster-recovery.js full\`
- Complete system restoration
- Estimated time: 5-10 minutes

## Backup Status

${await this.getBackupStatus()}

## Manual Recovery Steps

### Emergency Database Recovery
1. Stop all services: \`docker-compose down\`
2. Start fresh database: \`docker-compose up -d postgres-primary\`
3. Find latest backup: \`ls -la backups/db-backup-*\`
4. Restore: \`gunzip -c backup.sql.gz | psql -U user -d database\`

### Emergency Security Recovery
1. Extract security backup: \`tar -xzf backups/security-backup-latest.tar.gz\`
2. Set permissions: \`chmod 700 .secure .ssl\`
3. Verify: \`node scripts/validate-security.js\`

## Contact Information
- Emergency: Check logs/disaster-recovery.log
- Backup Location: ${this.backupDir}
- Recovery Script: scripts/disaster-recovery.js
`;

        await fs.writeFile(reportPath, report);
        await this.log(`📋 Recovery report generated: ${reportPath}`);
    }

    async getBackupStatus() {
        try {
            const files = await fs.readdir(this.backupDir);
            const backupTypes = ['db-backup-', 'security-backup-', 'config-backup-'];
            
            let status = '';
            
            for (const type of backupTypes) {
                const backups = files.filter(f => f.startsWith(type));
                const latest = backups.sort().reverse()[0];
                
                if (latest) {
                    const stats = await fs.stat(path.join(this.backupDir, latest));
                    const age = Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60));
                    status += `- ${type}: ${latest} (${age}h ago)\n`;
                } else {
                    status += `- ${type}: ❌ No backups found\n`;
                }
            }
            
            return status;
        } catch (error) {
            return 'Could not read backup status';
        }
    }
}

// CLI usage
if (require.main === module) {
    const dr = new DisasterRecovery();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'test':
            dr.testBackupIntegrity()
                .then(() => {
                    console.log('✅ Backup integrity test completed');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Backup integrity test failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'report':
            dr.generateRecoveryReport()
                .then(() => {
                    console.log('✅ Recovery report generated');
                    process.exit(0);
                })
                .catch(error => {
                    console.error('❌ Report generation failed:', error);
                    process.exit(1);
                });
            break;
            
        case 'database':
        case 'security':
        case 'config':
        case 'full':
            dr.executeDisasterRecovery(command)
                .then(result => {
                    console.log(`✅ Disaster recovery completed: ${JSON.stringify(result)}`);
                    process.exit(0);
                })
                .catch(error => {
                    console.error(`❌ Disaster recovery failed: ${error.message}`);
                    process.exit(1);
                });
            break;
            
        default:
            console.log('Usage: node disaster-recovery.js [database|security|config|full|test|report]');
            console.log('');
            console.log('Commands:');
            console.log('  database  - Recover database from backup');
            console.log('  security  - Recover security files from backup');
            console.log('  config    - Recover configuration from backup');
            console.log('  full      - Full system recovery');
            console.log('  test      - Test backup integrity');
            console.log('  report    - Generate recovery report');
            process.exit(1);
    }
}

module.exports = DisasterRecovery;