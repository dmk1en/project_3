require('dotenv').config();

/**
 * Configuration test for PDL integration
 * Checks if all required environment variables are properly set
 */

console.log('🔧 PDL Configuration Test\n');
console.log('='.repeat(40));

// Check PDL Configuration
const pdlConfig = {
  apiKey: process.env.PDL_API_KEY,
  baseUrl: process.env.PDL_API_BASE_URL,
  rateLimit: process.env.PDL_RATE_LIMIT_PER_MINUTE,
  enableEnrichment: process.env.PDL_ENABLE_ENRICHMENT,
  enableSearch: process.env.PDL_ENABLE_SEARCH
};

console.log('PDL Configuration:');
console.log(`  API Key: ${pdlConfig.apiKey ? '✅ Set (' + pdlConfig.apiKey.substring(0, 8) + '...)' : '❌ Missing'}`);
console.log(`  Base URL: ${pdlConfig.baseUrl || '⚠️  Using default (https://api.peopledatalabs.com/v5)'}`);
console.log(`  Rate Limit: ${pdlConfig.rateLimit || '⚠️  Using default (200/min)'}`);
console.log(`  Enrichment: ${pdlConfig.enableEnrichment || '⚠️  Using default (true)'}`);
console.log(`  Search: ${pdlConfig.enableSearch || '⚠️  Using default (true)'}`);

console.log('\n' + '='.repeat(40));

// Check Database Configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD
};

console.log('Database Configuration:');
console.log(`  Host: ${dbConfig.host || '❌ Missing'}`);
console.log(`  Port: ${dbConfig.port || '❌ Missing'}`);
console.log(`  Database: ${dbConfig.database || '❌ Missing'}`);
console.log(`  Username: ${dbConfig.username || '❌ Missing'}`);
console.log(`  Password: ${dbConfig.password ? '✅ Set' : '❌ Missing'}`);

console.log('\n' + '='.repeat(40));

// Check JWT Configuration
const jwtConfig = {
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
};

console.log('JWT Configuration:');
console.log(`  Secret: ${jwtConfig.secret ? '✅ Set' : '❌ Missing'}`);
console.log(`  Refresh Secret: ${jwtConfig.refreshSecret ? '✅ Set' : '❌ Missing'}`);
console.log(`  Expires In: ${jwtConfig.expiresIn || '⚠️  Using default (1h)'}`);
console.log(`  Refresh Expires In: ${jwtConfig.refreshExpiresIn || '⚠️  Using default (7d)'}`);

console.log('\n' + '='.repeat(40));

// Summary
const missingConfigs = [];

if (!pdlConfig.apiKey) missingConfigs.push('PDL_API_KEY');
if (!dbConfig.host) missingConfigs.push('DB_HOST');
if (!dbConfig.port) missingConfigs.push('DB_PORT');
if (!dbConfig.database) missingConfigs.push('DB_NAME');
if (!dbConfig.username) missingConfigs.push('DB_USERNAME');
if (!dbConfig.password) missingConfigs.push('DB_PASSWORD');
if (!jwtConfig.secret) missingConfigs.push('JWT_SECRET');
if (!jwtConfig.refreshSecret) missingConfigs.push('JWT_REFRESH_SECRET');

if (missingConfigs.length === 0) {
  console.log('✅ Configuration Check: PASSED');
  console.log('🎉 All required environment variables are set!');
} else {
  console.log('❌ Configuration Check: FAILED');
  console.log('Missing variables:');
  missingConfigs.forEach(config => {
    console.log(`  - ${config}`);
  });
  console.log('\nPlease update your .env file with the missing variables.');
}

console.log('\n' + '='.repeat(40));
console.log('💡 To get a PDL API key:');
console.log('   1. Visit: https://www.peopledatalabs.com/');
console.log('   2. Sign up for an account');
console.log('   3. Go to your dashboard and create an API key');
console.log('   4. Add it to your .env file as PDL_API_KEY=your_key_here');
console.log('='.repeat(40));