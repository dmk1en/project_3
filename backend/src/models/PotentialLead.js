const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PotentialLead = sequelize.define('PotentialLead', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  pdlProfileId: {
    type: DataTypes.STRING(255),
    unique: true,
    field: 'pdl_profile_id'
  },
  fullName: {
    type: DataTypes.STRING(255),
    field: 'full_name'
  },
  jobTitle: {
    type: DataTypes.STRING(300),
    field: 'job_title'
  },
  companyName: {
    type: DataTypes.STRING(255),
    field: 'company_name'
  },
  locationCountry: {
    type: DataTypes.STRING(100),
    field: 'location_country'
  },
  locationCity: {
    type: DataTypes.STRING(100),
    field: 'location_city'
  },
  location: {
    type: DataTypes.STRING(255)
  },
  industry: {
    type: DataTypes.STRING(100)
  },
  skills: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  linkedinUrl: {
    type: DataTypes.STRING(500),
    field: 'linkedin_url'
  },
  email: {
    type: DataTypes.STRING(255)
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  sourceQuery: {
    type: DataTypes.TEXT,
    field: 'source_query'
  },
  leadType: {
    type: DataTypes.ENUM('staff', 'client', 'general'),
    defaultValue: 'general',
    field: 'lead_type'
  },
  status: {
    type: DataTypes.ENUM('pending_review', 'added_to_crm', 'rejected', 'duplicate'),
    defaultValue: 'pending_review'
  },
  leadScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'lead_score'
  },
  rawData: {
    type: DataTypes.JSONB,
    field: 'raw_data'
  },
  retrievedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'retrieved_at'
  },
  reviewedBy: {
    type: DataTypes.UUID,
    field: 'reviewed_by'
  },
  reviewedAt: {
    type: DataTypes.DATE,
    field: 'reviewed_at'
  },
  isManual: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_manual'
  },
  source: {
    type: DataTypes.STRING
  },
  notes: {
    type: DataTypes.TEXT
  },
  createdBy: {
    type: DataTypes.UUID,
    field: 'created_by'
  },
  updatedBy: {
    type: DataTypes.UUID,
    field: 'updated_by'
  }
}, {
  tableName: 'potential_leads',
  timestamps: true,
  paranoid: true,
  underscored: true
});

module.exports = PotentialLead;