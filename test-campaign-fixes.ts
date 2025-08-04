import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:5001/api';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  details?: any;
}

class CampaignFixTester {
  private token: string = '';
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🚀 Testing Campaign Creation Fixes...\n');

    try {
      await this.testLogin();
      await this.testAuthMe();
      await this.testCampaignList();
      await this.testCampaignCreation();
      await this.testEmailSequenceGeneration();
      await this.testCampaignWithAudience();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }

    this.printResults();
  }

  private async testLogin(): Promise<void> {
    try {
      console.log('1️⃣  Testing login...');
      const response = await axios.post(`${API_URL}/auth/login`, {
        username: 'admin',
        password: 'admin123'
      });

      if (response.data.success && response.data.accessToken) {
        this.token = response.data.accessToken;
        this.results.push({
          name: 'Login',
          success: true,
          details: { userId: response.data.user?.id }
        });
        console.log('   ✅ Login successful');
      } else {
        throw new Error('No access token received');
      }
    } catch (error: any) {
      this.results.push({
        name: 'Login',
        success: false,
        error: error.response?.data?.error || error.message
      });
      console.log('   ❌ Login failed:', error.response?.data || error.message);
      throw error;
    }
  }

  private async testAuthMe(): Promise<void> {
    try {
      console.log('2️⃣  Testing /auth/me endpoint...');
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (response.data.success && response.data.user) {
        this.results.push({
          name: 'Auth Me',
          success: true,
          details: { 
            userId: response.data.user.id,
            email: response.data.user.email 
          }
        });
        console.log('   ✅ Auth/me successful');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      this.results.push({
        name: 'Auth Me',
        success: false,
        error: error.response?.data?.error || error.message
      });
      console.log('   ❌ Auth/me failed:', error.response?.data || error.message);
    }
  }

  private async testCampaignList(): Promise<void> {
    try {
      console.log('3️⃣  Testing campaign list...');
      const response = await axios.get(`${API_URL}/campaigns`, {
        headers: { Authorization: `Bearer ${this.token}` },
        params: { limit: 10, sort: 'createdAt', order: 'desc' }
      });

      if (response.data.success && Array.isArray(response.data.campaigns)) {
        this.results.push({
          name: 'Campaign List',
          success: true,
          details: { 
            count: response.data.campaigns.length,
            total: response.data.total 
          }
        });
        console.log('   ✅ Campaign list successful');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      this.results.push({
        name: 'Campaign List',
        success: false,
        error: error.response?.data?.error || error.message
      });
      console.log('   ❌ Campaign list failed:', error.response?.data || error.message);
    }
  }

  private async testCampaignCreation(): Promise<void> {
    try {
      console.log('4️⃣  Testing campaign creation...');
      const campaignData = {
        name: `Test Campaign ${Date.now()}`,
        description: 'Test campaign for verifying fixes',
        type: 'drip',
        status: 'draft',
        targetCriteria: { test: true },
        settings: { emailDelay: 24 },
        active: true
      };

      const response = await axios.post(`${API_URL}/campaigns`, campaignData, {
        headers: { 
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success && response.data.campaign) {
        this.results.push({
          name: 'Campaign Creation',
          success: true,
          details: { 
            campaignId: response.data.campaign.id,
            name: response.data.campaign.name 
          }
        });
        console.log('   ✅ Campaign creation successful');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      this.results.push({
        name: 'Campaign Creation',
        success: false,
        error: error.response?.data?.error || error.message
      });
      console.log('   ❌ Campaign creation failed:', error.response?.data || error.message);
    }
  }

  private async testEmailSequenceGeneration(): Promise<void> {
    try {
      console.log('5️⃣  Testing email sequence generation...');
      const sequenceData = {
        campaignName: 'Test Email Campaign',
        goal: 'Generate quality leads',
        context: 'Automotive sales campaign for new customers',
        product: 'Car financing and sales',
        benefits: ['competitive rates', 'quick approval'], // Fixed: non-empty array
        priceAngle: 'Best rates in the market',
        urgency: 'Limited time offer',
        primaryCTA: 'Schedule Test Drive',
        CTAurl: 'https://example.com/schedule' // Fixed: valid URL
      };

      const response = await axios.post(`${API_URL}/agents/email/generate-sequence`, sequenceData, {
        headers: { 
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success && response.data.sequence) {
        this.results.push({
          name: 'Email Sequence Generation',
          success: true,
          details: { 
            sequenceLength: response.data.sequence.length 
          }
        });
        console.log('   ✅ Email sequence generation successful');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      this.results.push({
        name: 'Email Sequence Generation',
        success: false,
        error: error.response?.data?.error || error.message
      });
      console.log('   ❌ Email sequence generation failed:', error.response?.data || error.message);
    }
  }

  private async testCampaignWithAudience(): Promise<void> {
    try {
      console.log('6️⃣  Testing campaign with audience data...');
      const campaignData = {
        name: `Campaign with Audience ${Date.now()}`,
        description: 'Campaign with contact data',
        type: 'drip',
        status: 'draft',
        audience: {
          contacts: [
            {
              email: 'test1@example.com',
              firstName: 'John',
              lastName: 'Doe'
            },
            {
              email: 'test2@example.com',
              firstName: 'Jane',
              lastName: 'Smith'
            }
          ]
        }
      };

      const response = await axios.post(`${API_URL}/campaigns`, campaignData, {
        headers: { 
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success && response.data.campaign) {
        this.results.push({
          name: 'Campaign with Audience',
          success: true,
          details: { 
            campaignId: response.data.campaign.id,
            contactCount: campaignData.audience.contacts.length
          }
        });
        console.log('   ✅ Campaign with audience successful');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: any) {
      this.results.push({
        name: 'Campaign with Audience',
        success: false,
        error: error.response?.data?.error || error.message
      });
      console.log('   ❌ Campaign with audience failed:', error.response?.data || error.message);
    }
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.name}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details)}`);
      }
    });

    console.log('\n📈 Overall Results:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${failedTests}`);
    console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All tests passed! Production deployment ready.');
    } else {
      console.log('\n⚠️  Some tests failed. Review errors before deploying.');
    }
  }
}

// Run tests
const tester = new CampaignFixTester();
tester.runAllTests().catch(console.error);