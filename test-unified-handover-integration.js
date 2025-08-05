#!/usr/bin/env node

/**
 * Comprehensive test for unified agent handover integration
 * Tests that the handover service works correctly with the unified campaign agent
 */

import { UnifiedCampaignAgent } from './server/agents/unified-campaign-agent.ts';
import { HandoverService } from './server/services/handover-service.ts';
import { LeadsRepository, ConversationsRepository, CampaignsRepository } from './server/db/index.ts';

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

const mockCampaign = {
  name: 'Test Handover Campaign',
  steps: [
    {
      id: 'step1',
      channel: 'email',
      content: 'Hello {firstName}, welcome to our service!',
      subject: 'Welcome!',
      delayDays: 0,
      order: 1
    },
    {
      id: 'step2',
      channel: 'email',
      content: 'Hi {firstName}, are you interested in our financing options?',
      subject: 'Financing Options',
      delayDays: 1,
      order: 2
    }
  ],
  handoverRules: {
    qualificationScore: 7,
    conversationLength: 5,
    keywordTriggers: ['urgent', 'financing', 'decision maker', 'budget'],
    timeThreshold: 300, // 5 minutes
    goalCompletionRequired: ['budget_confirmed', 'timeline_established'],
    handoverRecipients: [
      {
        name: 'Sales Manager',
        email: 'sales@test.com',
        role: 'sales',
        priority: 'high'
      },
      {
        name: 'Account Specialist',
        email: 'specialist@test.com',
        role: 'specialist',
        priority: 'medium'
      }
    ]
  }
};

async function testHandoverEvaluation() {
  console.log('\n=== Testing Handover Evaluation ===');
  
  try {
    const agent = new UnifiedCampaignAgent();
    
    // Test 1: Basic handover evaluation without conversation
    console.log('\n1. Testing basic handover evaluation...');
    const basicEvaluation = await agent.shouldHandover(mockLead, mockCampaign.handoverRules);
    
    console.log('Basic Evaluation Result:', {
      shouldHandover: basicEvaluation.shouldHandover,
      reason: basicEvaluation.reason,
      score: basicEvaluation.score,
      triggeredCriteria: basicEvaluation.triggeredCriteria
    });
    
    // Should trigger handover due to qualification score (8 >= 7) and keywords
    if (basicEvaluation.shouldHandover) {
      console.log('✅ Basic handover evaluation PASSED - correctly triggered handover');
    } else {
      console.log('❌ Basic handover evaluation FAILED - should have triggered handover');
    }
    
    // Test 2: Create conversation and test comprehensive evaluation
    console.log('\n2. Testing conversation-based handover evaluation...');
    
    // Create a mock conversation
    const conversation = await ConversationsRepository.create(
      mockLead.id,
      'email',
      'unified-campaign',
      mockLead.campaignId
    );
    
    if (conversation) {
      console.log('Created test conversation:', conversation.id);
      
      // Add some messages to simulate conversation
      await ConversationsRepository.addMessage(conversation.id, {
        role: 'agent',
        content: 'Hello John, welcome to our financing service!'
      });
      
      await ConversationsRepository.addMessage(conversation.id, {
        role: 'lead',
        content: 'Hi, I need urgent financing and I have the budget ready. I can make decisions for my company.'
      });
      
      await ConversationsRepository.addMessage(conversation.id, {
        role: 'agent',
        content: 'Great! Let me help you with that. What\'s your timeline?'
      });
      
      await ConversationsRepository.addMessage(conversation.id, {
        role: 'lead',
        content: 'I need this done ASAP, within a week if possible.'
      });
      
      // Update qualification score and goal progress
      await ConversationsRepository.updateQualificationScore(conversation.id, 9);
      await ConversationsRepository.updateGoalProgress(conversation.id, {
        'budget_confirmed': true,
        'timeline_established': true,
        'decision_maker': true,
        'interest_level': true
      });
      
      // Test comprehensive evaluation
      const comprehensiveEvaluation = await agent.shouldHandover(
        mockLead,
        mockCampaign.handoverRules,
        conversation.id
      );
      
      console.log('Comprehensive Evaluation Result:', {
        shouldHandover: comprehensiveEvaluation.shouldHandover,
        reason: comprehensiveEvaluation.reason,
        score: comprehensiveEvaluation.score,
        triggeredCriteria: comprehensiveEvaluation.triggeredCriteria
      });
      
      if (comprehensiveEvaluation.shouldHandover) {
        console.log('✅ Comprehensive handover evaluation PASSED - correctly triggered handover');
      } else {
        console.log('❌ Comprehensive handover evaluation FAILED - should have triggered handover');
      }
      
      return conversation.id;
    }
    
  } catch (error) {
    console.error('❌ Error in handover evaluation test:', error.message);
    return null;
  }
}

async function testHandoverExecution(conversationId) {
  console.log('\n=== Testing Handover Execution ===');
  
  try {
    const agent = new UnifiedCampaignAgent();
    
    // Test handover execution
    console.log('\n1. Testing handover execution...');
    const handoverSuccess = await agent.executeHandover(
      mockLead,
      mockCampaign.handoverRules.handoverRecipients,
      conversationId
    );
    
    if (handoverSuccess) {
      console.log('✅ Handover execution PASSED - handover completed successfully');
    } else {
      console.log('❌ Handover execution FAILED - handover did not complete');
    }
    
    // Check if conversation status was updated
    const updatedConversation = await ConversationsRepository.findById(conversationId);
    if (updatedConversation && updatedConversation.status === 'handover_pending') {
      console.log('✅ Conversation status update PASSED - status updated to handover_pending');
    } else {
      console.log('❌ Conversation status update FAILED - status not updated correctly');
      console.log('Current status:', updatedConversation?.status);
    }
    
    return handoverSuccess;
    
  } catch (error) {
    console.error('❌ Error in handover execution test:', error.message);
    return false;
  }
}

async function testKeywordTriggers() {
  console.log('\n=== Testing Keyword Triggers ===');
  
  try {
    const agent = new UnifiedCampaignAgent();
    
    // Test with different keyword combinations
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
        expected: false,
        description: 'no trigger keywords'
      },
      {
        notes: 'I am the decision maker for budget approval',
        metadata: {},
        expected: true,
        description: 'decision maker + budget keywords'
      }
    ];
    
    for (const testCase of testCases) {
      const testLead = {
        ...mockLead,
        notes: testCase.notes,
        metadata: testCase.metadata,
        qualificationScore: 5 // Below threshold to isolate keyword testing
      };
      
      const evaluation = await agent.shouldHandover(testLead, mockCampaign.handoverRules);
      
      const passed = evaluation.shouldHandover === testCase.expected;
      console.log(`${passed ? '✅' : '❌'} Keyword test (${testCase.description}): ${passed ? 'PASSED' : 'FAILED'}`);
      
      if (!passed) {
        console.log(`  Expected: ${testCase.expected}, Got: ${evaluation.shouldHandover}`);
        console.log(`  Reason: ${evaluation.reason}`);
        console.log(`  Triggered criteria: ${evaluation.triggeredCriteria.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in keyword triggers test:', error.message);
  }
}

async function testQualificationScoring() {
  console.log('\n=== Testing Qualification Scoring ===');
  
  try {
    const agent = new UnifiedCampaignAgent();
    
    const testCases = [
      { score: 9, threshold: 7, expected: true, description: 'score above threshold' },
      { score: 7, threshold: 7, expected: true, description: 'score equals threshold' },
      { score: 5, threshold: 7, expected: false, description: 'score below threshold' },
    ];
    
    for (const testCase of testCases) {
      const testLead = {
        ...mockLead,
        qualificationScore: testCase.score,
        notes: '', // Remove keywords to isolate scoring test
        metadata: {}
      };
      
      const testRules = {
        ...mockCampaign.handoverRules,
        qualificationScore: testCase.threshold,
        keywordTriggers: [] // Remove keyword triggers
      };
      
      const evaluation = await agent.shouldHandover(testLead, testRules);
      
      const passed = evaluation.shouldHandover === testCase.expected;
      console.log(`${passed ? '✅' : '❌'} Scoring test (${testCase.description}): ${passed ? 'PASSED' : 'FAILED'}`);
      
      if (!passed) {
        console.log(`  Expected: ${testCase.expected}, Got: ${evaluation.shouldHandover}`);
        console.log(`  Score: ${testCase.score}, Threshold: ${testCase.threshold}`);
        console.log(`  Reason: ${evaluation.reason}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in qualification scoring test:', error.message);
  }
}

async function testCampaignHandoverIntegration() {
  console.log('\n=== Testing Campaign Handover Integration ===');
  
  try {
    const agent = new UnifiedCampaignAgent();
    
    // Create a campaign execution that should trigger handover
    console.log('\n1. Testing campaign execution with handover trigger...');
    
    const execution = await agent.executeCampaign(mockLead, mockCampaign);
    
    console.log('Campaign execution result:', {
      status: execution.status,
      currentStep: execution.currentStep,
      totalSteps: execution.metadata.totalSteps
    });
    
    if (execution.status === 'handover') {
      console.log('✅ Campaign handover integration PASSED - campaign correctly triggered handover');
    } else {
      console.log('❌ Campaign handover integration FAILED - campaign should have triggered handover');
      console.log('  Expected status: handover, Got:', execution.status);
    }
    
    return execution;
    
  } catch (error) {
    console.error('❌ Error in campaign handover integration test:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('🧪 Starting Unified Agent Handover Integration Tests');
  console.log('='.repeat(60));
  
  try {
    // Test handover evaluation
    const conversationId = await testHandoverEvaluation();
    
    if (conversationId) {
      // Test handover execution
      await testHandoverExecution(conversationId);
    }
    
    // Test keyword triggers
    await testKeywordTriggers();
    
    // Test qualification scoring
    await testQualificationScoring();
    
    // Test campaign integration
    await testCampaignHandoverIntegration();
    
    console.log('\n' + '='.repeat(60));
    console.log('🏁 All tests completed! Check results above for pass/fail status.');
    
  } catch (error) {
    console.error('💥 Test suite failed with error:', error.message);
    console.error(error.stack);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().then(() => {
    console.log('\n✨ Test execution finished.');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error running tests:', error.message);
    process.exit(1);
  });
}

export {
  testHandoverEvaluation,
  testHandoverExecution,
  testKeywordTriggers,
  testQualificationScoring,
  testCampaignHandoverIntegration,
  runAllTests
};