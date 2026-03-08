"use client";

import { useState, useCallback } from "react";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { toast, Toaster } from "sonner";
import { PageTransition } from "@/components/page-transition";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { useCheckoutFeed, formatPrice } from "@/hooks/use-checkout-feed";
import type { CheckoutEvent } from "@/hooks/use-checkout-feed";
import { OrderTable } from "@/components/orders/order-table";
import { WebhookSettings } from "@/components/orders/webhook-settings";

export default function OrdersPage() {
  const { user, loading: authLoading, signIn } = useSupabaseAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const onNewEvent = useCallback((event: CheckoutEvent) => {
    toast.success(`New checkout: ${event.product} - ${event.store}`, {
      description: `Size ${event.size ?? "-"} - ${formatPrice(event.price)}`,
    });
  }, []);

  const { events, loading: feedLoading } = useCheckoutFeed(user?.id ?? null, {
    onNewEvent,
  });

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const { error } = await signIn(loginEmail, loginPassword);
    if (error) setLoginError(error.message);
  }

  if (authLoading) {
    return (
      <PageTransition>
        <div className="space-y-4">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted/60 rounded animate-pulse" />
        </div>
      </PageTransition>
    );
  }

  if (!user) {
    return (
      <PageTransition>
        <div className="max-w-sm mx-auto mt-16 space-y-6">
          <div className="text-center">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground">
              Sign in to track orders
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your Supabase account to receive live checkout events.
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {loginError && <p className="text-xs text-red-400">{loginError}</p>}
            <button
              type="submit"
              className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-4">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Orders</h1>
          <span className="text-xs text-muted-foreground font-mono">
            {events.length} total
          </span>
        </div>

        {/* Webhook Settings - collapsible */}
        <div className="rounded-lg border border-border">
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-card/50 transition-colors rounded-lg"
          >
            <span>Webhook Settings</span>
            {settingsOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {settingsOpen && (
            <div className="px-4 pb-4">
              <WebhookSettings userId={user.id} />
            </div>
          )}
        </div>

        {/* Order Table or Empty State */}
        {!feedLoading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/60 mb-4" />
            <h3 className="text-sm font-medium text-muted-foreground">
              No orders yet
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Set up your webhook URL above to start tracking bot checkouts in
              real-time.
            </p>
            <button
              onClick={() => setSettingsOpen(true)}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Set Up Webhook
            </button>
          </div>
        ) : (
          <OrderTable events={events} loading={feedLoading} />
        )}
      </div>
    </PageTransition>
  );
}
