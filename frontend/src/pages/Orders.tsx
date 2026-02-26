import React, { useState } from 'react';
import Table from '../components/Table';
import Badge from '../components/Badge';
import Card from '../components/Card';
import { useStore } from '../store';

const Orders: React.FC = () => {
  const store = useStore();
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOrders = filterStatus === 'all' 
    ? store.orders 
    : store.orders.filter(o => o.status === filterStatus);

  const totalProfit = filteredOrders.reduce((a, b) => a + b.profit, 0);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Orders</h1>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition">
            + New Order
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card title="Total Orders" value={store.orders.length} subtitle="All time" />
          <Card title="Today's Profit" value={`$${totalProfit}`} subtitle={`${filteredOrders.length} orders`} color="green" />
          <Card title="Success Rate" value="87%" subtitle="All statuses" color="green" />
        </div>

        {/* Filters */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">Filters</h3>
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

        {/* Orders Table */}
        <Table
          title={`${filteredOrders.length} Orders`}
          columns={[
            { key: 'id', label: 'ID' },
            { key: 'store', label: 'Store' },
            { key: 'product', label: 'Product' },
            { key: 'size', label: 'Size' },
            { key: 'price', label: 'Price', render: (v) => `$${v}` },
            { key: 'profit', label: 'Profit', render: (v) => `$${v}` },
            { 
              key: 'status', 
              label: 'Status', 
              render: (v) => <Badge status={v} />
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
