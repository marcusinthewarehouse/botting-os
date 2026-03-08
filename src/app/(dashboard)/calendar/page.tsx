"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, List, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageTransition } from "@/components/page-transition";
import { EmptyState } from "@/components/ui/empty-state";
import { CalendarSkeleton } from "@/components/skeletons/calendar-skeleton";
import { Card } from "@/components/ui/card";
import { MonthView } from "@/components/calendar/month-view";
import { ListView } from "@/components/calendar/list-view";
import { DropForm } from "@/components/calendar/drop-form";
import type { DropFormData } from "@/components/calendar/drop-form";
import { dropsRepo } from "@/lib/db/repositories";
import { IS_TAURI } from "@/lib/db/client";
import type { Drop } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type ViewMode = "month" | "list";

export default function CalendarPage() {
  const [drops, setDrops] = useState<Drop[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [formOpen, setFormOpen] = useState(false);
  const [editDrop, setEditDrop] = useState<Drop | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const loadDrops = useCallback(async () => {
    if (!IS_TAURI) {
      setLoaded(true);
      return;
    }
    try {
      const all = await dropsRepo.getAll();
      setDrops(all);
    } catch {
      // DB not available yet
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadDrops();
  }, [loadDrops]);

  const handlePrevMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleDropClick = useCallback((drop: Drop) => {
    setEditDrop(drop);
    setFormOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setEditDrop(null);
    setFormOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: DropFormData) => {
      try {
        if (editDrop) {
          await dropsRepo.update(editDrop.id, {
            productName: data.productName,
            brand: data.brand || null,
            retailer: data.retailer || null,
            category: data.category,
            dropDate: data.dropDate,
            dropTime: data.dropTime || null,
            url: data.url || null,
            notes: data.notes || null,
            reminderMinutes: data.reminderMinutes,
            reminded: false,
          });
        } else {
          await dropsRepo.create({
            productName: data.productName,
            brand: data.brand || null,
            retailer: data.retailer || null,
            category: data.category,
            dropDate: data.dropDate,
            dropTime: data.dropTime || null,
            url: data.url || null,
            notes: data.notes || null,
            reminderMinutes: data.reminderMinutes,
            reminded: false,
            source: "manual",
          });
        }
        await loadDrops();
      } catch {
        // DB not available
      }
    },
    [editDrop, loadDrops],
  );

  const handleDelete = useCallback(async () => {
    if (!editDrop) return;
    try {
      await dropsRepo.remove(editDrop.id);
      setEditDrop(null);
      await loadDrops();
    } catch {
      // DB not available
    }
  }, [editDrop, loadDrops]);

  const selectedDayDrops = useMemo(() => {
    if (!selectedDate) return [];
    return drops.filter((d) => {
      if (!d.dropDate) return false;
      const dd = new Date(d.dropDate);
      return (
        dd.getFullYear() === selectedDate.getFullYear() &&
        dd.getMonth() === selectedDate.getMonth() &&
        dd.getDate() === selectedDate.getDate()
      );
    });
  }, [drops, selectedDate]);

  return (
    <PageTransition>
      <PageHeader
        title="Drop Calendar"
        actions={[
          {
            label: "Add Drop",
            onClick: handleAddClick,
            icon: <Plus className="size-4" />,
          },
        ]}
      />

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-4 p-1 bg-card rounded-lg w-fit border border-border">
        <button
          onClick={() => setViewMode("month")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
            viewMode === "month"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-muted-foreground",
          )}
        >
          <CalendarDays className="size-3.5" />
          Month
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
            viewMode === "list"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-muted-foreground",
          )}
        >
          <List className="size-3.5" />
          List
        </button>
      </div>

      {!loaded ? (
        <CalendarSkeleton />
      ) : drops.length === 0 ? (
        <Card className="bg-black border-border">
          <EmptyState
            icon={CalendarDays}
            title="No drops yet"
            description="Add your first product drop to start tracking upcoming releases."
            action={{ label: "Add Drop", onClick: handleAddClick }}
          />
        </Card>
      ) : viewMode === "month" ? (
        <div className="space-y-4">
          <Card className="bg-black border-border p-4">
            <MonthView
              year={year}
              month={month}
              drops={drops}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onDayClick={handleDayClick}
              onDropClick={handleDropClick}
              selectedDate={selectedDate}
            />
          </Card>

          {selectedDate && (
            <Card className="bg-black border-border p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              {selectedDayDrops.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No drops on this day.
                </p>
              ) : (
                <ListView
                  drops={selectedDayDrops}
                  onDropClick={handleDropClick}
                />
              )}
            </Card>
          )}
        </div>
      ) : (
        <Card className="bg-black border-border p-4">
          <ListView drops={drops} onDropClick={handleDropClick} />
        </Card>
      )}

      <DropForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditDrop(null);
        }}
        onSubmit={handleFormSubmit}
        onDelete={editDrop ? handleDelete : undefined}
        editDrop={editDrop}
      />
    </PageTransition>
  );
}
