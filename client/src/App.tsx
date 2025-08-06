import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CampaignWizardOnlyView from './views/CampaignWizardOnlyView';
import { CampaignExecutionStatus } from './components/campaign-execution/CampaignExecutionStatus';
import { LoginForm } from './components/LoginForm';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginForm />} />
      <Route path="/" element={
        <ProtectedRoute>
          <CampaignWizardOnlyView />
        </ProtectedRoute>
      } />
      <Route path="/campaigns/executions/:id" element={
        <ProtectedRoute>
          <CampaignExecutionStatus />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
