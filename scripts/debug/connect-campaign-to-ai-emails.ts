import axios from 'axios';
import { db, campaigns, emailTemplates } from './server/db';
import { eq } from 'drizzle-orm';

const API_URL = 'http://localhost:5001/api';

async function generateAIEmailsForCampaign(campaignId: string) {
  try {
    // 1. Get campaign details
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId))
      .limit(1);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    console.log('Campaign:', campaign.name);
    console.log('Strategy:', campaign.strategy);

    // 2. Login to get token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.accessToken;

    // 3. Extract strategy details and prepare for AI generation
    const strategy = campaign.strategy as any || {};
    const sequenceData = {
      campaignName: campaign.name,
      goal: strategy.goal || 'Generate interest and drive conversions',
      context: strategy.targetAudience || 'Potential customers interested in our products',
      product: strategy.product || 'Our featured products and services',
      benefits: strategy.benefits || [
        'Competitive pricing',
        'Quality service',
        'Expert support',
        'Flexible options'
      ],
      priceAngle: strategy.offer?.details || 'Special promotional pricing available',
      urgency: strategy.urgency || 'Limited time offer',
      disclaimer: strategy.disclaimer || 'Terms and conditions apply',
      primaryCTA: strategy.offer?.cta?.primary || 'Learn More',
      CTAurl: strategy.offer?.cta?.link || 'https://example.com'
    };

    // 4. Generate AI-powered email sequence
    console.log('\n🤖 Generating AI-powered emails...');
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

    const emails = sequenceResponse.data.sequence;
    console.log(`✅ Generated ${emails.length} AI-powered emails!`);

    // 5. Save emails to the campaign
    for (const email of emails) {
      const templateData = {
        name: `${campaign.name} - Email ${email.order}`,
        subject: email.subject,
        content: email.body,
        type: 'email' as const,
        category: 'campaign',
        variables: ['firstName', 'agentName'],
        metadata: {
          campaignId: campaign.id,
          dayNumber: email.order,
          aiGenerated: true
        },
        isActive: true
      };

      const [savedTemplate] = await db
        .insert(emailTemplates)
        .values(templateData)
        .returning();

      console.log(`💾 Saved: ${savedTemplate.name}`);
    }

    // 6. Update campaign with email template references
    await db
      .update(campaigns)
      .set({
        metadata: {
          ...((campaign.metadata as any) || {}),
          emailTemplatesGenerated: true,
          emailCount: emails.length,
          generatedAt: new Date().toISOString()
        },
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, campaignId));

    console.log('\n✅ Campaign updated with AI-generated emails!');
    
    // Display the generated emails
    console.log('\n📧 Generated Email Sequence:\n');
    emails.forEach((email: any, index: number) => {
      console.log(`=== Email ${index + 1} (Day ${email.order}) ===`);
      console.log(`Subject: ${email.subject}`);
      console.log(`Body:\n${email.body}\n`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Check if campaignId was provided as argument
const campaignId = process.argv[2];
if (!campaignId) {
  console.log('Usage: npx tsx connect-campaign-to-ai-emails.ts <campaignId>');
  console.log('Example: npx tsx connect-campaign-to-ai-emails.ts 859da4b9-9b96-468f-9651-ff9e5d7d5102');
  process.exit(1);
}

// Run the generation
generateAIEmailsForCampaign(campaignId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });