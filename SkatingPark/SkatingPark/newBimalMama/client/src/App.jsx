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


import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import Users from './pages/Users';
import Branches from './pages/Branches';
import Tickets from './pages/Tickets';
import Sales from './pages/Sales';
import Expenses from './pages/Expenses';
import Summary from './pages/Summary';
import Settings from './pages/Settings';
import BackupRestore from './pages/BackupRestore';
import CustomerDetails from './pages/CustomerDetails';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} /> {/* Add this route */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<RoleBasedDashboard />} />
              <Route path="users" element={<AdminOnly><Users /></AdminOnly>} />
              <Route path="branches" element={<AdminOnly><Branches /></AdminOnly>} />
              <Route path="tickets" element={<Tickets />} />
              <Route path="sales" element={<Sales />} />
              <Route path="expenses" element={<Expenses />} />
              <Route path="summary" element={<Summary />} />
              <Route path="customers" element={<CustomerDetails />} />
              <Route path="settings" element={<AdminOnly><Settings /></AdminOnly>} />
              <Route path="backup" element={<AdminOnly><BackupRestore /></AdminOnly>} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const RoleBasedDashboard = () => {
  const { user } = useApp();
  return user?.role === 'admin' ? <Dashboard /> : <StaffDashboard />;
};

const AdminOnly = ({ children }) => {
  const { user } = useApp();
  return user?.role === 'admin' ? children : <Navigate to="/" />;
};

export default App;