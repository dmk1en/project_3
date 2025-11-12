const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PdlSearchQuery = sequelize.define('PdlSearchQuery', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  queryConfig: {
    type: DataTypes.JSONB,
    allowNull: false,
    field: 'query_config'
  },
  leadType: {
    type: DataTypes.ENUM('staff', 'client', 'general'),
    defaultValue: 'general',
    field: 'lead_type'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastRunAt: {
    type: DataTypes.DATE,
    field: 'last_run_at'
  },
  runFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'manual'),
    defaultValue: 'weekly',
    field: 'run_frequency'
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by'
  }
}, {
  tableName: 'pdl_search_queries',
  timestamps: true,
  paranoid: true,
  underscored: true
});

module.exports = PdlSearchQuery;