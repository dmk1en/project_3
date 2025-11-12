'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create potential_leads table
    await queryInterface.createTable('potential_leads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      pdl_profile_id: {
        type: Sequelize.STRING(255),
        unique: true,
        allowNull: true
      },
      full_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      job_title: {
        type: Sequelize.STRING(300),
        allowNull: true
      },
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      location_country: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      location_city: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      industry: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      linkedin_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      source_query: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      lead_type: {
        type: Sequelize.ENUM('staff', 'client', 'general'),
        defaultValue: 'general'
      },
      status: {
        type: Sequelize.ENUM('pending_review', 'added_to_crm', 'rejected', 'duplicate'),
        defaultValue: 'pending_review'
      },
      lead_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      raw_data: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      retrieved_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      reviewed_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reviewed_at: {
        type: Sequelize.DATE,
        allowNull: true
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

    // Create search_queries table to track query configurations
    await queryInterface.createTable('pdl_search_queries', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      query_config: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      lead_type: {
        type: Sequelize.ENUM('staff', 'client', 'general'),
        defaultValue: 'general'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      last_run_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      run_frequency: {
        type: Sequelize.ENUM('daily', 'weekly', 'monthly', 'manual'),
        defaultValue: 'weekly'
      },
      created_by: {
        type: Sequelize.UUID,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Add indexes for better performance
    await queryInterface.addIndex('potential_leads', ['status']);
    await queryInterface.addIndex('potential_leads', ['lead_type']);
    await queryInterface.addIndex('potential_leads', ['pdl_profile_id']);
    await queryInterface.addIndex('potential_leads', ['retrieved_at']);
    await queryInterface.addIndex('potential_leads', ['full_name']);
    await queryInterface.addIndex('potential_leads', ['company_name']);
    await queryInterface.addIndex('potential_leads', ['job_title']);
    
    await queryInterface.addIndex('pdl_search_queries', ['is_active']);
    await queryInterface.addIndex('pdl_search_queries', ['last_run_at']);
    await queryInterface.addIndex('pdl_search_queries', ['run_frequency']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('potential_leads');
    await queryInterface.dropTable('pdl_search_queries');
  }
};