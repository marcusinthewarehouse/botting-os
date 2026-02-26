import React, { useState } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useStore } from '../store';

const Accounts: React.FC = () => {
  const store = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredAccounts = filterStatus === 'all'
    ? store.accounts
    : store.accounts.filter(a => a.status === filterStatus);

  const activeCount = store.accounts.filter(a => a.status === 'active').length;
  const inactiveCount = store.accounts.filter(a => a.status === 'inactive').length;
  const bannedCount = store.accounts.filter(a => a.status === 'banned').length;
  const avgHealth = (store.accounts.reduce((a, b) => a + b.health, 0) / store.accounts.length).toFixed(0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Accounts</h1>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition">
            + Add Account
          </button>
        </div>

        {/* Account Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card title="Active" value={activeCount} color="green" icon="✅" />
          <Card title="Inactive" value={inactiveCount} subtitle="Needs review" />
          <Card title="Banned" value={bannedCount} color="red" icon="🔒" />
          <Card title="Avg Health" value={`${avgHealth}%`} subtitle="All accounts" color="green" />
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Filter by Status</h3>
          <div className="flex gap-3 flex-wrap">
            {['all', 'active', 'inactive', 'banned'].map((status) => (
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

        {/* Accounts Table */}
        <Table
          title={`${filteredAccounts.length} Accounts`}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'Bot Name' },
            { key: 'store', label: 'Store' },
            { 
              key: 'status', 
              label: 'Status', 
              render: (v) => <Badge status={v} />
            },
            { 
              key: 'health', 
              label: 'Health',
              render: (v) => {
                let color = 'bg-emerald-900 text-emerald-300';
                if (v < 50) color = 'bg-red-900 text-red-300';
                else if (v < 80) color = 'bg-yellow-900 text-yellow-300';
                return <span className={`px-3 py-1 rounded ${color} text-sm font-medium`}>{v}%</span>;
              }
            },
            { key: 'orders', label: 'Orders' },
            { key: 'successRate', label: 'Success Rate', render: (v) => `${v}%` },
          ]}
          data={filteredAccounts}
        />

        {/* Health Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Top Performer</h3>
            {store.accounts.sort((a, b) => b.successRate - a.successRate)[0] && (
              <div>
                <p className="text-slate-300 font-medium">
                  {store.accounts.sort((a, b) => b.successRate - a.successRate)[0].name}
                </p>
                <p className="text-emerald-400 text-2xl font-bold mt-2">
                  {store.accounts.sort((a, b) => b.successRate - a.successRate)[0].successRate}%
                </p>
              </div>
            )}
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Total Orders</h3>
            <p className="text-slate-300 text-2xl font-bold">
              {store.accounts.reduce((a, b) => a + b.orders, 0)}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Accounts Flagged</h3>
            <p className="text-red-400 text-2xl font-bold">
              {store.accounts.filter(a => a.health < 50).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Accounts;
