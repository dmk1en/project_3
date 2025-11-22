const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Opportunity = sequelize.define('Opportunity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    field: 'title',
    allowNull: false
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
  stageId: {
    type: DataTypes.UUID,
    field: 'pipeline_stage_id',
    references: {
      model: 'pipeline_stages',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.UUID,
    field: 'assigned_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  value: {
    type: DataTypes.DECIMAL(15, 2)
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  },
  probability: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  expectedCloseDate: {
    type: DataTypes.DATEONLY,
    field: 'expected_close_date'
  },
  actualCloseDate: {
    type: DataTypes.DATEONLY,
    field: 'actual_close_date'
  },
  source: {
    type: DataTypes.STRING(100)
  },
  description: {
    type: DataTypes.TEXT
  },
  status: {
    type: DataTypes.ENUM('open', 'won', 'lost', 'on_hold'),
    defaultValue: 'open'
  },
  lostReason: {
    type: DataTypes.STRING(500),
    field: 'lost_reason'
  }
}, {
  tableName: 'opportunities',
  indexes: [
    {
      fields: ['pipeline_stage_id']
    },
    {
      fields: ['assigned_user_id']
    },
    {
      fields: ['expected_close_date']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['company_id']
    }
  ]
});

module.exports = Opportunity;