'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new fields to support manual leads
    await queryInterface.addColumn('potential_leads', 'is_manual', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('potential_leads', 'source', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('potential_leads', 'notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn('potential_leads', 'created_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    await queryInterface.addColumn('potential_leads', 'updated_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Add index for manual leads
    await queryInterface.addIndex('potential_leads', ['is_manual']);
    await queryInterface.addIndex('potential_leads', ['source']);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('potential_leads', ['is_manual']);
    await queryInterface.removeIndex('potential_leads', ['source']);

    // Remove columns
    await queryInterface.removeColumn('potential_leads', 'is_manual');
    await queryInterface.removeColumn('potential_leads', 'source');
    await queryInterface.removeColumn('potential_leads', 'notes');
    await queryInterface.removeColumn('potential_leads', 'created_by');
    await queryInterface.removeColumn('potential_leads', 'updated_by');
  }
};