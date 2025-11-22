'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add status field (replace isActive)
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'suspended'),
      allowNull: false,
      defaultValue: 'active'
    });

    // Add permissions field
    await queryInterface.addColumn('users', 'permissions', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: []
    });

    // Update role enum to include more roles
    await queryInterface.sequelize.query('ALTER TYPE "enum_users_role" ADD VALUE \'user\'');
    await queryInterface.sequelize.query('ALTER TYPE "enum_users_role" ADD VALUE \'viewer\'');

    // Migrate existing isActive to status
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET status = CASE 
        WHEN is_active = true THEN 'active'::enum_users_status
        ELSE 'inactive'::enum_users_status
      END
    `);

    // Remove old isActive column
    await queryInterface.removeColumn('users', 'is_active');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back isActive column
    await queryInterface.addColumn('users', 'is_active', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    // Migrate status back to isActive
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET is_active = CASE 
        WHEN status = 'active' THEN true
        ELSE false
      END
    `);

    // Remove new columns
    await queryInterface.removeColumn('users', 'status');
    await queryInterface.removeColumn('users', 'permissions');
  }
};