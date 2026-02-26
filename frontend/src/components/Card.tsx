import React from 'react';

interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'default' | 'green' | 'red' | 'yellow';
}

const Card: React.FC<CardProps> = ({ title, value, subtitle, icon, color = 'default' }) => {
  const colorClasses = {
    default: 'bg-slate-800',
    green: 'bg-emerald-900 border-emerald-700',
    red: 'bg-red-900 border-red-700',
    yellow: 'bg-yellow-900 border-yellow-700',
  };

  return (
    <div className={`${colorClasses[color]} border border-slate-700 rounded-lg p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-slate-100">{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
        {icon && <span className="text-3xl">{icon}</span>}
      </div>
    </div>
  );
};

export default Card;
