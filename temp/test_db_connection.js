#!/usr/bin/env node

// Simple database connection test script
// Run this on the VPS to test the connection after setup

require('dotenv').config();
const { Pool } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'moonyetis_slots',
  user: process.env.DB_USER || 'moonyetis_user',
  password: process.env.DB_PASSWORD || 'MoonYetis2024!'
};

console.log('Testing database connection...');
console.log('Configuration:', {
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.user,
  password: '[HIDDEN]'
});

const pool = new Pool(dbConfig);

async function testConnection() {
  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, current_database(), current_user');
    console.log('✅ Query test successful!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('Current database:', result.rows[0].current_database);
    console.log('Current user:', result.rows[0].current_user);
    
    // Test tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('✅ Available tables:', tables.rows.map(r => r.table_name));
    
    client.release();
    
    // Test database class
    console.log('\nTesting database class...');
    const database = require('./config/database');
    const health = await database.healthCheck();
    console.log('✅ Database health check:', health);
    
    await pool.end();
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

testConnection();