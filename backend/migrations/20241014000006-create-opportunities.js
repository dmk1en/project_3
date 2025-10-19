'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('opportunities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      company_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      contact_id: {
        type: Sequelize.UUID,
        references: {
          model: 'contacts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      pipeline_stage_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'pipeline_stages',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assigned_user_id: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT
      },
      value: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'USD'
      },
      expected_close_date: {
        type: Sequelize.DATE
      },
      actual_close_date: {
        type: Sequelize.DATE
      },
      probability: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      source: {
        type: Sequelize.STRING(100)
      },
      status: {
        type: Sequelize.ENUM('open', 'won', 'lost', 'on_hold'),
        defaultValue: 'open'
      },
      lost_reason: {
        type: Sequelize.STRING(500)
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
    await queryInterface.addIndex('opportunities', ['company_id']);
    await queryInterface.addIndex('opportunities', ['contact_id']);
    await queryInterface.addIndex('opportunities', ['pipeline_stage_id']);
    await queryInterface.addIndex('opportunities', ['assigned_user_id']);
    await queryInterface.addIndex('opportunities', ['status']);
    await queryInterface.addIndex('opportunities', ['expected_close_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('opportunities');
  }
};