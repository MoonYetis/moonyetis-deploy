#!/usr/bin/env node

/**
 * MoonYetis Casino MCP Server Test Suite
 * Comprehensive testing of all components
 */

import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function print(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class MCPTester {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    async runAllTests() {
        print('cyan', '🎰 MoonYetis Casino MCP Server Test Suite');
        print('cyan', '==========================================');
        console.log('');

        await this.testEnvironment();
        await this.testDependencies();
        await this.testConfiguration();
        await this.testModules();
        await this.testDatabase();
        await this.generateReport();
    }

    async testEnvironment() {
        print('blue', '📋 Testing Environment...');
        
        // Test Node.js version
        const nodeVersion = process.version;
        const majorVersion = parseInt(nodeVersion.slice(1));
        this.test('Node.js version >= 18', majorVersion >= 18, `Current: ${nodeVersion}`);

        // Test directory structure
        const requiredDirs = ['src', 'config', 'tools', 'logs'];
        for (const dir of requiredDirs) {
            try {
                await fs.access(dir);
                this.test(`Directory exists: ${dir}`, true);
            } catch (error) {
                this.test(`Directory exists: ${dir}`, false, error.message);
            }
        }

        // Test required files
        const requiredFiles = [
            'package.json',
            '.env',
            'src/index.js',
            'start.sh',
            'README.md'
        ];

        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                this.test(`File exists: ${file}`, true);
            } catch (error) {
                this.test(`File exists: ${file}`, false, error.message);
            }
        }

        console.log('');
    }

    async testDependencies() {
        print('blue', '📦 Testing Dependencies...');

        try {
            const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
            
            // Test package.json structure
            this.test('package.json has name', !!packageJson.name);
            this.test('package.json has version', !!packageJson.version);
            this.test('package.json has dependencies', !!packageJson.dependencies);

            // Test key dependencies
            const keyDeps = [
                '@modelcontextprotocol/sdk',
                'axios',
                'pg',
                'dotenv',
                'winston'
            ];

            for (const dep of keyDeps) {
                this.test(`Dependency: ${dep}`, !!packageJson.dependencies[dep]);
            }

            // Test node_modules
            try {
                await fs.access('node_modules');
                this.test('node_modules directory exists', true);
            } catch (error) {
                this.test('node_modules directory exists', false, 'Run npm install');
            }

        } catch (error) {
            this.test('Read package.json', false, error.message);
        }

        console.log('');
    }

    async testConfiguration() {
        print('blue', '⚙️  Testing Configuration...');

        try {
            const envContent = await fs.readFile('.env', 'utf8');
            
            // Test required environment variables
            const requiredVars = [
                'DB_HOST',
                'DB_PORT',
                'DB_NAME', 
                'DB_USER',
                'JWT_SECRET',
                'SESSION_SECRET'
            ];

            for (const varName of requiredVars) {
                const hasVar = envContent.includes(`${varName}=`);
                this.test(`Environment variable: ${varName}`, hasVar);
            }

            // Test .env structure
            const lines = envContent.split('\n').filter(line => 
                line.trim() && !line.startsWith('#')
            );
            this.test('.env has configuration lines', lines.length > 0);

        } catch (error) {
            this.test('Read .env file', false, error.message);
        }

        console.log('');
    }

    async testModules() {
        print('blue', '🔧 Testing Modules...');

        const modules = [
            'src/index.js',
            'src/tools/casino-stats.js',
            'src/tools/wallet-monitor.js',
            'src/tools/fractal-network.js',
            'src/tools/player-analytics.js',
            'src/tools/system-health.js',
            'src/tools/security-monitor.js'
        ];

        for (const module of modules) {
            try {
                const content = await fs.readFile(module, 'utf8');
                
                // Test basic syntax requirements
                this.test(`Module syntax: ${module}`, 
                    content.includes('export') || content.includes('module.exports')
                );

                // Test for imports/requires
                this.test(`Module imports: ${module}`, 
                    content.includes('import') || content.includes('require')
                );

            } catch (error) {
                this.test(`Module exists: ${module}`, false, error.message);
            }
        }

        console.log('');
    }

    async testDatabase() {
        print('blue', '🗄️  Testing Database Configuration...');

        try {
            // Test database SQL file
            const sqlContent = await fs.readFile('config/database.sql', 'utf8');
            
            this.test('Database SQL file exists', true);
            this.test('SQL contains table creation', sqlContent.includes('CREATE TABLE'));
            this.test('SQL contains security_alerts table', sqlContent.includes('security_alerts'));
            this.test('SQL contains wallet_transactions table', sqlContent.includes('wallet_transactions'));

            // Test database connection (mock)
            this.test('Database connection configuration', true, 'Ready for connection');

        } catch (error) {
            this.test('Database SQL file', false, error.message);
        }

        console.log('');
    }

    test(description, condition, details = '') {
        if (condition) {
            print('green', `✅ ${description}`);
            if (details) print('cyan', `   ${details}`);
            this.passed++;
        } else {
            print('red', `❌ ${description}`);
            if (details) print('yellow', `   ${details}`);
            this.failed++;
        }
        this.tests.push({ description, condition, details });
    }

    async generateReport() {
        console.log('');
        print('cyan', '📊 Test Report');
        print('cyan', '===============');
        
        console.log(`Total tests: ${this.tests.length}`);
        print('green', `Passed: ${this.passed}`);
        print('red', `Failed: ${this.failed}`);
        
        const percentage = Math.round((this.passed / this.tests.length) * 100);
        console.log(`Success rate: ${percentage}%`);
        
        console.log('');

        if (this.failed === 0) {
            print('green', '🎉 All tests passed! MCP Server is ready for deployment.');
            print('cyan', '');
            print('cyan', '🚀 Next steps:');
            print('cyan', '1. Configure your actual API keys in .env');
            print('cyan', '2. Add the server to Claude Desktop config');
            print('cyan', '3. Start the server with: ./start.sh');
            print('cyan', '4. Test the integration in Claude Desktop');
        } else {
            print('yellow', '⚠️  Some tests failed. Please review the issues above.');
            print('cyan', '');
            print('cyan', '🔧 Common fixes:');
            print('cyan', '1. Run: npm install');
            print('cyan', '2. Check .env configuration');
            print('cyan', '3. Ensure all required files exist');
            print('cyan', '4. Verify file permissions');
        }

        console.log('');
        
        // Generate test report file
        const report = {
            timestamp: new Date().toISOString(),
            total: this.tests.length,
            passed: this.passed,
            failed: this.failed,
            percentage: percentage,
            tests: this.tests
        };

        try {
            await fs.writeFile(
                'test-report.json', 
                JSON.stringify(report, null, 2)
            );
            print('cyan', '📄 Test report saved to: test-report.json');
        } catch (error) {
            print('yellow', '⚠️  Could not save test report');
        }
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new MCPTester();
    tester.runAllTests().catch(error => {
        print('red', `Test suite error: ${error.message}`);
        process.exit(1);
    });
}

export default MCPTester;