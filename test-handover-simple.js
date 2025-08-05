#!/usr/bin/env node

/**
 * Simple test for handover service functionality
 */

import { HandoverService } from './server/services/handover-service.ts';

// Mock data for testing
const mockLead = {
  id: 'test-lead-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@test.com',
  phone: '+1234567890',
  source: 'website',
  status: 'new',
  qualificationScore: 8,
  metadata: {
    interests: ['budget financing', 'urgent timeline', 'decision maker']
  },
  notes: 'Mentioned urgent need for financing and has decision-making authority',
  campaignId: 'test-campaign-456'
};

const mockHandoverRules = {
  qualificationScore: 7,
  conversationLength: 5,
  keywordTriggers: ['urgent', 'financing', 'decision maker', 'budget'],
  timeThreshold: 300,
  goalCompletionRequired: ['budget_confirmed', 'timeline_established'],
  handoverRecipients: [
    {
      name: 'Sales Manager',
      email: 'sales@test.com',
      role: 'sales',
      priority: 'high'
    }
  ]
};

async function testBasicHandoverService() {
  console.log('🧪 Testing Basic Handover Service Functionality');
  console.log('='.repeat(50));

  try {
    // Test conversation analysis
    console.log('\n1. Testing conversation analysis...');
    
    const mockConversation = {
      id: 'test-conv-123',
      leadId: mockLead.id,
      campaignId: mockLead.campaignId,
      channel: 'email',
      messages: [
        {
          role: 'agent',
          content: 'Hello John, welcome to our service!',
          timestamp: new Date().toISOString()
        },
        {
          role: 'lead',
          content: 'Hi, I need urgent financing and I have the budget ready.',
          timestamp: new Date().toISOString()
        }
      ],
      currentQualificationScore: 8,
      goalProgress: {
        'budget_confirmed': true,
        'timeline_established': false
      },
      startedAt: new Date(Date.now() - 600000), // 10 minutes ago
      lastMessageAt: new Date()
    };

    const analysis = await HandoverService.analyzeConversation(mockConversation);
    
    console.log('Conversation Analysis Result:', {
      qualificationScore: analysis.qualificationScore,
      goalProgress: analysis.goalProgress,
      keywordMatches: analysis.keywordMatches,
      sentimentScore: analysis.sentimentScore,
      urgencyLevel: analysis.urgencyLevel
    });

    // Test keyword detection
    const hasKeywords = analysis.keywordMatches.length > 0;
    console.log(`${hasKeywords ? '✅' : '❌'} Keyword detection: ${hasKeywords ? 'PASSED' : 'FAILED'}`);

    // Test qualification scoring
    const hasScore = analysis.qualificationScore > 0;
    console.log(`${hasScore ? '✅' : '❌'} Qualification scoring: ${hasScore ? 'PASSED' : 'FAILED'}`);

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Basic handover service test completed!');

  } catch (error) {
    console.error('❌ Error in basic handover service test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testBasicHandoverService().then(() => {
    console.log('\n✨ Test execution finished.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error running test:', error.message);
    process.exit(1);
  });
}