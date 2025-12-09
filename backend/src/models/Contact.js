const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  companyId: {
    type: DataTypes.UUID,
    field: 'company_id',
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  email: {
    type: DataTypes.STRING(255),
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(50)
  },
  jobTitle: {
    type: DataTypes.STRING(150),
    field: 'job_title'
  },
  department: {
    type: DataTypes.STRING(100)
  },
  seniorityLevel: {
    type: DataTypes.ENUM('entry', 'mid', 'senior', 'director', 'vp', 'c_level'),
    field: 'seniority_level'
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
  source: {
    type: DataTypes.ENUM(
      'manual',
      'linkedin',
      'twitter',
      'referral',
      'website',
      'email_campaign',
      'cold_outreach',
      'event',
      'pdl_discovery',
      'social_media',
      'cold_call',
      'trade_show',
      'partner',
      'other'
    ),
    allowNull: false
  },
  leadScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'lead_score'
  },
  leadStatus: {
    type: DataTypes.ENUM(
      'new',
      'contacted',
      'qualified',
      'unqualified',
      'nurturing',
      'converted',
      'lost'
    ),
    defaultValue: 'new',
    field: 'lead_status'
  },
  assignedTo: {
    type: DataTypes.UUID,
    field: 'assigned_to',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notes: {
    type: DataTypes.TEXT
  },
  customFields: {
    type: DataTypes.JSONB,
    field: 'custom_fields'
  }
}, {
  tableName: 'contacts',
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['lead_status']
    },
    {
      fields: ['assigned_to']
    },
    {
      fields: ['source']
    },
    {
      fields: ['company_id']
    },
    {
      name: 'contacts_fulltext_idx',
      type: 'GIN',
      fields: [sequelize.literal("to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, ''))")]
    }
  ]
});

module.exports = Contact;