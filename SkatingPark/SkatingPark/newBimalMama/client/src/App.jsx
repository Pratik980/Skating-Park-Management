// import React from 'react';
// import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// import { AppProvider } from './context/AppContext';
// import Login from './pages/Login';
// import Dashboard from './pages/Dashboard';
// import Users from './pages/Users';
// import Branches from './pages/Branches';
// import Tickets from './pages/Tickets';
// import Sales from './pages/Sales';
// import Expenses from './pages/Expenses';
// import Summary from './pages/Summary';
// import Settings from './pages/Settings';
// import BackupRestore from './pages/BackupRestore';
// import Layout from './components/Layout';
// import './App.css';

// function App() {
//   return (
//     <AppProvider>
//       <Router>
//         <div className="App">
//           <Routes>
//             <Route path="/login" element={<Login />} />
//             <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
//               <Route index element={<Dashboard />} />
//               <Route path="users" element={<Users />} />
//               <Route path="branches" element={<Branches />} />
//               <Route path="tickets" element={<Tickets />} />
//               <Route path="sales" element={<Sales />} />
//               <Route path="expenses" element={<Expenses />} />
//               <Route path="summary" element={<Summary />} />
//               <Route path="settings" element={<Settings />} />
//               <Route path="backup" element={<BackupRestore />} />
//             </Route>
//           </Routes>
//         </div>
//       </Router>
//     </AppProvider>
//   );
// }

// const ProtectedRoute = ({ children }) => {
//   const token = localStorage.getItem('token');
//   return token ? children : <Navigate to="/login" />;
// };

// export default App;


import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp, TOKEN_STORAGE_KEY } from './context/AppContext';
import Layout from './components/Layout';
import Loader from './components/Loader';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { settingsAPI } from './api/api';
import './App.css';

// Lazy load all pages for code splitting and faster initial load
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const Branches = lazy(() => import('./pages/Branches'));
const Tickets = lazy(() => import('./pages/Tickets'));
const Sales = lazy(() => import('./pages/Sales'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Summary = lazy(() => import('./pages/Summary'));
const Settings = lazy(() => import('./pages/Settings'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const CustomerDetails = lazy(() => import('./pages/CustomerDetails'));
const TicketHistory = lazy(() => import('./pages/TicketHistory'));

const AppRoutes = () => (
  <Router>
    <div className="App">
      <Suspense fallback={<Loader text="Loading..." />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/valyntixsignup" element={<Signup />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<RoleBasedDashboard />} />
            <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
            <Route path="branches" element={<AdminOnly><Branches /></AdminOnly>} />
            <Route path="tickets" element={<Tickets />} />
            <Route path="sales" element={<Sales />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="summary" element={<AdminOnly><Summary /></AdminOnly>} />
            <Route path="customers" element={<AdminOnly><CustomerDetails /></AdminOnly>} />
            <Route path="ticket-history" element={<TicketHistory />} />
            <Route path="settings" element={<AdminOnly><Settings /></AdminOnly>} />
            <Route path="backup" element={<AdminOnly><BackupRestore /></AdminOnly>} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  </Router>
);

const getSessionToken = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
};

const ProtectedRoute = ({ children }) => {
  const token = getSessionToken();
  return token ? children : <Navigate to="/login" />;
};

const RoleBasedDashboard = () => {
  const { user, loading, token } = useApp();
  
  if (loading || (token && !user)) {
    return <Loader text="Loading dashboard..." />;
  }

  if (user?.role === 'admin') {
    return <Dashboard />;
  }

  return <Navigate to="/tickets" replace />;
};

const AdminOnly = ({ children }) => {
  const { user } = useApp();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};

const LanguageBootstrap = ({ children }) => {
  const { currentBranch, token } = useApp();
  const { changeLanguage } = useLanguage();

  useEffect(() => {
    if (!currentBranch || !token) return;
    let cancelled = false;
    const loadLanguage = async () => {
      try {
        const response = await settingsAPI.getByBranch(currentBranch._id);
        const lang = response.data?.settings?.defaultLanguage;
        if (lang && !cancelled) {
          changeLanguage(lang);
        }
      } catch (error) {
        console.error('Error loading language from settings:', error);
      }
    };
    loadLanguage();
    return () => {
      cancelled = true;
    };
  }, [currentBranch, token, changeLanguage]);

  useEffect(() => {
    const handler = (event) => {
      const newLang = event.detail?.language;
      if (newLang) {
        changeLanguage(newLang);
      }
    };
    window.addEventListener('languageUpdated', handler);
    return () => window.removeEventListener('languageUpdated', handler);
  }, [changeLanguage]);

  return children;
};

const AppProviders = () => (
  <LanguageProvider>
    <AppProvider>
      <LanguageBootstrap>
        <AppRoutes />
      </LanguageBootstrap>
    </AppProvider>
  </LanguageProvider>
);

export default AppProviders;