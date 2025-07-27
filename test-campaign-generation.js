#!/usr/bin/env node

// Test script to verify the enhanced AI prompts fix
const { EmailAgent } = require('./server/agents/email-agent.ts');

async function testCampaignGeneration() {
  console.log('🧪 Testing Campaign Generation Fix...\n');
  
  const emailAgent = new EmailAgent();
  
  const testDetails = {
    campaignName: 'Test Campaign',
    goal: 'Generate 20 qualified leads',
    context: 'This is a test campaign for car loan refinancing targeting existing customers',
    product: 'Auto Loan Refinancing',
    benefits: ['Lower monthly payments', 'No fees', 'Quick approval'],
    priceAngle: 'Rates starting at 2.99% APR',
    urgency: 'Limited time offer ends this month',
    disclaimer: 'Subject to credit approval. Terms and conditions apply.',
    primaryCTA: 'Get Your Rate',
    CTAurl: 'https://example.com/apply'
  };
  
  try {
    console.log('📧 Generating email sequence...');
    const sequence = await emailAgent.generateCampaignSequence(testDetails);
    
    console.log('✅ Success! Generated sequence with', sequence.length, 'emails\n');
    
    sequence.forEach((email, index) => {
      console.log(`--- Email ${index + 1} ---`);
      console.log('Subject:', email.subject);
      console.log('Preview:', email.body.substring(0, 100) + '...');
      console.log('');
    });
    
    // Check if the emails contain personalization placeholders
    const hasPlaceholders = sequence.some(email => 
      email.body.includes('{firstName}') && email.body.includes('{agentName}')
    );
    
    if (hasPlaceholders) {
      console.log('✅ Enhanced prompts working - emails contain personalization placeholders');
    } else {
      console.log('⚠️  Warning - emails missing personalization placeholders');
    }
    
    // Check if the emails are sophisticated (not just basic fallback)
    const isSophisticated = sequence.some(email => 
      email.body.length > 100 && 
      (email.body.includes('rates') || email.body.includes('save') || email.body.includes('financing'))
    );
    
    if (isSophisticated) {
      console.log('✅ Enhanced prompts working - emails are contextual and sophisticated');
    } else {
      console.log('⚠️  Warning - emails appear to be using basic fallback templates');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCampaignGeneration().catch(console.error);