import React from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useStore } from '../store';

const Proxies: React.FC = () => {
  const store = useStore();
  const healthyProxies = store.proxies.filter(p => p.health === 'green').length;
  const warningProxies = store.proxies.filter(p => p.health === 'yellow').length;
  const deadProxies = store.proxies.filter(p => p.health === 'red').length;

  const avgUptime = (store.proxies.reduce((a, b) => a + b.uptime, 0) / store.proxies.length).toFixed(1);
  const avgResponseTime = store.proxies
    .filter(p => p.responseTime !== null)
    .reduce((a, b) => a + (b.responseTime || 0), 0) / store.proxies.filter(p => p.responseTime !== null).length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Proxies</h1>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition">
            + Add Proxy
          </button>
        </div>

        {/* Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card title="Healthy" value={healthyProxies} color="green" icon="✅" />
          <Card title="Warning" value={warningProxies} color="yellow" icon="⚠️" />
          <Card title="Dead" value={deadProxies} color="red" icon="❌" />
          <Card title="Avg Uptime" value={`${avgUptime}%`} subtitle="Last 30 days" />
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Avg Response Time</p>
            <p className="text-3xl font-bold text-slate-100">{Math.round(avgResponseTime)}ms</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-400 text-sm mb-2">Total Proxies</p>
            <p className="text-3xl font-bold text-slate-100">{store.proxies.length}</p>
          </div>
        </div>

        {/* Proxies Table */}
        <Table
          title="Proxy Status"
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'ip', label: 'IP Address' },
            { 
              key: 'health', 
              label: 'Health', 
              render: (v) => <Badge status={v} />
            },
            { key: 'uptime', label: 'Uptime', render: (v) => `${v}%` },
            { key: 'responseTime', label: 'Response Time', render: (v) => v ? `${v}ms` : 'N/A' },
            { key: 'lastChecked', label: 'Last Checked' },
          ]}
          data={store.proxies}
        />

        {/* Health Legend */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Health Indicators</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <Badge status="green" label="Green - Healthy" />
              <p className="text-slate-400 text-sm mt-2">99%+ uptime, low latency</p>
            </div>
            <div>
              <Badge status="yellow" label="Yellow - Warning" />
              <p className="text-slate-400 text-sm mt-2">80-99% uptime, elevated latency</p>
            </div>
            <div>
              <Badge status="red" label="Red - Dead" />
              <p className="text-slate-400 text-sm mt-2">No connectivity</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Proxies;
