'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add missing columns to contacts table
    await queryInterface.addColumn('contacts', 'department', {
      type: Sequelize.STRING(100)
    });

    await queryInterface.addColumn('contacts', 'seniority_level', {
      type: Sequelize.ENUM('entry', 'mid', 'senior', 'director', 'vp', 'c_level')
    });

    await queryInterface.addColumn('contacts', 'twitter_handle', {
      type: Sequelize.STRING(100)
    });

    await queryInterface.addColumn('contacts', 'lead_score', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    });

    await queryInterface.addColumn('contacts', 'lead_status', {
      type: Sequelize.ENUM('new', 'contacted', 'qualified', 'unqualified', 'nurturing', 'converted', 'lost'),
      defaultValue: 'new'
    });

    await queryInterface.addColumn('contacts', 'assigned_to', {
      type: Sequelize.UUID,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('contacts', 'custom_fields', {
      type: Sequelize.JSONB
    });

    // Update source field to be ENUM instead of STRING
    await queryInterface.changeColumn('contacts', 'source', {
      type: Sequelize.ENUM('manual', 'linkedin', 'twitter', 'referral', 'website', 'email_campaign', 'cold_outreach', 'event'),
      allowNull: false
    });

    // Add new indexes
    await queryInterface.addIndex('contacts', ['lead_status']);
    await queryInterface.addIndex('contacts', ['assigned_to']);
    await queryInterface.addIndex('contacts', ['source']);
    await queryInterface.addIndex('contacts', ['seniority_level']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove added columns
    await queryInterface.removeColumn('contacts', 'department');
    await queryInterface.removeColumn('contacts', 'seniority_level');
    await queryInterface.removeColumn('contacts', 'twitter_handle');
    await queryInterface.removeColumn('contacts', 'lead_score');
    await queryInterface.removeColumn('contacts', 'lead_status');
    await queryInterface.removeColumn('contacts', 'assigned_to');
    await queryInterface.removeColumn('contacts', 'custom_fields');

    // Revert source field to STRING
    await queryInterface.changeColumn('contacts', 'source', {
      type: Sequelize.STRING(100)
    });

    // Remove indexes
    await queryInterface.removeIndex('contacts', ['lead_status']);
    await queryInterface.removeIndex('contacts', ['assigned_to']);
    await queryInterface.removeIndex('contacts', ['source']);
    await queryInterface.removeIndex('contacts', ['seniority_level']);
  }
};