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


import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Loader from './components/Loader';
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

function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  );
}

const getSessionToken = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem('token');
};

const ProtectedRoute = ({ children }) => {
  const token = getSessionToken();
  return token ? children : <Navigate to="/login" />;
};

const RoleBasedDashboard = () => {
  const { user } = useApp();
  if (user?.role === 'admin') {
    return <Dashboard />;
  }
  return <Navigate to="/tickets" replace />;
};

const AdminOnly = ({ children }) => {
  const { user } = useApp();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};

export default App;