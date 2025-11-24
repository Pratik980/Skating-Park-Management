import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout = () => {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className={`main-content`}>
        <Navbar 
          onToggleSidebar={() => {}} 
          isSidebarCollapsed={false} 
        />
        <div className="content-area">
          <div className="page-offset">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Layout;