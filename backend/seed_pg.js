#!/usr/bin/env node
/**
 * PostgreSQL Database Migration & Seeder CLI
 * 
 * Usage:
 *   node backend/seed_pg.js [optional_database_url]
 * Or via environment variable:
 *   DATABASE_URL="postgres://..." node backend/seed_pg.js
 */

const connectionString = process.argv[2] || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('Error: Please provide a PostgreSQL connection string as an argument or in DATABASE_URL environment variable.');
  console.error('Example: node backend/seed_pg.js "postgres://user:pass@host:5432/dbname?sslmode=require"');
  process.exit(1);
}

// Set environment variable so database.js connects to PostgreSQL
process.env.DATABASE_URL = connectionString;

const { dbHelper, initSchema } = require('./database');
const { seedDataset } = require('./seed_util');

async function main() {
  console.log('====================================================');
  console.log('Rathinam Placement Portal - PostgreSQL Database Seed');
  console.log('====================================================');
  
  try {
    console.log('Step 1: Initializing PostgreSQL Schema Tables...');
    await initSchema();
    console.log('✓ Tables created successfully.');

    console.log('\nStep 2: Seeding 100 Students and 20 Companies...');
    await seedDataset(dbHelper);
    console.log('✓ Complete dataset imported into PostgreSQL successfully.');

    console.log('\nStep 3: Verifying Database Counts...');
    const students = await dbHelper.get('SELECT COUNT(*) as count FROM students');
    const companies = await dbHelper.get('SELECT COUNT(*) as count FROM companies');
    const users = await dbHelper.get('SELECT COUNT(*) as count FROM users');
    
    console.log(`- Students in DB:  ${students.count}`);
    console.log(`- Companies in DB: ${companies.count}`);
    console.log(`- Users in DB:     ${users.count}`);
    console.log('\n✅ PostgreSQL Database is ready for production deployment on Vercel!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

main();
