import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/Card';
import Table from '../components/Table';
import Badge from '../components/Badge';
import { useStore } from '../store';

const Dashboard: React.FC = () => {
  const store = useStore();
  const recentOrders = store.orders.slice(0, 5);

  const successCount = store.orders.filter(o => o.status === 'success').length;
  const failureCount = store.orders.filter(o => o.status === 'failed').length;
  const pendingCount = store.orders.filter(o => o.status === 'pending').length;
  const totalOrders = store.orders.length;
  const avgProfit = Math.round(store.orders.reduce((a, b) => a + b.profit, 0) / totalOrders);
  const successRate = Math.round((successCount / totalOrders) * 100);

  // Profit by store
  const profitByStore = [
    { name: 'Nike', value: 450, fill: '#3b82f6' },
    { name: 'Supreme', value: 410, fill: '#ef4444' },
    { name: 'eBay', value: 280, fill: '#8b5cf6' },
    { name: 'Foot Locker', value: 176, fill: '#10b981' },
    { name: 'Others', value: 220, fill: '#f59e0b' },
  ];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400 mb-8">Real-time botting operations overview</p>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            title="Profit This Week" 
            value={`$${store.totalProfit}`} 
            subtitle="7-day total"
            icon="💰"
            color="green"
          />
          <Card 
            title="Active Orders" 
            value={store.activeOrders} 
            subtitle="In progress"
            icon="📦"
            color="default"
          />
          <Card 
            title="Success Rate" 
            value={`${successRate}%`} 
            subtitle="All time"
            icon="✅"
            color="green"
          />
          <Card 
            title="Dead Proxies" 
            value={store.deadProxies} 
            subtitle="⚠️ Requires action"
            icon="🔴"
            color="red"
          />
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">🔴</span>
              <div>
                <h4 className="font-semibold text-red-200">Dead Proxies Detected</h4>
                <p className="text-sm text-red-300">1 proxy offline. Replace immediately</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h4 className="font-semibold text-yellow-200">Account Flagged</h4>
                <p className="text-sm text-yellow-300">acc3@gmail.com restricted</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">ℹ️</span>
              <div>
                <h4 className="font-semibold text-blue-200">High Activity</h4>
                <p className="text-sm text-blue-300">Peak orders on Sat: 35 orders</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <h3 className="text-lg font-semibold text-white mb-4">Profit Trend</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={store.profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <h3 className="text-lg font-semibold text-white mb-4">Revenue Split</h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={profitByStore} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                  {profitByStore.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <h3 className="text-lg font-semibold text-white mb-4">Orders by Day</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={store.profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #475569', borderRadius: '8px' }} />
                <Bar dataKey="orders" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
              <p className="text-slate-400 text-sm mb-1">Successful</p>
              <p className="text-2xl font-bold text-emerald-400">{successCount}</p>
              <p className="text-xs text-slate-500 mt-1">out of {totalOrders}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
              <p className="text-slate-400 text-sm mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-400">{failureCount}</p>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition">
              <p className="text-slate-400 text-sm mb-1">Avg Profit</p>
              <p className="text-2xl font-bold text-cyan-400">${avgProfit}</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <Table
          title="Recent Orders"
          columns={[
            { key: 'store', label: 'Store' },
            { key: 'product', label: 'Product' },
            { key: 'price', label: 'Price', render: (v) => `$${v}` },
            { key: 'profit', label: 'Profit', render: (v) => `$${v}` },
            { 
              key: 'status', 
              label: 'Status', 
              render: (v) => <Badge status={v} />
            },
            { key: 'timestamp', label: 'Time' },
          ]}
          data={recentOrders}
        />
      </div>
    </div>
  );
};

export default Dashboard;
