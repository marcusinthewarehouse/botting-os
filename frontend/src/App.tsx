import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Proxies from './pages/Proxies';
import Accounts from './pages/Accounts';
import Profit from './pages/Profit';
import Settings from './pages/Settings';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen bg-slate-900">
        <Sidebar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/proxies" element={<Proxies />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/profit" element={<Profit />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
