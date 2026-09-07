const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Check for PostgreSQL connection string (Vercel Postgres, Neon, Supabase, etc.)
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const isPostgres = Boolean(connectionString);

let dbHelper = null;
let lastInsertedId = null;

if (isPostgres) {
  const { Pool } = require('pg');
  console.log('Connecting to PostgreSQL database...');
  
  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString.includes('sslmode=require') 
      ? { rejectUnauthorized: false } 
      : false
  });

  // Convert ? placeholders to $1, $2, ... for PostgreSQL
  function formatPgSql(sql) {
    let index = 1;
    let formatted = sql.replace(/\?/g, () => `$${index++}`);
    return formatted;
  }

  dbHelper = {
    isPostgres: true,
    pool,
    
    exec: async (sql) => {
      const client = await pool.connect();
      try {
        await client.query(sql);
      } finally {
        client.release();
      }
    },

    run: async (sql, params = []) => {
      const isInsert = /^\s*INSERT\s+INTO/i.test(sql);
      let querySql = formatPgSql(sql);
      
      // If INSERT and doesn't already have RETURNING, append RETURNING id
      if (isInsert && !/RETURNING/i.test(querySql)) {
        querySql += ' RETURNING id';
      }

      const res = await pool.query(querySql, params);
      const insertedId = res.rows && res.rows[0] ? res.rows[0].id : null;
      if (insertedId !== null) {
        lastInsertedId = insertedId;
      }
      return {
        lastInsertRowid: insertedId,
        rowCount: res.rowCount,
        changes: res.rowCount
      };
    },

    get: async (sql, params = []) => {
      // Handle SQLite last_insert_rowid() compatibility
      if (/SELECT\s+last_insert_rowid\(\)/i.test(sql)) {
        return { id: lastInsertedId };
      }
      const res = await pool.query(formatPgSql(sql), params);
      return res.rows[0];
    },

    all: async (sql, params = []) => {
      const res = await pool.query(formatPgSql(sql), params);
      return res.rows;
    }
  };

} else {
  // Local SQLite fallback using Node's DatabaseSync
  const { DatabaseSync } = require('node:sqlite');
  
  // On Vercel without PostgreSQL, use /tmp for ephemeral sqlite storage
  const defaultPath = path.join(__dirname, 'database.sqlite');
  const dbPath = process.env.VERCEL ? path.join('/tmp', 'database.sqlite') : defaultPath;
  
  // If in /tmp on Vercel and file exists locally, copy initial db
  if (process.env.VERCEL && !fs.existsSync(dbPath) && fs.existsSync(defaultPath)) {
    try {
      fs.copyFileSync(defaultPath, dbPath);
    } catch (e) {}
  }

  const db = new DatabaseSync(dbPath);
  console.log(`SQLite database active at: ${dbPath}`);

  dbHelper = {
    isPostgres: false,
    db,

    exec: async (sql) => {
      db.exec(sql);
    },

    run: async (sql, params = []) => {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      if (result && result.lastInsertRowid !== undefined) {
        lastInsertedId = result.lastInsertRowid;
      }
      return {
        lastInsertRowid: result ? result.lastInsertRowid : null,
        changes: result ? result.changes : 0
      };
    },

    get: async (sql, params = []) => {
      const stmt = db.prepare(sql);
      return stmt.get(...params);
    },

    all: async (sql, params = []) => {
      const stmt = db.prepare(sql);
      return stmt.all(...params);
    }
  };
}

// Universal Schema Initializer
async function initSchema() {
  if (isPostgres) {
    await dbHelper.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS placement_members (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        role VARCHAR(50) DEFAULT 'Member',
        completed_drives INTEGER DEFAULT 0,
        active_drives INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        contact_name VARCHAR(255),
        contact_mobile VARCHAR(50),
        contact_email VARCHAR(255),
        size INTEGER,
        status VARCHAR(50) DEFAULT 'COLD',
        address TEXT,
        jd_text TEXT,
        jd_file_path VARCHAR(255),
        ctc REAL DEFAULT 0.0,
        drive_date VARCHAR(50),
        offers_count INTEGER DEFAULT 0,
        assigned_member_id INTEGER REFERENCES placement_members(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        roll_number VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(100) NOT NULL,
        gender VARCHAR(20) NOT NULL,
        hostel_day_scholar VARCHAR(50) NOT NULL,
        sslc_percent REAL NOT NULL,
        hsc_percent REAL NOT NULL,
        ug_percent REAL NOT NULL,
        pg_percent REAL,
        github_id VARCHAR(255),
        linkedin_id VARCHAR(255),
        resume_link TEXT,
        self_introduction_link TEXT,
        photo_link TEXT,
        year_of_graduation INTEGER NOT NULL,
        portfolio_link TEXT,
        email_id VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(50) NOT NULL,
        placement_status VARCHAR(50) DEFAULT 'Yet To Be Placed',
        company_id INTEGER REFERENCES companies(id),
        ctc REAL DEFAULT 0.0,
        current_phase VARCHAR(50) DEFAULT 'Registration',
        ats_score REAL DEFAULT 0.0,
        skills TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recruiters (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        company_id INTEGER REFERENCES companies(id),
        assigned_member_id INTEGER REFERENCES placement_members(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ats_results (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        company_id INTEGER REFERENCES companies(id),
        score REAL,
        matching_skills TEXT,
        missing_skills TEXT,
        matched_keywords TEXT,
        missing_keywords TEXT,
        eligibility VARCHAR(50),
        recommendation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        user_name VARCHAR(255),
        user_role VARCHAR(50),
        action VARCHAR(255) NOT NULL,
        record_type VARCHAR(50),
        record_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } else {
    await dbHelper.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS placement_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        role TEXT DEFAULT 'Member',
        completed_drives INTEGER DEFAULT 0,
        active_drives INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        website TEXT,
        contact_name TEXT,
        contact_mobile TEXT,
        contact_email TEXT,
        size INTEGER,
        status TEXT DEFAULT 'COLD',
        address TEXT,
        jd_text TEXT,
        jd_file_path TEXT,
        ctc REAL DEFAULT 0.0,
        drive_date TEXT,
        offers_count INTEGER DEFAULT 0,
        assigned_member_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_member_id) REFERENCES placement_members(id)
      );

      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        roll_number TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT NOT NULL,
        gender TEXT NOT NULL,
        hostel_day_scholar TEXT NOT NULL,
        sslc_percent REAL NOT NULL,
        hsc_percent REAL NOT NULL,
        ug_percent REAL NOT NULL,
        pg_percent REAL,
        github_id TEXT,
        linkedin_id TEXT,
        resume_link TEXT,
        self_introduction_link TEXT,
        photo_link TEXT,
        year_of_graduation INTEGER NOT NULL,
        portfolio_link TEXT,
        email_id TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        placement_status TEXT DEFAULT 'Yet To Be Placed',
        company_id INTEGER,
        ctc REAL DEFAULT 0.0,
        current_phase TEXT DEFAULT 'Registration',
        ats_score REAL DEFAULT 0.0,
        skills TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      );

      CREATE TABLE IF NOT EXISTS recruiters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        company_id INTEGER,
        assigned_member_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (company_id) REFERENCES companies(id),
        FOREIGN KEY (assigned_member_id) REFERENCES placement_members(id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ats_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER,
        company_id INTEGER,
        score REAL,
        matching_skills TEXT,
        missing_skills TEXT,
        matched_keywords TEXT,
        missing_keywords TEXT,
        eligibility TEXT,
        recommendation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id),
        FOREIGN KEY (company_id) REFERENCES companies(id)
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_name TEXT,
        user_role TEXT,
        action TEXT NOT NULL,
        record_type TEXT,
        record_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  // Check if database needs seeding
  try {
    const userCount = await dbHelper.get('SELECT COUNT(*) as count FROM users');
    if (!userCount || parseInt(userCount.count) === 0) {
      console.log('Database empty. Automatically seeding 100 students and 20 companies...');
      const { seedDataset } = require('./seed_util');
      await seedDataset(dbHelper);
    } else {
      console.log('Database already populated.');
    }
  } catch (err) {
    console.warn('Initial seed check warning:', err.message);
  }
}

module.exports = {
  dbHelper,
  initSchema,
  isPostgres
};
