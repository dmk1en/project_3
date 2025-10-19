'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activities', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
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
        onDelete: 'CASCADE'
      },
      company_id: {
        type: Sequelize.UUID,
        references: {
          model: 'companies',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      opportunity_id: {
        type: Sequelize.UUID,
        references: {
          model: 'opportunities',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('call', 'email', 'meeting', 'note', 'task', 'social_interaction'),
        allowNull: false
      },
      subject: {
        type: Sequelize.STRING(200)
      },
      description: {
        type: Sequelize.TEXT
      },
      activity_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      duration_minutes: {
        type: Sequelize.INTEGER
      },
      outcome: {
        type: Sequelize.STRING(200)
      },
      is_completed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      follow_up_date: {
        type: Sequelize.DATE
      },
      metadata: {
        type: Sequelize.JSONB
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
    await queryInterface.addIndex('activities', ['user_id']);
    await queryInterface.addIndex('activities', ['contact_id']);
    await queryInterface.addIndex('activities', ['company_id']);
    await queryInterface.addIndex('activities', ['opportunity_id']);
    await queryInterface.addIndex('activities', ['type']);
    await queryInterface.addIndex('activities', ['activity_date']);
    await queryInterface.addIndex('activities', ['is_completed']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activities');
  }
};