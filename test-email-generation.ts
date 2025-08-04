import axios from 'axios';

const API_URL = 'http://localhost:5001/api';

async function testEmailGeneration() {
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Login successful');

    // 2. Create a campaign with enhanced strategy
    console.log('\n2. Creating campaign with detailed strategy...');
    const campaignData = {
      name: 'Luxury SUV Spring Promotion',
      type: 'drip',
      status: 'draft',
      campaignType: 'drip',
      strategy: {
        goal: 'Convert high-intent luxury SUV shoppers who visited our website but didn\'t schedule a test drive',
        targetAudience: 'Affluent families looking for premium 7-seater SUVs',
        valueProposition: 'Exclusive spring pricing on remaining 2024 inventory with complimentary maintenance package',
        offer: {
          headline: 'Spring Luxury SUV Event',
          details: '2.9% APR financing for 72 months on select models plus complimentary 3-year maintenance',
          cta: {
            primary: 'Schedule Your Private Test Drive',
            link: 'https://dealership.com/schedule'
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

    console.log('✅ Campaign created:', campaignResponse.data.campaign.name);

    // 3. Generate AI-powered email sequence
    console.log('\n3. Generating AI-powered email sequence...');
    const sequenceData = {
      campaignName: 'Luxury SUV Spring Promotion',
      goal: 'Convert high-intent luxury SUV shoppers into test drives and sales',
      context: 'Targeting affluent families who visited our website, viewed luxury SUVs, but haven\'t scheduled a test drive. They\'re comparing us to BMW X7, Mercedes GLS, and Audi Q7.',
      product: 'Premium 7-seater luxury SUVs (2024 models)',
      benefits: [
        'Best-in-class safety ratings for family protection',
        'Advanced driver assistance technology',
        'Spacious third-row seating with captain\'s chairs',
        'Complimentary 3-year/36,000-mile maintenance',
        'Exclusive concierge service for owners'
      ],
      priceAngle: '2.9% APR for 72 months - saves $4,200 vs standard rates',
      urgency: 'Limited 2024 inventory - only 12 units remaining',
      disclaimer: 'Financing subject to credit approval. See dealer for details.',
      primaryCTA: 'Schedule Your Private Test Drive',
      CTAurl: 'https://dealership.com/schedule'
    };

    const sequenceResponse = await axios.post(
      `${API_URL}/agents/email/generate-sequence`,
      sequenceData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Email sequence generated!');
    console.log('\n📧 Generated Emails:\n');

    sequenceResponse.data.sequence.forEach((email: any, index: number) => {
      console.log(`=== Email ${index + 1} (Day ${email.order}) ===`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Body:\n${email.body}\n`);
    });

    // 4. Compare with generic templates
    console.log('\n⚠️  Compare this with the generic templates you saw:');
    console.log('- Generic: "Quick question about your vehicle financing needs"');
    console.log('- AI-Generated: Personalized, context-aware subject lines');
    console.log('\n- Generic: "Based on your situation, we offer competitive financing rates"');
    console.log('- AI-Generated: Specific benefits and value propositions');

  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testEmailGeneration();