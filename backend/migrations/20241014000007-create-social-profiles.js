'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('social_profiles', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      platform: {
        type: Sequelize.ENUM('linkedin', 'twitter', 'facebook', 'instagram', 'github'),
        allowNull: false
      },
      profile_url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      username: {
        type: Sequelize.STRING(100)
      },
      follower_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      connection_status: {
        type: Sequelize.ENUM('none', 'pending', 'connected', 'following'),
        defaultValue: 'none'
      },
      last_activity_date: {
        type: Sequelize.DATE
      },
      profile_data: {
        type: Sequelize.JSONB
      },
      is_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
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
    await queryInterface.addIndex('social_profiles', ['contact_id']);
    await queryInterface.addIndex('social_profiles', ['platform']);
    await queryInterface.addIndex('social_profiles', ['connection_status']);
    await queryInterface.addIndex('social_profiles', ['profile_url'], { unique: true });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('social_profiles');
  }
};