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
        status: 'active',
        permissions: JSON.stringify(['admin', 'read_leads', 'update_leads', 'delete_leads', 'pdl_search', 'manage_contacts', 'manage_companies', 'manage_users']),
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
        status: 'active',
        permissions: JSON.stringify(['read_leads', 'update_leads', 'delete_leads', 'pdl_search', 'manage_contacts', 'manage_companies']),
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