import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/ui/LoginForm';
import { useState } from 'react';

// Protected Route wrapper component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Temporary Dashboard Component
function TempDashboard() {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <p className="text-gray-600 mb-4">Welcome back, {user?.username || 'User'}!</p>
          <p className="text-sm text-gray-500 mb-6">
            Authentication has been restored. The application is now secure.
          </p>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App Content with routing
function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginForm />
        } />
        
        {/* Protected routes */}
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <TempDashboard />
          </ProtectedRoute>
        } />
        
        {/* Catch all - redirect to login or dashboard based on auth */}
        <Route path="*" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

function App() {
  console.log('🔒 SECURITY FIX APPLIED: Authentication restored - login is now required');
  console.log('🔒 Users must authenticate before accessing any application features');
  
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;