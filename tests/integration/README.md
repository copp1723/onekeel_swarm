# Unified Campaign System - Integration Tests

This directory contains comprehensive integration tests for the unified campaign system, designed to verify that all components work together reliably and efficiently.

## Overview

The integration tests validate the complete unified campaign system, including:

- **Multi-channel campaign execution** (email, SMS, chat)
- **Handover trigger evaluation** and execution
- **AI template generation** features
- **WebSocket chat functionality**
- **Simplified campaign wizard** workflow
- **Performance optimization** verification

## Test Structure

### Test Files

- `unified-campaign-integration.test.js` - Core unified campaign system tests
- `campaign-wizard-integration.test.js` - Campaign wizard workflow tests
- `master-integration-test.js` - Master test runner that orchestrates all tests
- `README.md` - This documentation file

### Main Test Runner

```bash
# Run all integration tests
node test-unified-integration.js
```

## Test Scenarios

### 1. Multi-Channel Campaign Execution

Tests the `UnifiedCampaignAgent` executing campaigns across different channels:

- **Email campaigns** with personalized content and subjects
- **SMS campaigns** with Twilio integration (mocked for testing)
- **Chat campaigns** via WebSocket connections
- **Linear execution** with day-based delays (accelerated for testing)
- **Error handling** and retry logic

**Expected Outcomes:**
- All campaign steps execute in correct order
- Messages are properly personalized with lead data
- Delays are applied correctly (scaled for testing)
- Error handling works with retries

### 2. Handover Trigger Evaluation

Tests the handover logic using various trigger conditions:

- **Qualification score thresholds** (e.g., score >= 7 triggers handover)
- **Keyword triggers** (e.g., "urgent", "financing", "decision")
- **Conversation length limits** (e.g., 3+ messages trigger handover)
- **Multiple criteria combinations**

**Test Cases:**
```javascript
// High qualification score
{ qualificationScore: 9, threshold: 7, expected: true }

// Keyword triggers
{ notes: "urgent financing needs", keywords: ["urgent", "financing"], expected: true }

// No triggers met
{ qualificationScore: 4, threshold: 7, keywords: [], expected: false }
```

### 3. WebSocket Chat Functionality

Tests real-time chat messaging capabilities:

- **Connection registration** for leads
- **Message delivery** via WebSocket
- **Offline handling** (no active connection)
- **Connection cleanup** on disconnect

### 4. SimpleCampaignExecutor Integration

Tests the simplified campaign execution engine:

- **Service lifecycle** (start/stop)
- **Campaign status tracking**
- **Active execution monitoring** 
- **Cleanup operations**
- **Health status reporting**

### 5. AI Template Generation

Tests AI-powered template generation features (simulated):

- **Multi-channel templates** (email, SMS, chat)
- **Tone and audience targeting**
- **Content personalization**
- **Template validation**

### 6. Campaign Wizard Workflow

Tests the simplified campaign creation workflow:

- **Step-by-step progression** (basics → templates → audience → schedule → review)
- **Validation at each step**
- **Day-based scheduling** configuration
- **Integration with campaign executor**

## Performance Testing

The tests measure performance improvements compared to the complex system:

- **Baseline comparison** - Expected max 5000ms for campaign execution
- **Speed optimization** verification
- **Memory usage** monitoring
- **Resource cleanup** validation

### Performance Metrics

```javascript
const TEST_CONFIG = {
  PERFORMANCE_BASELINE_MS: 5000,  // Expected max execution time
  DELAY_MULTIPLIER: 0.001,        // Speed up delays for testing
  RETRY_ATTEMPTS: 3               // Max retry attempts
};
```

## Test Data

### Mock Leads
```javascript
{
  id: 'test-lead-1',
  firstName: 'John',
  lastName: 'Doe', 
  email: 'john@test.com',
  phone: '+1234567890',
  qualificationScore: 8,
  metadata: { interests: ['financing', 'urgent'] }
}
```

### Mock Campaign Configuration
```javascript
{
  name: 'Unified Multi-Channel Test Campaign',
  steps: [
    { channel: 'email', content: 'Welcome {firstName}!', delayDays: 0 },
    { channel: 'sms', content: 'Follow-up SMS', delayDays: 1 },
    { channel: 'chat', content: 'Chat message', delayDays: 2 }
  ],
  handoverRules: {
    qualificationScore: 7,
    keywordTriggers: ['urgent', 'financing']
  }
}
```

## Running Tests

### Prerequisites

- Node.js 16+ 
- All dependencies installed (`npm install`)
- Test environment configured

### Execution Options

```bash
# Run all integration tests
node test-unified-integration.js

# Run specific test suites
node tests/integration/unified-campaign-integration.test.js
node tests/integration/campaign-wizard-integration.test.js

# Run master test with detailed output
node tests/integration/master-integration-test.js
```

### Test Configuration

Tests use the following configuration for faster execution:

- **Delay acceleration**: Days converted to milliseconds for testing
- **Mock services**: External services (Twilio, email) are mocked
- **Memory limits**: Tests monitor memory usage for leaks
- **Timeout handling**: Reasonable timeouts for async operations

## Expected Results

### Success Criteria

✅ **All tests pass** - No failed test cases
✅ **Performance improved** - Faster than baseline (5000ms)
✅ **Memory efficient** - No memory leaks detected
✅ **Error handling** - Graceful error recovery
✅ **Feature complete** - All unified system features working

### Sample Success Output

```
🏆 FINAL INTEGRATION TEST RESULT
Status: ✅ SUCCESS
Tests Pass: ✅ Yes
Performance Gain: 15.2%
Health Check: ✅ Healthy

📝 Summary: All integration tests passed successfully. Unified campaign 
system demonstrates reliable multi-channel execution, proper handover 
triggers, and improved performance over complex system.

🎯 COMPONENTS TESTED:
  ✅ UnifiedCampaignAgent - Multi-channel execution
  ✅ SimpleCampaignExecutor - Linear campaign processing  
  ✅ HandoverService - Trigger evaluation and execution
  ✅ WebSocket chat functionality
  ✅ AI template generation (simulated)
  ✅ Campaign wizard simplified workflow
  ✅ Day-based scheduling system
  ✅ Performance optimization verification
```

## Troubleshooting

### Common Issues

**Import Errors**
- Ensure all `.js` extensions are included in imports
- Check file paths are correct relative to execution directory

**Mock Service Failures**
- Verify mock data is properly formatted
- Check async operations are properly awaited

**Performance Test Failures**
- Adjust `PERFORMANCE_BASELINE_MS` if hardware is slower
- Check for system resource constraints

**Memory Issues**
- Monitor for unhandled promises
- Ensure proper cleanup in test teardown

### Debug Mode

Add debug output by modifying test configuration:

```javascript
const DEBUG_MODE = true; // Enable detailed logging
const VERBOSE_OUTPUT = true; // Show all test steps
```

## Integration with CI/CD

These tests are designed to run in automated pipelines:

```yaml
# Example GitHub Actions integration
test-integration:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
      with:
        node-version: '18'
    - run: npm install
    - run: node test-unified-integration.js
```

## Contributing

When adding new integration tests:

1. **Follow naming convention**: `test-name-integration.test.js`
2. **Include in master runner**: Add to `master-integration-test.js`
3. **Provide mock data**: Create realistic test data
4. **Measure performance**: Include timing benchmarks
5. **Document scenarios**: Update this README with new test cases

## Related Files

- `server/agents/unified-campaign-agent.ts` - Main unified agent
- `server/services/simple-campaign-executor.ts` - Campaign executor
- `server/services/handover-service.ts` - Handover logic
- `test-unified-integration.js` - Main test runner script