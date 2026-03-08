"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MasterPasswordDialogProps {
  isFirstTime: boolean;
  onSetPassword: (password: string) => Promise<void>;
  onVerifyPassword: (password: string) => Promise<boolean>;
}

export function MasterPasswordDialog({
  isFirstTime,
  onSetPassword,
  onVerifyPassword,
}: MasterPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => passwordRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const triggerShake = (message: string) => {
    setError(message);
    setShaking(true);
    setTimeout(() => setShaking(false), 400);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) return;

    if (isFirstTime) {
      if (password.length < 8) {
        triggerShake("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirm) {
        triggerShake("Passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        await onSetPassword(password);
      } catch {
        triggerShake("Failed to set password. Try again.");
      } finally {
        setLoading(false);
      }
    } else {
      if (!password) {
        triggerShake("Enter your master password.");
        return;
      }
      setLoading(true);
      try {
        const ok = await onVerifyPassword(password);
        if (!ok) triggerShake("Incorrect password.");
      } catch {
        triggerShake("Failed to verify password. Try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <Dialog
      open
      modal
      disablePointerDismissal
      onOpenChange={(open, details) => {
        // Block all close attempts - escape key, outside click, etc.
        if (!open && details) return;
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-sm bg-card border border-border shadow-lg"
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-accent">
              <LockIcon className="size-4 text-accent-foreground" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              {isFirstTime ? "Set Master Password" : "Unlock BottingOS"}
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {isFirstTime
              ? "Create a master password to encrypt your vault data."
              : "Enter your master password to continue."}
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={cn(
            "flex flex-col gap-3 transition-transform",
            shaking && "animate-shake",
          )}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground font-medium">
              {isFirstTime ? "New password" : "Master password"}
            </label>
            <Input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder={isFirstTime ? "Min. 8 characters" : "Enter password"}
              autoComplete={isFirstTime ? "new-password" : "current-password"}
              disabled={loading}
            />
          </div>

          {isFirstTime && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground font-medium">
                Confirm password
              </label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                placeholder="Re-enter password"
                autoComplete="new-password"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? "Please wait..."
              : isFirstTime
                ? "Set Password"
                : "Unlock"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
