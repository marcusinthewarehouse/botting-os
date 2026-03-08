'use client';

import { cn } from '@/lib/utils';

interface PageHeaderAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline';
  icon?: React.ReactNode;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: PageHeaderAction[];
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between mb-6', className)}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {description && (
          <p className="text-sm text-zinc-400 mt-1">{description}</p>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                action.variant === 'outline'
                  ? 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                  : 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
