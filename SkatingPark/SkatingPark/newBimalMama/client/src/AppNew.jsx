import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp, TOKEN_STORAGE_KEY } from './context/AppContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Layout from './components/Layout';
import Loader from './components/Loader';
import './App.css';

// Lazy load components
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const Sales = lazy(() => import('./pages/Sales'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Users = lazy(() => import('./pages/Users'));
const Branches = lazy(() => import('./pages/Branches'));
const Settings = lazy(() => import('./pages/Settings'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const Summary = lazy(() => import('./pages/Summary'));
const TicketHistory = lazy(() => import('./pages/TicketHistory'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
const QRScanner = lazy(() => import('./pages/QRScanner'));

const AdminOnly = ({ children }) => {
  const { user } = useApp();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};

const LanguageLoader = ({ children }) => {
  const { changeLanguage } = useLanguage();
  const { currentBranch, token } = useApp();

  React.useEffect(() => {
    const loadLanguageFromSettings = async () => {
      if (currentBranch && token) {
        try {
          const response = await fetch(`/api/settings/${currentBranch._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.settings?.defaultLanguage) {
              changeLanguage(data.settings.defaultLanguage);
            }
          }
        } catch (error) {
          console.error('Error loading language from settings:', error);
        }
      }
    };

    loadLanguageFromSettings();
  }, [currentBranch, token, changeLanguage]);

  return children;
};

function App() {
  const { user, loading } = useApp();

  if (loading) {
    return <Loader />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" />} />
          <Route path="/" element={
            <Layout>
              <Dashboard />
            </Layout>
          } />
          <Route path="/staff-dashboard" element={
            <Layout>
              <StaffDashboard />
            </Layout>
          } />
          <Route path="/sales" element={
            <Layout>
              <Sales />
            </Layout>
          } />
          <Route path="/tickets" element={
            <Layout>
              <Tickets />
            </Layout>
          } />
          <Route path="/expenses" element={
            <Layout>
              <Expenses />
            </Layout>
          } />
          <Route path="/users" element={
            <AdminOnly>
              <Layout>
                <Users />
              </Layout>
            </AdminOnly>
          } />
          <Route path="/branches" element={
            <AdminOnly>
              <Layout>
                <Branches />
              </Layout>
            </AdminOnly>
          } />
          <Route path="/settings" element={
            <Layout>
              <Settings />
            </Layout>
          } />
          <Route path="/backup-restore" element={
            <AdminOnly>
              <Layout>
                <BackupRestore />
              </Layout>
            </AdminOnly>
          } />
          <Route path="/summary" element={
            <Layout>
              <Summary />
            </Layout>
          } />
          <Route path="/ticket-history" element={
            <Layout>
              <TicketHistory />
            </Layout>
          } />
          <Route path="/customer-details" element={
            <Layout>
              <CustomerDetails />
            </Layout>
          } />
          <Route path="/qr-scanner" element={
            <Layout>
              <QRScanner />
            </Layout>
          } />
        </Routes>
      </Router>
    </Suspense>
  );
}

export default function AppWrapper() {
  return (
    <LanguageProvider>
      <AppProvider>
        <LanguageLoader>
          <App />
        </LanguageLoader>
      </AppProvider>
    </LanguageProvider>
  );
}
