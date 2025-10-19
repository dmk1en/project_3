'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('contacts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      company_id: {
        type: Sequelize.UUID,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      first_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      last_name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255)
      },
      phone: {
        type: Sequelize.STRING(50)
      },
      job_title: {
        type: Sequelize.STRING(150)
      },
      linkedin_url: {
        type: Sequelize.STRING(500)
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'prospect', 'customer'),
        defaultValue: 'active'
      },
      source: {
        type: Sequelize.STRING(100)
      },
      notes: {
        type: Sequelize.TEXT
      },
      last_contact_date: {
        type: Sequelize.DATE
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
    await queryInterface.addIndex('contacts', ['company_id']);
    await queryInterface.addIndex('contacts', ['email']);
    await queryInterface.addIndex('contacts', ['status']);
    await queryInterface.addIndex('contacts', ['last_contact_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('contacts');
  }
};