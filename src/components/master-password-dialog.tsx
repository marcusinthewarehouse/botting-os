'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LockIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
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
        triggerShake('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirm) {
        triggerShake('Passwords do not match.');
        return;
      }
      setLoading(true);
      try {
        await onSetPassword(password);
      } catch {
        triggerShake('Failed to set password. Try again.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!password) {
        triggerShake('Enter your master password.');
        return;
      }
      setLoading(true);
      try {
        const ok = await onVerifyPassword(password);
        if (!ok) triggerShake('Incorrect password.');
      } catch {
        triggerShake('Failed to verify password. Try again.');
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
        className="max-w-sm bg-zinc-900 border border-white/[0.06] shadow-2xl"
      >
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex items-center justify-center size-8 rounded-lg bg-amber-500/15">
              <LockIcon className="size-4 text-amber-500" />
            </div>
            <DialogTitle className="text-base font-semibold text-zinc-50">
              {isFirstTime ? 'Set Master Password' : 'Unlock BottingOS'}
            </DialogTitle>
          </div>
          <p className="text-sm text-zinc-400">
            {isFirstTime
              ? 'Create a master password to encrypt your vault data.'
              : 'Enter your master password to continue.'}
          </p>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={cn(
            'flex flex-col gap-3 transition-transform',
            shaking && 'animate-shake'
          )}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 font-medium">
              {isFirstTime ? 'New password' : 'Master password'}
            </label>
            <Input
              ref={passwordRef}
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder={isFirstTime ? 'Min. 8 characters' : 'Enter password'}
              className="bg-zinc-800 border-white/[0.06] focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20 text-zinc-50 placeholder:text-zinc-600"
              autoComplete={isFirstTime ? 'new-password' : 'current-password'}
              disabled={loading}
            />
          </div>

          {isFirstTime && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium">Confirm password</label>
              <Input
                type="password"
                value={confirm}
                onChange={e => {
                  setConfirm(e.target.value);
                  setError('');
                }}
                placeholder="Re-enter password"
                className="bg-zinc-800 border-white/[0.06] focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20 text-zinc-50 placeholder:text-zinc-600"
                autoComplete="new-password"
                disabled={loading}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSubmit();
                }}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium active:scale-[0.97] transition-all duration-150"
          >
            {loading ? 'Please wait...' : isFirstTime ? 'Set Password' : 'Unlock'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
