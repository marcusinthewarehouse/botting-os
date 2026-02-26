import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/Card';
import { useStore } from '../store';

const Profit: React.FC = () => {
  const store = useStore();
  
  const totalRevenue = store.orders.filter(o => o.status === 'success').reduce((a, b) => a + b.price, 0);
  const totalProfit = store.orders.filter(o => o.status === 'success').reduce((a, b) => a + b.profit, 0);
  const roi = ((totalProfit / totalRevenue) * 100).toFixed(1);
  const avgOrderProfit = (totalProfit / store.orders.filter(o => o.status === 'success').length).toFixed(2);

  const storeProfit = store.orders.reduce((acc: any, order) => {
    if (order.status === 'success') {
      const existing = acc.find((s: any) => s.store === order.store);
      if (existing) {
        existing.profit += order.profit;
        existing.orders += 1;
      } else {
        acc.push({ store: order.store, profit: order.profit, orders: 1 });
      }
    }
    return acc;
  }, []);

  const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444'];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-8">Profit & ROI</h1>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card title="Total Profit" value={`$${totalProfit}`} subtitle="All successful orders" color="green" icon="💰" />
          <Card title="Total Revenue" value={`$${totalRevenue}`} subtitle="Gross sales" />
          <Card title="ROI" value={`${roi}%`} subtitle="Return on investment" color="green" icon="📈" />
          <Card title="Avg Order Profit" value={`$${avgOrderProfit}`} subtitle="Per successful order" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Profit Over Time */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Weekly Profit Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={store.profitData}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Area type="monotone" dataKey="profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Profit by Store */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Profit by Store</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={storeProfit}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.store}: $${entry.profit}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="profit"
                >
                  {storeProfit.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Stats */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Daily Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={store.profitData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Legend />
              <Bar dataKey="profit" fill="#10b981" name="Profit ($)" />
              <Bar dataKey="orders" fill="#06b6d4" name="Orders (#)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Store Performance */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Store Profitability</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-700">
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Store</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Total Profit</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Orders</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Avg Profit/Order</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {storeProfit.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-700 transition">
                    <td className="px-6 py-4 text-sm text-slate-300">{item.store}</td>
                    <td className="px-6 py-4 text-sm text-emerald-400 font-medium">${item.profit}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{item.orders}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">${(item.profit / item.orders).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{((item.profit / totalProfit) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profit;
