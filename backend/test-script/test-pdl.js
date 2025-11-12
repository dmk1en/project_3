require('dotenv').config();
const axios = require('axios');

/**
 * Test script for People Data Labs API integration
 * This script tests the PDL API endpoints without requiring the full CRM system
 */

class PDLTester {
  constructor() {
    this.apiKey = process.env.PDL_API_KEY;
    this.baseURL = process.env.PDL_API_BASE_URL || 'https://api.peopledatalabs.com/v5';
    
    if (!this.apiKey) {
      console.error('❌ PDL_API_KEY not found in environment variables');
      console.log('Please add your PDL API key to the .env file:');
      console.log('PDL_API_KEY=your_api_key_here');
      process.exit(1);
    }

    this.headers = {
      'X-Api-Key': this.apiKey,
      'Content-Type': 'application/json'
    };
  }

  async testConnection() {
    console.log('🔍 Testing PDL API Connection...');
    
    try {
      const response = await axios.get(`${this.baseURL}/status`, {
        headers: this.headers
      });

      if (response.status === 200) {
        console.log('✅ PDL API Connection: SUCCESS');
        console.log('📊 API Status:', response.data);
        return true;
      }
    } catch (error) {
      console.log('❌ PDL API Connection: FAILED');
      console.log('Error:', error.response?.data || error.message);
      return false;
    }
  }

  async testEnrichment() {
    console.log('\n🔍 Testing Person Enrichment...');
    
    // Test with a sample email (using a common test email)
    const testData = {
      email: 'sean@peopledatalabs.com' // PDL's own founder's email (publicly available)
    };

    try {
      const response = await axios.get(`${this.baseURL}/person/enrich`, {
        headers: this.headers,
        params: testData
      });

      if (response.status === 200 && response.data.status === 200) {
        console.log('✅ Person Enrichment: SUCCESS');
        console.log('👤 Sample Data:');
        console.log(`   Name: ${response.data.data.full_name || 'N/A'}`);
        console.log(`   Job Title: ${response.data.data.job_title || 'N/A'}`);
        console.log(`   Company: ${response.data.data.job_company_name || 'N/A'}`);
        console.log(`   Location: ${response.data.data.location_name || 'N/A'}`);
        console.log(`   LinkedIn: ${response.data.data.linkedin_url || 'N/A'}`);
        return true;
      }
    } catch (error) {
      console.log('❌ Person Enrichment: FAILED');
      if (error.response?.status === 404) {
        console.log('ℹ️  Person not found (this is normal for test emails)');
      } else {
        console.log('Error:', error.response?.data || error.message);
      }
      return false;
    }
  }

  async testSearch() {
    console.log('\n🔍 Testing Person Search...');
    
    // Test search for software engineers in Vietnam
    const searchParams = {
      sql: `SELECT * FROM person 
            WHERE job_title_role = 'software engineer' 
            AND location_country = 'vietnam' 
            AND job_company_size = '51-200'
            LIMIT 5`
    };

    try {
      const response = await axios.get(`${this.baseURL}/person/search`, {
        headers: this.headers,
        params: searchParams
      });

      if (response.status === 200) {
        console.log('✅ Person Search: SUCCESS');
        console.log(`📊 Results Found: ${response.data.data?.length || 0}`);
        console.log(`💰 Credits Used: ${response.data.credits_used || 'N/A'}`);
        
        if (response.data.data && response.data.data.length > 0) {
          console.log('\n👥 Sample Results:');
          response.data.data.slice(0, 3).forEach((person, index) => {
            console.log(`   ${index + 1}. ${person.full_name || 'N/A'}`);
            console.log(`      Title: ${person.job_title || 'N/A'}`);
            console.log(`      Company: ${person.job_company_name || 'N/A'}`);
            console.log(`      Location: ${person.location_name || 'N/A'}`);
            console.log('');
          });
        }
        return true;
      }
    } catch (error) {
      console.log('❌ Person Search: FAILED');
      console.log('Error:', error.response?.data || error.message);
      return false;
    }
  }

  async testBulkEnrichment() {
    console.log('\n🔍 Testing Bulk Enrichment...');
    
    const bulkData = {
      requests: [
        { params: { email: 'sean@peopledatalabs.com' } },
        { params: { linkedin_url: 'https://linkedin.com/in/seanthorne' } }
      ]
    };

    try {
      const response = await axios.post(`${this.baseURL}/person/bulk`, bulkData, {
        headers: this.headers
      });

      if (response.status === 200) {
        console.log('✅ Bulk Enrichment: SUCCESS');
        console.log(`📊 Requests Processed: ${response.data.length || 0}`);
        
        response.data.forEach((result, index) => {
          console.log(`   Request ${index + 1}: ${result.status === 200 ? 'SUCCESS' : 'FAILED'}`);
          if (result.data) {
            console.log(`      Name: ${result.data.full_name || 'N/A'}`);
          }
        });
        return true;
      }
    } catch (error) {
      console.log('❌ Bulk Enrichment: FAILED');
      console.log('Error:', error.response?.data || error.message);
      return false;
    }
  }

  async testCompanyEnrichment() {
    console.log('\n🔍 Testing Company Enrichment...');
    
    const companyData = {
      name: 'People Data Labs'
    };

    try {
      const response = await axios.get(`${this.baseURL}/company/enrich`, {
        headers: this.headers,
        params: companyData
      });

      if (response.status === 200 && response.data.status === 200) {
        console.log('✅ Company Enrichment: SUCCESS');
        console.log('🏢 Company Data:');
        console.log(`   Name: ${response.data.data.name || 'N/A'}`);
        console.log(`   Website: ${response.data.data.website || 'N/A'}`);
        console.log(`   Industry: ${response.data.data.industry || 'N/A'}`);
        console.log(`   Size: ${response.data.data.size || 'N/A'}`);
        console.log(`   Location: ${response.data.data.location?.name || 'N/A'}`);
        return true;
      }
    } catch (error) {
      console.log('❌ Company Enrichment: FAILED');
      console.log('Error:', error.response?.data || error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting PDL API Tests...\n');
    console.log('='.repeat(50));
    
    const results = {
      connection: await this.testConnection(),
      enrichment: await this.testEnrichment(),
      search: await this.testSearch(),
      bulk: await this.testBulkEnrichment(),
      company: await this.testCompanyEnrichment()
    };

    console.log('\n' + '='.repeat(50));
    console.log('📋 Test Results Summary:');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.toUpperCase().padEnd(15)} ${status}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log('\n' + '='.repeat(50));
    console.log(`🎯 Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! PDL integration is ready.');
    } else if (passedTests > 0) {
      console.log('⚠️  Some tests failed. Check your API key and network connection.');
    } else {
      console.log('💥 All tests failed. Please check your PDL API configuration.');
    }
    
    console.log('='.repeat(50));
  }
}

// Run the tests
const tester = new PDLTester();
tester.runAllTests().catch(error => {
  console.error('💥 Unexpected error:', error.message);
  process.exit(1);
});