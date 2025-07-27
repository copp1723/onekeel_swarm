// Feature Flag Service Wrapper that automatically selects mock or real implementation
import { mockFeatureFlagService } from './feature-flag-service-mock';
import { FeatureFlagService } from './feature-flag-service';

// Check if we should use mock service
const shouldUseMock = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  const enableMock = process.env.ENABLE_MOCK_SERVICES === 'true';
  const isMockDb = dbUrl.startsWith('mock://');
  
  return enableMock || isMockDb || !dbUrl;
};

// Export the appropriate service
export const featureFlagService = shouldUseMock() 
  ? mockFeatureFlagService 
  : FeatureFlagService.getInstance();

console.log(`Using ${shouldUseMock() ? 'mock' : 'real'} feature flag service`);