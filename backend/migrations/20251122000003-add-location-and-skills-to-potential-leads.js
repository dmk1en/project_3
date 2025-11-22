'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('potential_leads', 'location', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Full location string for manual leads'
    });

    await queryInterface.addColumn('potential_leads', 'skills', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON array of skills for manual leads'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('potential_leads', 'location');
    await queryInterface.removeColumn('potential_leads', 'skills');
  }
};