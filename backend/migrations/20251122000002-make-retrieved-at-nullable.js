'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Make retrieved_at nullable since manual leads don't have a "retrieved" time
    await queryInterface.changeColumn('potential_leads', 'retrieved_at', {
      type: Sequelize.DATE,
      allowNull: true, // Changed from false to true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert back to non-nullable (but this would fail if there are manual leads with null retrieved_at)
    await queryInterface.changeColumn('potential_leads', 'retrieved_at', {
      type: Sequelize.DATE,
      allowNull: false,
    });
  }
};