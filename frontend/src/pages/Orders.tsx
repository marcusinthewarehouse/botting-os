import React, { useState } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useStore } from '../store';

const Orders: React.FC = () => {
  const store = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');

  const filteredOrders = store.orders.filter(o => {
    const statusMatch = filterStatus === 'all' || o.status === filterStatus;
    const storeMatch = filterStore === 'all' || o.store === filterStore;
    return statusMatch && storeMatch;
  });

  const totalProfit = filteredOrders.reduce((a, b) => a + b.profit, 0);
  const successCount = filteredOrders.filter(o => o.status === 'success').length;
  const stores = [...new Set(store.orders.map(o => o.store))];

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Orders</h1>
          <p className="text-slate-400">{filteredOrders.length} orders • ${totalProfit} profit</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card title="Total Orders" value={filteredOrders.length} subtitle="Filtered" />
          <Card title="Total Profit" value={`$${totalProfit}`} subtitle={`Avg: $${filteredOrders.length > 0 ? Math.round(totalProfit / filteredOrders.length) : 0}`} color="green" />
          <Card title="Successful" value={successCount} subtitle={filteredOrders.length > 0 ? `${Math.round((successCount / filteredOrders.length) * 100)}%` : '0%'} color="green" />
          <Card title="Failed" value={filteredOrders.filter(o => o.status === 'failed').length} subtitle="Needs review" color="red" />
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-6">Filters</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Status</label>
              <div className="flex gap-3 flex-wrap">
                {['all', 'success', 'pending', 'failed'].map((status) => (
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

        {/* Orders Table */}
        <Table
          title={`${filteredOrders.length} Orders`}
          columns={[
            { key: 'store', label: 'Store' },
            { key: 'product', label: 'Product' },
            { key: 'size', label: 'Size' },
            { key: 'price', label: 'Price', render: (v) => `$${v}` },
            { key: 'profit', label: 'Profit', render: (v) => <span className="font-semibold text-emerald-400">${v}</span> },
            { 
              key: 'status', 
              label: 'Status', 
              render: (v, row: any) => (
                <div className="flex items-center gap-2">
                  <Badge status={v} />
                  {row.failureReason && <span className="text-xs text-red-300">({row.failureReason})</span>}
                </div>
              )
            },
            { key: 'timestamp', label: 'Time' },
          ]}
          data={filteredOrders}
        />
      </div>
    </div>
  );
};

export default Orders;
