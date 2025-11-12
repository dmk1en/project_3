require('dotenv').config();
const axios = require('axios');

/**
 * Direct PDL API Test - Test our fixed parameters directly against PDL
 */

async function testDirectPDLAPI() {
    const apiKey = process.env.PDL_API_KEY;
    
    console.log('🔧 Direct PDL API Parameter Test');
    console.log('================================');
    
    if (!apiKey) {
        console.log('❌ PDL_API_KEY not found');
        return;
    }

    // Test 1: Simple SQL query (most reliable format)
    console.log('\n1️⃣  Testing Simple SQL Format...');
    try {
        const response = await axios.get('https://api.peopledatalabs.com/v5/person/search', {
            headers: {
                'X-Api-Key': apiKey
            },
            params: {
                sql: "SELECT * FROM person WHERE location_country='vietnam' AND job_title ILIKE '%engineer%' LIMIT 1",
                pretty: true
            }
        });

        console.log('✅ SQL Format: SUCCESS');
        console.log(`📊 Results: ${response.data.data?.length || 0}`);
        console.log(`💰 Credits: ${response.data.credits_used || 0}`);
        
    } catch (error) {
        console.log('❌ SQL Format: FAILED');
        console.log('Error:', error.response?.data?.error?.message || error.message);
    }

    // Test 2: Query parameters format
    console.log('\n2️⃣  Testing Query Parameters Format...');
    try {
        const response = await axios.get('https://api.peopledatalabs.com/v5/person/search', {
            headers: {
                'X-Api-Key': apiKey
            },
            params: {
                job_title: 'engineer',
                location_country: 'vietnam',
                size: 1,
                pretty: true
            }
        });

        console.log('✅ Parameters Format: SUCCESS');
        console.log(`📊 Results: ${response.data.data?.length || 0}`);
        console.log(`💰 Credits: ${response.data.credits_used || 0}`);
        
    } catch (error) {
        console.log('❌ Parameters Format: FAILED');
        console.log('Error:', error.response?.data?.error?.message || error.message);
    }

    // Test 3: Elasticsearch DSL format
    console.log('\n3️⃣  Testing Elasticsearch DSL Format...');
    try {
        const searchQuery = {
            size: 1,
            query: {
                bool: {
                    must: [
                        { term: { "location_country": "vietnam" } },
                        { match: { "job_title": "engineer" } }
                    ]
                }
            }
        };

        const response = await axios.post('https://api.peopledatalabs.com/v5/person/search', searchQuery, {
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey
            }
        });

        console.log('✅ Elasticsearch DSL: SUCCESS');
        console.log(`📊 Results: ${response.data.data?.length || 0}`);
        console.log(`💰 Credits: ${response.data.credits_used || 0}`);
        
    } catch (error) {
        console.log('❌ Elasticsearch DSL: FAILED');
        console.log('Error:', error.response?.data?.error?.message || error.message);
    }

    console.log('\n🎯 Test Complete - Use the working format in our service');
}

testDirectPDLAPI().catch(console.error);