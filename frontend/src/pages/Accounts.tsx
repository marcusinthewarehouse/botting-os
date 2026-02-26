import React, { useState } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useStore } from '../store';

const Accounts: React.FC = () => {
  const store = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');

  const filteredAccounts = store.accounts.filter(a => {
    const statusMatch = filterStatus === 'all' || a.status === filterStatus;
    const storeMatch = filterStore === 'all' || a.store === filterStore;
    return statusMatch && storeMatch;
  });

  const activeCount = store.accounts.filter(a => a.status === 'active').length;
  const deadCount = store.accounts.filter(a => a.status === 'dead').length;
  const flaggedCount = store.accounts.filter(a => a.restrictions === 'flagged').length;
  const avgHealth = (store.accounts.reduce((a, b) => a + b.healthScore, 0) / store.accounts.length).toFixed(0);
  const stores = [...new Set(store.accounts.map(a => a.store))];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Accounts</h1>
          <p className="text-slate-400">{store.accounts.length} accounts • {activeCount} active</p>
        </div>

        {/* Account Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card title="Active" value={activeCount} color="green" icon="✅" />
          <Card title="Dead" value={deadCount} color="red" icon="💀" />
          <Card title="Flagged" value={flaggedCount} color="yellow" icon="⚠️" />
          <Card title="Avg Health" value={`${avgHealth}%`} subtitle="Overall" />
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-6">Filters</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Status</label>
              <div className="flex gap-3 flex-wrap">
                {['all', 'active', 'dead'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filterStatus === status
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Store</label>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setFilterStore('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterStore === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  All Stores
                </button>
                {stores.map((store) => (
                  <button
                    key={store}
                    onClick={() => setFilterStore(store)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filterStore === store
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {store}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Accounts Table */}
        <Table
          title={`${filteredAccounts.length} Accounts`}
          columns={[
            { key: 'email', label: 'Email' },
            { key: 'store', label: 'Store' },
            { key: 'age', label: 'Age (days)' },
            { 
              key: 'healthScore', 
              label: 'Health',
              render: (v) => {
                let color = 'bg-emerald-900 text-emerald-300';
                if (v < 50) color = 'bg-red-900 text-red-300';
                else if (v < 80) color = 'bg-yellow-900 text-yellow-300';
                return <span className={`px-3 py-1.5 rounded-lg ${color} text-sm font-semibold`}>{v}%</span>;
              }
            },
            { 
              key: 'restrictions', 
              label: 'Restrictions', 
              render: (v) => v === 'none' ? <span className="text-slate-400 text-sm">None</span> : <Badge status="yellow" label={v} size="sm" />
            },
            { 
              key: 'status', 
              label: 'Status', 
              render: (v) => <Badge status={v === 'active' ? 'active' : 'banned'} />
            },
          ]}
          data={filteredAccounts}
        />

        {/* Health Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <h3 className="text-lg font-semibold text-white mb-4">Healthy (90+%)</h3>
            <p className="text-emerald-400 text-2xl font-bold">
              {store.accounts.filter(a => a.healthScore >= 90).length}
            </p>
            <p className="text-slate-400 text-sm mt-2">Performing well</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <h3 className="text-lg font-semibold text-white mb-4">At Risk (50-89%)</h3>
            <p className="text-yellow-400 text-2xl font-bold">
              {store.accounts.filter(a => a.healthScore >= 50 && a.healthScore < 90).length}
            </p>
            <p className="text-slate-400 text-sm mt-2">Monitor closely</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition">
            <h3 className="text-lg font-semibold text-white mb-4">Critical (&lt;50%)</h3>
            <p className="text-red-400 text-2xl font-bold">
              {store.accounts.filter(a => a.healthScore < 50).length}
            </p>
            <p className="text-slate-400 text-sm mt-2">Action required</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounts;
