const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PipelineStage = sequelize.define('PipelineStage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'display_order'
  },
  probabilityPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'probability_percent'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  color: {
    type: DataTypes.STRING(7), // Hex color code
    validate: {
      is: /^#[0-9A-F]{6}$/i
    }
  }
}, {
  tableName: 'pipeline_stages',
  indexes: [
    {
      fields: ['display_order']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = PipelineStage;