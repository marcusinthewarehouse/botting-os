'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Drop } from '@/lib/db/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const categoryDotColors: Record<string, string> = {
  sneakers: 'bg-blue-400',
  pokemon: 'bg-yellow-400',
  funko: 'bg-purple-400',
  supreme: 'bg-red-400',
  electronics: 'bg-cyan-400',
  'trading cards': 'bg-orange-400',
  other: 'bg-zinc-400',
};

function getDotColor(category: string | null): string {
  return categoryDotColors[category ?? 'other'] ?? categoryDotColors.other;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface MonthViewProps {
  year: number;
  month: number;
  drops: Drop[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: Date) => void;
  onDropClick: (drop: Drop) => void;
  selectedDate: Date | null;
}

export function MonthView({
  year,
  month,
  drops,
  onPrevMonth,
  onNextMonth,
  onDayClick,
  onDropClick,
  selectedDate,
}: MonthViewProps) {
  const today = useMemo(() => new Date(), []);

  const { weeks, monthLabel } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const label = firstDay.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const allWeeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];

    for (let i = 0; i < startOffset; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      allWeeks.push(currentWeek);
    }

    return { weeks: allWeeks, monthLabel: label };
  }, [year, month]);

  const dropsByDay = useMemo(() => {
    const map = new Map<number, Drop[]>();
    for (const drop of drops) {
      if (!drop.dropDate) continue;
      const d = new Date(drop.dropDate);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        const existing = map.get(day) ?? [];
        existing.push(drop);
        map.set(day, existing);
      }
    }
    return map;
  }, [drops, month, year]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-150"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h2 className="text-base font-medium text-zinc-50">{monthLabel}</h2>
        <button
          onClick={onNextMonth}
          className="p-2 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-150"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-white/[0.06] rounded-lg overflow-hidden border border-white/[0.06]">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-zinc-900 px-2 py-2 text-center text-xs font-medium text-zinc-500"
          >
            {day}
          </div>
        ))}

        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${wi}-${di}`}
                  className="bg-zinc-950 min-h-20"
                />
              );
            }

            const cellDate = new Date(year, month, day);
            const isToday = isSameDay(cellDate, today);
            const isPast = cellDate < today && !isToday;
            const isSelected = selectedDate ? isSameDay(cellDate, selectedDate) : false;
            const dayDrops = dropsByDay.get(day) ?? [];

            return (
              <button
                key={`day-${day}`}
                onClick={() => onDayClick(cellDate)}
                className={cn(
                  'bg-zinc-950 min-h-20 p-2 text-left transition-colors duration-150 hover:bg-zinc-900',
                  isToday && 'ring-1 ring-inset ring-amber-500/50',
                  isSelected && 'bg-zinc-900',
                  isPast && 'opacity-50'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-mono tabular-nums',
                    isToday ? 'text-amber-500 font-semibold' : 'text-zinc-400'
                  )}
                >
                  {day}
                </span>
                {dayDrops.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {dayDrops.slice(0, 3).map((drop) => (
                      <button
                        key={drop.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDropClick(drop);
                        }}
                        className={cn(
                          'size-2 rounded-full transition-transform duration-150 hover:scale-150',
                          getDotColor(drop.category)
                        )}
                        title={drop.productName}
                      />
                    ))}
                    {dayDrops.length > 3 && (
                      <span className="text-[10px] text-zinc-500 font-mono">
                        +{dayDrops.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
