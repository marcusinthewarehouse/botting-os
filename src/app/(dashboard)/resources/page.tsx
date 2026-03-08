"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, BookOpen, Trash2 } from "lucide-react";
import { PageTransition } from "@/components/page-transition";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceForm } from "@/components/resources/resource-form";
import * as resourcesRepo from "@/lib/db/repositories/resources";
import type { Resource } from "@/lib/db/types";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = [
  "All",
  "Getting Started",
  "Bots",
  "Proxies",
  "Cook Groups",
  "Marketplaces",
  "Tools",
  "Education",
  "Other",
] as const;

function openLink(url: string) {
  window.open(url, "_blank");
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadResources = useCallback(async () => {
    try {
      await resourcesRepo.seedIfEmpty();
      const all = await resourcesRepo.getAll();
      setResources(all);
    } catch {
      setResources([]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const filtered = useMemo(() => {
    let result = resources;

    if (activeCategory !== "All") {
      result = result.filter((r) => r.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description?.toLowerCase().includes(q) ?? false),
      );
    }

    return result;
  }, [resources, activeCategory, search]);

  const handleCreate = useCallback(
    async (data: {
      name: string;
      url: string;
      description?: string;
      category: string;
    }) => {
      await resourcesRepo.create({ ...data, isCustom: true });
      await loadResources();
    },
    [loadResources],
  );

  const handleUpdate = useCallback(
    async (data: {
      name: string;
      url: string;
      description?: string;
      category: string;
    }) => {
      if (!editingResource) return;
      await resourcesRepo.update(editingResource.id, data);
      setEditingResource(null);
      await loadResources();
    },
    [editingResource, loadResources],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (deleteConfirm === id) {
        await resourcesRepo.remove(id);
        setDeleteConfirm(null);
        await loadResources();
      } else {
        setDeleteConfirm(id);
        setTimeout(() => setDeleteConfirm(null), 3000);
      }
    },
    [deleteConfirm, loadResources],
  );

  if (!loaded) {
    return (
      <PageTransition>
        <PageHeader
          title="Resources"
          description="Curated links and tools for botting"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-4 space-y-3 animate-pulse"
            >
              <div className="size-8 rounded-md bg-muted" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted/50 rounded w-full" />
              <div className="h-5 bg-muted/30 rounded w-20" />
            </div>
          ))}
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Resources"
        description="Curated links and tools for botting"
        actions={[
          {
            label: "Add Link",
            onClick: () => setFormOpen(true),
            icon: <Plus className="size-4" />,
          },
        ]}
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search links..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          /
        </kbd>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
              activeCategory === cat
                ? "bg-primary/15 text-primary border border-primary/25"
                : "bg-card text-muted-foreground border border-border hover:bg-muted hover:text-muted-foreground",
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Resource grid */}
      {resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No resources yet"
          description="Add links to bots, proxies, cook groups, and more."
          action={{ label: "Add Link", onClick: () => setFormOpen(true) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description={
            activeCategory !== "All"
              ? `No resources found in "${activeCategory}". Try another category or search term.`
              : "Try a different search term."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((resource) => (
            <div key={resource.id} className="relative">
              <ResourceCard
                resource={resource}
                onOpen={openLink}
                onEdit={
                  resource.isCustom
                    ? () => setEditingResource(resource)
                    : undefined
                }
                onDelete={
                  resource.isCustom
                    ? () => handleDelete(resource.id)
                    : undefined
                }
              />
              {deleteConfirm === resource.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(resource.id)}
                  className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-medium backdrop-blur-sm transition-colors duration-150 hover:bg-red-500/20"
                >
                  <Trash2 className="size-3.5" />
                  Click again to delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {resources.length > 0 && (
        <p className="text-xs text-muted-foreground mt-6">
          {filtered.length} of {resources.length} resource
          {resources.length !== 1 ? "s" : ""}
          {activeCategory !== "All" ? ` in ${activeCategory}` : ""}
        </p>
      )}

      {/* Add form */}
      <ResourceForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
      />

      {/* Edit form */}
      {editingResource && (
        <ResourceForm
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingResource(null);
          }}
          onSubmit={handleUpdate}
          initialValues={{
            name: editingResource.name,
            url: editingResource.url,
            description: editingResource.description ?? undefined,
            category: editingResource.category,
          }}
          isEditing
        />
      )}
    </PageTransition>
  );
}
