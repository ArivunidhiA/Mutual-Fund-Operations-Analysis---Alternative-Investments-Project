import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FundAnalysis from './pages/FundAnalysis';
import ComplianceDashboard from './pages/ComplianceDashboard';
import AlternativeInvestments from './pages/AlternativeInvestments';
import FundDetail from './pages/FundDetail';
import './index.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#28A745',
                secondary: '#fff',
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: '#DC3545',
                secondary: '#fff',
              },
            },
          }}
        />
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/funds" element={<FundAnalysis />} />
            <Route path="/funds/:id" element={<FundDetail />} />
            <Route path="/compliance" element={<ComplianceDashboard />} />
            <Route path="/alternative-investments" element={<AlternativeInvestments />} />
          </Routes>
        </Layout>
      </div>
    </Router>
  );
}

export default App; 