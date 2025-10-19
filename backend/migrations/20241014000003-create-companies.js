'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create company_size enum
    await queryInterface.sequelize.query(`
      CREATE TYPE company_size AS ENUM ('startup', 'small', 'medium', 'large', 'enterprise');
    `);

    // Create companies table
    await queryInterface.createTable('companies', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      domain: {
        type: Sequelize.STRING(255)
      },
      industry: {
        type: Sequelize.STRING(100)
      },
      size: {
        type: Sequelize.ENUM('startup', 'small', 'medium', 'large', 'enterprise')
      },
      description: {
        type: Sequelize.TEXT
      },
      website: {
        type: Sequelize.STRING(255)
      },
      phone: {
        type: Sequelize.STRING(50)
      },
      address: {
        type: Sequelize.JSONB
      },
      linkedin_url: {
        type: Sequelize.STRING(255)
      },
      twitter_handle: {
        type: Sequelize.STRING(100)
      },
      revenue_range: {
        type: Sequelize.STRING(50)
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      deleted_at: {
        type: Sequelize.DATE
      }
    });

    // Add indexes
    await queryInterface.addIndex('companies', ['name']);
    await queryInterface.addIndex('companies', ['domain']);
    await queryInterface.addIndex('companies', ['industry']);
    await queryInterface.addIndex('companies', ['size']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('companies');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS company_size;');
  }
};