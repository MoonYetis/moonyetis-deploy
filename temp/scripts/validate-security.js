#!/usr/bin/env node

const secureCredentials = require('../services/secureCredentialsManager');
const sslManager = require('../config/ssl');

async function validateSecurity() {
    console.log('🔍 MoonYetis Security Validation');
    console.log('================================\n');

    try {
        // Check credentials
        const credentialsHealth = await secureCredentials.securityHealthCheck();
        console.log('🔐 Credentials Security:');
        console.log(`   Status: ${credentialsHealth.status}`);
        console.log(`   Master Key: ${credentialsHealth.checks.masterKeyExists ? '✅' : '❌'}`);
        console.log(`   Encrypted File: ${credentialsHealth.checks.credentialsFileExists ? '✅' : '❌'}`);
        console.log(`   Can Decrypt: ${credentialsHealth.checks.canDecrypt ? '✅' : '❌'}`);

        // Check SSL
        const sslInfo = await sslManager.getCertificateInfo();
        console.log('\n🔒 SSL/TLS Security:');
        console.log(`   Environment: ${sslInfo.environment}`);
        if (sslInfo.validation) {
            console.log(`   Certificate Valid: ${sslInfo.validation.valid ? '✅' : '❌'}`);
            if (sslInfo.validation.valid) {
                console.log(`   Days Until Expiry: ${sslInfo.validation.daysUntilExpiry}`);
                if (sslInfo.validation.warnings.length > 0) {
                    console.log('   Warnings:');
                    sslInfo.validation.warnings.forEach(warning => {
                        console.log(`     ⚠️  ${warning}`);
                    });
                }
            }
        }

        console.log('\n📊 Security Score:');
        let score = 0;
        let maxScore = 5;

        if (credentialsHealth.checks.masterKeyExists) score++;
        if (credentialsHealth.checks.credentialsFileExists) score++;
        if (credentialsHealth.checks.canDecrypt) score++;
        if (sslInfo.validation && sslInfo.validation.valid) score++;
        if (process.env.NODE_ENV === 'production') score++;

        console.log(`   Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);

        if (score === maxScore) {
            console.log('   🎉 Excellent security configuration!');
        } else if (score >= 3) {
            console.log('   ⚠️  Good security, some improvements needed');
        } else {
            console.log('   ❌ Security configuration needs attention');
        }

        console.log('\n✅ Security validation completed');

    } catch (error) {
        console.error('❌ Security validation failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    validateSecurity();
}

module.exports = { validateSecurity };