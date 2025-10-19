const User = require('./User');
const UserSession = require('./UserSession');
const Company = require('./Company');
const Contact = require('./Contact');
const PipelineStage = require('./PipelineStage');
const Opportunity = require('./Opportunity');
const Activity = require('./Activity');
const SocialProfile = require('./SocialProfile');

// User associations
User.hasMany(UserSession, { foreignKey: 'userId', as: 'sessions' });
User.hasMany(Contact, { foreignKey: 'assignedTo', as: 'assignedContacts' });
User.hasMany(Opportunity, { foreignKey: 'assignedTo', as: 'assignedOpportunities' });
User.hasMany(Activity, { foreignKey: 'assignedTo', as: 'assignedActivities' });

// UserSession associations
UserSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Company associations
Company.hasMany(Contact, { foreignKey: 'companyId', as: 'contacts' });
Company.hasMany(Opportunity, { foreignKey: 'companyId', as: 'opportunities' });

// Contact associations
Contact.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Contact.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
Contact.hasMany(Opportunity, { foreignKey: 'contactId', as: 'opportunities' });
Contact.hasMany(Activity, { foreignKey: 'contactId', as: 'activities' });
Contact.hasMany(SocialProfile, { foreignKey: 'contactId', as: 'socialProfiles' });

// PipelineStage associations
PipelineStage.hasMany(Opportunity, { foreignKey: 'stageId', as: 'opportunities' });

// Opportunity associations
Opportunity.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Opportunity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Opportunity.belongsTo(PipelineStage, { foreignKey: 'stageId', as: 'stage' });
Opportunity.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
Opportunity.hasMany(Activity, { foreignKey: 'opportunityId', as: 'activities' });

// Activity associations
Activity.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Activity.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });
Activity.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });

// SocialProfile associations
SocialProfile.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });

module.exports = {
  User,
  UserSession,
  Company,
  Contact,
  PipelineStage,
  Opportunity,
  Activity,
  SocialProfile
};