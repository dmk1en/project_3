const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING(255),
    validate: {
      isUrl: true
    }
  },
  industry: {
    type: DataTypes.STRING(100)
  },
  size: {
    type: DataTypes.ENUM('startup', 'small', 'medium', 'large', 'enterprise')
  },
  description: {
    type: DataTypes.TEXT
  },
  website: {
    type: DataTypes.STRING(255),
    validate: {
      isUrl: true
    }
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  address: {
    type: DataTypes.JSONB
  },
  linkedinUrl: {
    type: DataTypes.STRING(255),
    field: 'linkedin_url',
    validate: {
      isUrl: true
    }
  },
  twitterHandle: {
    type: DataTypes.STRING(100),
    field: 'twitter_handle'
  },
  revenueRange: {
    type: DataTypes.STRING(50),
    field: 'revenue_range'
  }
}, {
  tableName: 'companies',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['domain']
    },
    {
      fields: ['industry']
    },
    {
      fields: ['size']
    },
    {
      name: 'companies_fulltext_idx',
      type: 'GIN',
      fields: [sequelize.literal("to_tsvector('english', name || ' ' || COALESCE(description, ''))")]
    }
  ]
});

module.exports = Company;