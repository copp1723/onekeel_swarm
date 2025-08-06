import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/ui/LoginForm';
import CampaignWizardOnlyView from './views/CampaignWizardOnlyView';
import { CampaignExecutionStatus } from './components/campaign-execution/CampaignExecutionStatus';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Main App Content Component
const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public route - Login */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <LoginForm />} 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <CampaignWizardOnlyView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/campaigns/executions/:id" 
          element={
            <ProtectedRoute>
              <CampaignExecutionStatus />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route */}
        <Route 
          path="*" 
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} 
        />
      </Routes>
    </Router>
  );
};

function App() {
  // SECURITY: Log authentication-protected startup
  console.log('🔒 SECURITY: App.tsx initialized with authentication protection');
  console.log('🔒 Environment:', {
    nodeEnv: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    location: window.location.href
  });

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;