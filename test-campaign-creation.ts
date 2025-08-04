import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

async function testCampaignCreation() {
  try {
    // 1. Login
    console.log('1. Testing login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('Login response:', loginResponse.data);
    
    const token = loginResponse.data.accessToken;
    if (!token) {
      throw new Error('No token received from login');
    }
    console.log('✅ Login successful, got token');

    // 2. Create campaign
    console.log('\n2. Creating campaign...');
    const campaignData = {
      name: 'Test Campaign - Database Fix Verification',
      type: 'drip',
      status: 'draft',
      campaignType: 'drip',
      campaignName: 'Test Campaign - Database Fix Verification',
      strategy: {
        goal: 'Test the campaign creation after database fixes',
        offer: {
          cta: {
            primary: 'Learn More',
            link: 'https://example.com'
          }
        }
      }
    };

    const campaignResponse = await axios.post(
      `${API_URL}/campaigns`,
      campaignData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Campaign created successfully!');
    console.log('Campaign response:', JSON.stringify(campaignResponse.data, null, 2));
    
    const campaignId = campaignResponse.data.campaign?.id || campaignResponse.data.data?.id || campaignResponse.data.id;
    const campaignName = campaignResponse.data.campaign?.name || campaignResponse.data.data?.name || campaignResponse.data.name;
    
    console.log('Campaign ID:', campaignId);
    console.log('Campaign Name:', campaignName);

    // 3. Test AI enhancement
    console.log('\n3. Testing AI enhancement...');
    const enhanceResponse = await axios.post(
      `${API_URL}/agents/enhance-campaign-field`,
      {
        field: 'context',
        campaignData: {
          name: campaignName,
          type: 'drip',
          strategy: {
            goal: 'Test the campaign creation after database fixes'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ AI enhancement successful!');
    console.log('Enhanced response:', JSON.stringify(enhanceResponse.data, null, 2));

    console.log('\n🎉 All tests passed! Campaign creation and AI enhancement are working.');

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error?.details) {
      console.error('Details:', error.response.data.error.details);
    }
  }
}

// Run the test
testCampaignCreation();