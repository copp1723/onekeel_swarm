import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import CampaignWizardOnlyView from './views/CampaignWizardOnlyView';
import { CampaignExecutionStatus } from './components/campaign-execution/CampaignExecutionStatus';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<CampaignWizardOnlyView />} />
          <Route path="/campaigns/executions/:id" element={<CampaignExecutionStatus />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
