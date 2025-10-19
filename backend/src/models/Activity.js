const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM(
      'call',
      'email',
      'meeting',
      'note',
      'task',
      'demo',
      'proposal_sent',
      'social_interaction'
    ),
    allowNull: false
  },
  subject: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  contactId: {
    type: DataTypes.UUID,
    field: 'contact_id',
    references: {
      model: 'contacts',
      key: 'id'
    }
  },
  opportunityId: {
    type: DataTypes.UUID,
    field: 'opportunity_id',
    references: {
      model: 'opportunities',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.UUID,
    field: 'assigned_to',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dueDate: {
    type: DataTypes.DATE,
    field: 'due_date'
  },
  completedAt: {
    type: DataTypes.DATE,
    field: 'completed_at'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  outcome: {
    type: DataTypes.TEXT
  },
  customFields: {
    type: DataTypes.JSONB,
    field: 'custom_fields'
  }
}, {
  tableName: 'activities',
  indexes: [
    {
      fields: ['contact_id']
    },
    {
      fields: ['due_date']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['type']
    },
    {
      fields: ['opportunity_id']
    }
  ]
});

module.exports = Activity;