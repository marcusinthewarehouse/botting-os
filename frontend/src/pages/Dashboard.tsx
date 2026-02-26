import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import Table from '../components/Table';
import Badge from '../components/Badge';
import { useStore } from '../store';

const Dashboard: React.FC = () => {
  const store = useStore();
  const recentOrders = store.orders.slice(0, 5);

  const successCount = store.orders.filter(o => o.status === 'success').length;
  const failureCount = store.orders.filter(o => o.status === 'failed').length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Dashboard</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            title="Total Profit" 
            value={`$${store.totalProfit}`} 
            subtitle="This week"
            icon="💰"
            color="green"
          />
          <Card 
            title="Active Orders" 
            value={store.activeOrders} 
            subtitle="Last 24h"
            icon="📦"
            color="default"
          />
          <Card 
            title="Dead Proxies" 
            value={store.deadProxies} 
            subtitle="Needs attention"
            icon="🔴"
            color="red"
          />
          <Card 
            title="Success Rate" 
            value="87%" 
            subtitle="All stores"
            icon="✅"
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Profit Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={store.profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Orders by Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={store.profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Bar dataKey="orders" fill="#06b6d4" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <Table
          title="Recent Orders"
          columns={[
            { key: 'store', label: 'Store' },
            { key: 'product', label: 'Product' },
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

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-6 mt-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Successful Orders</p>
            <p className="text-2xl font-bold text-emerald-400">{successCount}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Failed Orders</p>
            <p className="text-2xl font-bold text-red-400">{failureCount}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Avg. Order Value</p>
            <p className="text-2xl font-bold text-slate-100">
              ${Math.round(store.orders.reduce((a, b) => a + b.profit, 0) / store.orders.length)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
