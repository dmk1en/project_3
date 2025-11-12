const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

class TestDatabaseManager {
  constructor() {
    this.sequelize = null;
  }

  async setupTestDatabase() {
    const testDbUrl = process.env.TEST_DATABASE_URL || 
      `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

    this.sequelize = new Sequelize(testDbUrl, {
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });

    try {
      await this.sequelize.authenticate();
      console.log('✅ Test database connection established');
      
      // Clean and setup database
      await this.cleanDatabase();
      await this.runMigrations();
      await this.seedTestData();
      
      return this.sequelize;
    } catch (error) {
      console.error('❌ Test database setup failed:', error);
      throw error;
    }
  }

  async cleanDatabase() {
    try {
      // Drop all tables (cascade to handle foreign keys)
      await this.sequelize.query(`
        DROP SCHEMA IF EXISTS public CASCADE;
        CREATE SCHEMA public;
        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `);
      console.log('🧹 Test database cleaned');
    } catch (error) {
      console.error('Failed to clean database:', error);
    }
  }

  async runMigrations() {
    try {
      // Read and execute migration files in order
      const migrationsPath = path.join(__dirname, '../../migrations');
      const migrationFiles = fs.readdirSync(migrationsPath)
        .filter(file => file.endsWith('.js'))
        .sort();

      console.log('📦 Running migrations...');
      
      for (const file of migrationFiles) {
        console.log(`   - ${file}`);
        try {
          const migration = require(path.join(migrationsPath, file));
          if (migration.up) {
            await migration.up(this.sequelize.getQueryInterface(), Sequelize);
          }
        } catch (error) {
          console.error(`❌ Migration ${file} failed:`, error.message);
          // Continue with other migrations
        }
      }
      
      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('Migration process failed:', error);
    }
  }

  async seedTestData() {
    try {
      // Run essential seeders for testing
      const seedersPath = path.join(__dirname, '../../seeders');
      const seederFiles = [
        '20241014000001-default-pipeline-stages.js'
      ];

      console.log('🌱 Seeding test data...');
      
      for (const file of seederFiles) {
        const seederPath = path.join(seedersPath, file);
        if (fs.existsSync(seederPath)) {
          console.log(`   - ${file}`);
          try {
            const seeder = require(seederPath);
            if (seeder.up) {
              await seeder.up(this.sequelize.getQueryInterface(), Sequelize);
            }
          } catch (error) {
            console.error(`❌ Seeder ${file} failed:`, error.message);
          }
        }
      }
      
      console.log('✅ Test data seeded');
    } catch (error) {
      console.error('Seeding process failed:', error);
    }
  }

  async teardownTestDatabase() {
    if (this.sequelize) {
      try {
        await this.cleanDatabase();
        await this.sequelize.close();
        console.log('🔌 Test database connection closed');
      } catch (error) {
        console.error('Failed to teardown test database:', error);
      }
    }
  }

  getSequelize() {
    return this.sequelize;
  }
}

// Global test database manager instance
global.testDbManager = new TestDatabaseManager();

module.exports = TestDatabaseManager;