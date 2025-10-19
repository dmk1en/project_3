'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await queryInterface.bulkInsert('users', [
      {
        id: uuidv4(),
        email: 'admin@crm.com',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        email_verified: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        email: 'sales@crm.com',
        password_hash: hashedPassword,
        first_name: 'Sales',
        last_name: 'Manager',
        role: 'manager',
        is_active: true,
        email_verified: true,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('users', {
      email: ['admin@crm.com', 'sales@crm.com']
    }, {});
  }
};