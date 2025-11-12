const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '.env.test' });

class DatabaseSetup {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'crm_test_db',
      dialect: 'postgres',
      logging: false
    };
  }

  async createTestDatabase() {
    console.log('🐘 Setting up PostgreSQL test database...');
    console.log('========================================\n');
    
    console.log('📋 Database Configuration:');
    console.log(`   Host: ${this.config.host}`);
    console.log(`   Port: ${this.config.port}`);
    console.log(`   User: ${this.config.username}`);
    console.log(`   Database: ${this.config.database}\n`);

    // Connect to default postgres database to create test database
    const systemDb = new Sequelize({
      ...this.config,
      database: 'postgres' // Connect to default database first
    });

    try {
      console.log('🔍 Testing PostgreSQL connection...');
      await systemDb.authenticate();
      console.log('✅ PostgreSQL connection successful\n');

      console.log('🗄️  Creating/recreating test database...');
      
      // Drop database if exists (ignore errors)
      try {
        await systemDb.query(`DROP DATABASE IF EXISTS "${this.config.database}"`);
        console.log(`📋 Dropped existing database '${this.config.database}'`);
      } catch (error) {
        // Ignore errors when dropping (database might not exist)
      }

      // Create new database
      await systemDb.query(`CREATE DATABASE "${this.config.database}"`);
      console.log(`✅ Created test database '${this.config.database}'\n`);

      await systemDb.close();

      // Test connection to new database
      console.log('🔌 Testing new database connection...');
      const testDb = new Sequelize(this.config);
      await testDb.authenticate();
      console.log('✅ Successfully connected to test database\n');
      await testDb.close();

      console.log('🎉 Test database setup completed!');
      console.log('You can now run tests with: npm run test:pipeline\n');
      
      return true;

    } catch (error) {
      console.error('❌ Database setup failed:', error.message);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Make sure PostgreSQL is running');
        console.error('   - Check if PostgreSQL is listening on the correct port');
        console.error('   - Verify your connection settings in .env.test');
      } else if (error.message.includes('authentication failed')) {
        console.error('\n💡 Troubleshooting:');
        console.error('   - Check your PostgreSQL username and password in .env.test');
        console.error('   - Make sure the user has permission to create databases');
      }
      
      await systemDb.close().catch(() => {});
      throw error;
    }
  }

  async runMigrations() {
    console.log('🔄 Running database migrations...');
    
    const testDb = new Sequelize(this.config);
    
    try {
      // Import and run migrations
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const migrationCommand = 'npx sequelize-cli db:migrate';
      console.log(`Running: ${migrationCommand}`);
      
      const { stdout, stderr } = await execAsync(migrationCommand, {
        env: { 
          ...process.env, 
          NODE_ENV: 'test'
        }
      });

      if (stdout) console.log(stdout);
      if (stderr) console.warn(stderr);

      console.log('✅ Migrations completed\n');

    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      throw error;
    } finally {
      await testDb.close();
    }
  }

  async runSeeders() {
    console.log('🌱 Running database seeders...');
    
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      const seedCommand = 'npx sequelize-cli db:seed:all';
      console.log(`Running: ${seedCommand}`);
      
      const { stdout, stderr } = await execAsync(seedCommand, {
        env: { 
          ...process.env, 
          NODE_ENV: 'test'
        }
      });

      if (stdout) console.log(stdout);
      if (stderr) console.warn(stderr);

      console.log('✅ Seeders completed\n');

    } catch (error) {
      console.error('❌ Seeding failed:', error.message);
      throw error;
    }
  }

  async setupComplete() {
    try {
      await this.createTestDatabase();
      await this.runMigrations();
      await this.runSeeders();
      
      console.log('🎉 Complete database setup finished!');
      console.log('Ready to run tests! 🚀\n');
      
    } catch (error) {
      console.error('💥 Database setup failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const dbSetup = new DatabaseSetup();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--complete') || args.length === 0) {
    dbSetup.setupComplete();
  } else if (args.includes('--database-only')) {
    dbSetup.createTestDatabase();
  } else if (args.includes('--migrations-only')) {
    dbSetup.runMigrations();
  } else if (args.includes('--seeds-only')) {
    dbSetup.runSeeders();
  } else {
    console.log(`
🐘 Database Setup Usage:
=======================

Commands:
  node scripts/db-setup.js                    - Complete setup (default)
  node scripts/db-setup.js --complete         - Complete setup
  node scripts/db-setup.js --database-only    - Create database only
  node scripts/db-setup.js --migrations-only  - Run migrations only
  node scripts/db-setup.js --seeds-only       - Run seeders only
`);
  }
}

module.exports = DatabaseSetup;