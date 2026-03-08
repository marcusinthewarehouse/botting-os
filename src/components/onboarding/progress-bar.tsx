'use client';

import { cn } from '@/lib/utils';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function ProgressBar({ currentStep, totalSteps, stepLabels }: ProgressBarProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'size-8 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors duration-200',
                  isCompleted && 'bg-amber-500 border-amber-500 text-zinc-950',
                  isCurrent && 'border-amber-500 bg-amber-500/15 text-amber-500',
                  !isCompleted && !isCurrent && 'border-zinc-700 text-zinc-500'
                )}
              >
                {isCompleted ? (
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 whitespace-nowrap',
                  isCurrent ? 'text-zinc-200' : 'text-zinc-500'
                )}
              >
                {stepLabels[i]}
              </span>
            </div>
            {i < totalSteps - 1 && (
              <div
                className={cn(
                  'w-16 sm:w-24 h-0.5 mx-2 mb-6 transition-colors duration-200',
                  i < currentStep ? 'bg-amber-500' : 'bg-zinc-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
