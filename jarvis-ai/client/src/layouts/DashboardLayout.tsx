import React from 'react';
import { Outlet } from 'react-router-dom';

export const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-jarvis-dark text-slate-100 flex flex-col">
      <Outlet />
    </div>
  );
};
