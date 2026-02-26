import React from 'react';

interface BadgeProps {
  status: 'success' | 'pending' | 'failed' | 'active' | 'inactive' | 'banned' | 'green' | 'yellow' | 'red';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Badge: React.FC<BadgeProps> = ({ status, label, size = 'md' }) => {
  const statusConfig = {
    success: { bg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-700' },
    pending: { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-700' },
    failed: { bg: 'bg-red-900', text: 'text-red-300', border: 'border-red-700' },
    active: { bg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-700' },
    inactive: { bg: 'bg-slate-700', text: 'text-slate-300', border: 'border-slate-600' },
    banned: { bg: 'bg-red-900', text: 'text-red-300', border: 'border-red-700' },
    green: { bg: 'bg-emerald-900', text: 'text-emerald-300', border: 'border-emerald-700' },
    yellow: { bg: 'bg-yellow-900', text: 'text-yellow-300', border: 'border-yellow-700' },
    red: { bg: 'bg-red-900', text: 'text-red-300', border: 'border-red-700' },
  };

  const config = statusConfig[status];
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-block ${sizeClasses[size]} ${config.bg} ${config.text} ${config.border} border rounded-full font-medium`}>
      {displayLabel}
    </span>
  );
};

export default Badge;
