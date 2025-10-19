'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    await queryInterface.bulkInsert('pipeline_stages', [
      {
        id: uuidv4(),
        name: 'Lead',
        display_order: 1,
        probability_percent: 10,
        color: '#FF6B6B',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Qualified',
        display_order: 2,
        probability_percent: 25,
        color: '#4ECDC4',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Proposal',
        display_order: 3,
        probability_percent: 50,
        color: '#45B7D1',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Negotiation',
        display_order: 4,
        probability_percent: 75,
        color: '#96CEB4',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Closed Won',
        display_order: 5,
        probability_percent: 100,
        color: '#FFEAA7',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'Closed Lost',
        display_order: 6,
        probability_percent: 0,
        color: '#DDA0DD',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('pipeline_stages', null, {});
  }
};