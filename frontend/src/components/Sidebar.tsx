import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar: React.FC = () => {
  const location = useLocation();
  
  const links = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/orders', label: 'Orders', icon: '📦' },
    { path: '/proxies', label: 'Proxies', icon: '🌐' },
    { path: '/accounts', label: 'Accounts', icon: '👤' },
    { path: '/profit', label: 'Profit & ROI', icon: '💰' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 p-4 flex flex-col h-full">
      <div className="text-2xl font-bold mb-8 text-emerald-400">
        ⚙️ Botting OS
      </div>
      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`block px-4 py-3 rounded-lg transition ${
              location.pathname === link.path
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="mr-2">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="text-xs text-slate-500 border-t border-slate-700 pt-4">
        Version 1.0-DEMO
      </div>
    </aside>
  );
};

export default Sidebar;
