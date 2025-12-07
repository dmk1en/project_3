'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new values to the contacts source enum
    await queryInterface.sequelize.query(
      `ALTER TYPE enum_contacts_source ADD VALUE 'social_media';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE enum_contacts_source ADD VALUE 'cold_call';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE enum_contacts_source ADD VALUE 'trade_show';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE enum_contacts_source ADD VALUE 'partner';`
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE enum_contacts_source ADD VALUE 'other';`
    );
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum type and column
    console.log('Warning: Rollback not supported for adding enum values');
  }
};