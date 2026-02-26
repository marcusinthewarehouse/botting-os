import React, { useState } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useStore } from '../store';

const Proxies: React.FC = () => {
  const store = useStore();
  const [testingProxies, setTestingProxies] = useState<number[]>([]);

  const healthyProxies = store.proxies.filter(p => p.health === 'green').length;
  const warningProxies = store.proxies.filter(p => p.health === 'yellow').length;
  const deadProxies = store.proxies.filter(p => p.health === 'red').length;

  const avgUptime = (store.proxies.reduce((a, b) => a + b.uptime, 0) / store.proxies.length).toFixed(1);
  const avgResponseTime = store.proxies
    .filter(p => p.responseTime !== null)
    .reduce((a, b) => a + (b.responseTime || 0), 0) / store.proxies.filter(p => p.responseTime !== null).length;

  const handleTestProxy = (id: number) => {
    setTestingProxies([...testingProxies, id]);
    setTimeout(() => {
      setTestingProxies(testingProxies.filter(p => p !== id));
    }, 2000);
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Proxies</h1>
          <p className="text-slate-400">{store.proxies.length} proxies • {healthyProxies} healthy</p>
        </div>

        {/* Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card title="Healthy" value={healthyProxies} color="green" icon="✅" />
          <Card title="Warning" value={warningProxies} color="yellow" icon="⚠️" />
          <Card title="Dead" value={deadProxies} color="red" icon="🔴" />
          <Card title="Avg Uptime" value={`${avgUptime}%`} subtitle="All time" />
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <p className="text-slate-400 text-sm mb-2">Avg Response Time</p>
            <p className="text-3xl font-bold text-cyan-400">{Math.round(avgResponseTime)}ms</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <p className="text-slate-400 text-sm mb-2">Total Proxies</p>
            <p className="text-3xl font-bold text-white">{store.proxies.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <p className="text-slate-400 text-sm mb-2">Health Score</p>
            <p className="text-3xl font-bold text-emerald-400">{Math.round((healthyProxies / store.proxies.length) * 100)}%</p>
          </div>
        </div>

        {/* Proxies Table */}
        <Table
          title="Proxy Status"
          columns={[
            { key: 'ip', label: 'IP Address', render: (v, row: any) => `${v}:${row.port}` },
            { key: 'location', label: 'Location' },
            { 
              key: 'health', 
              label: 'Health', 
              render: (v) => <Badge status={v} />
            },
            { key: 'uptime', label: 'Uptime', render: (v) => <span className={v > 95 ? 'text-emerald-400' : v > 80 ? 'text-yellow-400' : 'text-red-400'}>{v}%</span> },
            { key: 'responseTime', label: 'Response Time', render: (v) => v ? <span className={v < 100 ? 'text-emerald-400' : 'text-yellow-400'}>{v}ms</span> : 'Offline' },
            { 
              key: 'id', 
              label: 'Actions', 
              render: (id) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestProxy(id)}
                    disabled={testingProxies.includes(id)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      testingProxies.includes(id)
                        ? 'bg-slate-600 text-slate-400'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {testingProxies.includes(id) ? 'Testing...' : 'Test'}
                  </button>
                  <button className="px-3 py-1 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition">
                    Delete
                  </button>
                </div>
              )
            },
          ]}
          data={store.proxies}
        />

        {/* Health Legend */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Health Status Guide</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">✓</div>
              <div>
                <h4 className="font-semibold text-white">Healthy (Green)</h4>
                <p className="text-sm text-slate-400">99%+ uptime, response &lt;100ms</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg bg-yellow-600 flex items-center justify-center text-white font-bold">!</div>
              <div>
                <h4 className="font-semibold text-white">Warning (Yellow)</h4>
                <p className="text-sm text-slate-400">80-99% uptime, response &gt;100ms</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white font-bold">✕</div>
              <div>
                <h4 className="font-semibold text-white">Dead (Red)</h4>
                <p className="text-sm text-slate-400">No connectivity or 0% uptime</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Proxies;
