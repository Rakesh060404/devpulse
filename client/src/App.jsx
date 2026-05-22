import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Repositories from './pages/Repositories';
import Analytics from './pages/Analytics';
import RepositoryAnalytics from './pages/RepositoryAnalytics';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <Router>
                    <div className="App">
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/repositories" element={<Repositories />} />
                            <Route path="/repositories/:repoId" element={<RepositoryAnalytics />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/" element={<Login />} />
                            <Route path="*" element={<Login />} />
                        </Routes>
                    </div>
                </Router>
            </AuthProvider>
        </ErrorBoundary>
    );
}

export default App;