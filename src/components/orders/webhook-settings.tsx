"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Copy, Plus, Trash2, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface WebhookToken {
  id: string;
  token: string;
  label: string | null;
  discord_forward_url: string | null;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

interface WebhookSettingsProps {
  userId: string | null;
}

const WEBHOOK_BASE_URL =
  "bottingos-webhook-proxy.bottingos.workers.dev/v1/webhooks";

export function WebhookSettings({ userId }: WebhookSettingsProps) {
  const [tokens, setTokens] = useState<WebhookToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingForwardUrl, setEditingForwardUrl] = useState<string | null>(
    null,
  );
  const [forwardUrlInput, setForwardUrlInput] = useState("");

  const fetchTokens = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("webhook_tokens")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTokens(data as WebhookToken[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  async function createToken() {
    if (!userId || creating) return;
    setCreating(true);
    const token = generateToken();
    const { error } = await supabase.from("webhook_tokens").insert({
      user_id: userId,
      token,
      label: newLabel || null,
      is_active: true,
    });
    if (!error) {
      setNewLabel("");
      await fetchTokens();
    }
    setCreating(false);
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase
      .from("webhook_tokens")
      .update({ is_active: !current })
      .eq("id", id);
    fetchTokens();
  }

  async function deleteToken(id: string) {
    await supabase.from("webhook_tokens").delete().eq("id", id);
    fetchTokens();
  }

  async function saveForwardUrl(id: string) {
    await supabase
      .from("webhook_tokens")
      .update({ discord_forward_url: forwardUrlInput || null })
      .eq("id", id);
    setEditingForwardUrl(null);
    fetchTokens();
  }

  function copyUrl(token: string, id: string) {
    navigator.clipboard.writeText(`https://${WEBHOOK_BASE_URL}/${token}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (!userId) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4">
        <p className="text-sm text-muted-foreground">
          Sign in to manage webhook tokens.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Webhook Tokens
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Label (optional)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-32"
          />
          <button
            onClick={createToken}
            disabled={creating}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            New Token
          </button>
        </div>
      </div>

      {tokens.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No tokens yet. Create one to start receiving bot checkouts.
        </p>
      ) : (
        <div className="space-y-2">
          {tokens.map((tok) => (
            <div
              key={tok.id}
              className={cn(
                "rounded-md border p-3 space-y-2",
                tok.is_active ? "border-border" : "border-border/50 opacity-60",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      tok.is_active ? "bg-green-500" : "bg-muted-foreground/50",
                    )}
                  />
                  <span className="text-sm text-muted-foreground">
                    {tok.label || "Untitled"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(tok.id, tok.is_active)}
                    className="rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground/80 hover:bg-muted transition-colors"
                  >
                    {tok.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    onClick={() => deleteToken(tok.id)}
                    className="rounded p-1 text-muted-foreground hover:text-red-400 hover:bg-muted transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground font-mono truncate">
                  https://{WEBHOOK_BASE_URL}/{tok.token}
                </code>
                <button
                  onClick={() => copyUrl(tok.token, tok.id)}
                  className="rounded p-1.5 text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                >
                  {copiedId === tok.id ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                {editingForwardUrl === tok.id ? (
                  <>
                    <input
                      type="text"
                      placeholder="Discord webhook URL"
                      value={forwardUrlInput}
                      onChange={(e) => setForwardUrlInput(e.target.value)}
                      className="flex-1 rounded-md border border-border bg-muted px-2 py-1 text-xs text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <button
                      onClick={() => saveForwardUrl(tok.id)}
                      className="rounded px-2 py-1 text-xs text-primary hover:bg-muted transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingForwardUrl(null)}
                      className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setEditingForwardUrl(tok.id);
                      setForwardUrlInput(tok.discord_forward_url ?? "");
                    }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {tok.discord_forward_url
                      ? "Edit forward URL"
                      : "Add Discord forward URL"}
                  </button>
                )}
              </div>

              {tok.last_used_at && (
                <div className="text-xs text-muted-foreground">
                  Last used: {new Date(tok.last_used_at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function generateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
