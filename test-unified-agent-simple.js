#!/usr/bin/env node

/**
 * Simple test for unified campaign agent handover functionality
 */

import { UnifiedCampaignAgent } from './server/agents/unified-campaign-agent.ts';

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

async function testUnifiedAgentHandover() {
  console.log('🧪 Testing Unified Campaign Agent Handover');
  console.log('='.repeat(50));

  try {
    const agent = new UnifiedCampaignAgent();

    // Test 1: Basic handover evaluation
    console.log('\n1. Testing basic handover evaluation...');
    const evaluation = await agent.shouldHandover(mockLead, mockHandoverRules);
    
    console.log('Handover Evaluation Result:', {
      shouldHandover: evaluation.shouldHandover,
      reason: evaluation.reason,
      score: evaluation.score,
      triggeredCriteria: evaluation.triggeredCriteria,
      nextActions: evaluation.nextActions
    });

    if (evaluation.shouldHandover) {
      console.log('✅ Basic handover evaluation PASSED - correctly triggered handover');
    } else {
      console.log('❌ Basic handover evaluation FAILED - should have triggered handover');
    }

    // Test 2: Keyword trigger testing
    console.log('\n2. Testing keyword triggers...');
    const testCases = [
      {
        notes: 'Customer mentioned urgent timeline',
        metadata: { interests: ['financing'] },
        expected: true,
        description: 'urgent + financing keywords'
      },
      {
        notes: 'Regular inquiry about services',
        metadata: { interests: ['general'] },
        qualificationScore: 5, // Below threshold
        expected: false,
        description: 'no trigger keywords, low score'
      }
    ];

    for (const testCase of testCases) {
      const testLead = {
        ...mockLead,
        notes: testCase.notes,
        metadata: testCase.metadata,
        qualificationScore: testCase.qualificationScore || mockLead.qualificationScore
      };

      const testEvaluation = await agent.shouldHandover(testLead, mockHandoverRules);
      const passed = testEvaluation.shouldHandover === testCase.expected;
      
      console.log(`${passed ? '✅' : '❌'} Keyword test (${testCase.description}): ${passed ? 'PASSED' : 'FAILED'}`);
      
      if (!passed) {
        console.log(`  Expected: ${testCase.expected}, Got: ${testEvaluation.shouldHandover}`);
        console.log(`  Reason: ${testEvaluation.reason}`);
      }
    }

    // Test 3: Qualification score thresholds
    console.log('\n3. Testing qualification score thresholds...');
    const scoreTestCases = [
      { score: 9, threshold: 7, expected: true, description: 'score above threshold' },
      { score: 5, threshold: 7, expected: false, description: 'score below threshold' }
    ];

    for (const testCase of scoreTestCases) {
      const testLead = {
        ...mockLead,
        qualificationScore: testCase.score,
        notes: '', // Remove keywords to isolate scoring test
        metadata: {}
      };

      const testRules = {
        ...mockHandoverRules,
        qualificationScore: testCase.threshold,
        keywordTriggers: [] // Remove keyword triggers
      };

      const testEvaluation = await agent.shouldHandover(testLead, testRules);
      const passed = testEvaluation.shouldHandover === testCase.expected;
      
      console.log(`${passed ? '✅' : '❌'} Score test (${testCase.description}): ${passed ? 'PASSED' : 'FAILED'}`);
      
      if (!passed) {
        console.log(`  Expected: ${testCase.expected}, Got: ${testEvaluation.shouldHandover}`);
        console.log(`  Score: ${testCase.score}, Threshold: ${testCase.threshold}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🏁 Unified agent handover test completed!');

  } catch (error) {
    console.error('❌ Error in unified agent handover test:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnifiedAgentHandover().then(() => {
    console.log('\n✨ Test execution finished.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error running test:', error.message);
    process.exit(1);
  });
}