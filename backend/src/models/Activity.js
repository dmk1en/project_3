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
  companyId: {
    type: DataTypes.UUID,
    field: 'company_id',
    references: {
      model: 'companies',
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
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  activityDate: {
    type: DataTypes.DATE,
    field: 'activity_date',
    allowNull: false
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    field: 'duration_minutes'
  },
  isCompleted: {
    type: DataTypes.BOOLEAN,
    field: 'is_completed',
    defaultValue: false
  },
  followUpDate: {
    type: DataTypes.DATE,
    field: 'follow_up_date'
  },
  outcome: {
    type: DataTypes.STRING(200)
  },
  metadata: {
    type: DataTypes.JSONB
  }
}, {
  tableName: 'activities',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['company_id']
    },
    {
      fields: ['opportunity_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['activity_date']
    },
    {
      fields: ['is_completed']
    }
  ]
});

module.exports = Activity;