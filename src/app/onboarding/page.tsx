'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TerminalSquare, ArrowLeft, ArrowRight } from 'lucide-react';
import { ProgressBar } from '@/components/onboarding/progress-bar';
import { StepCategories } from '@/components/onboarding/step-categories';
import { StepTools } from '@/components/onboarding/step-tools';
import { StepImport } from '@/components/onboarding/step-import';
import { settingsRepo } from '@/lib/db/repositories';
import { IS_TAURI } from '@/lib/db/client';
import { cn } from '@/lib/utils';

const STEP_LABELS = ['Categories', 'Tools', 'Import'];
const TOTAL_STEPS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function checkOnboarding() {
      if (!IS_TAURI) {
        setReady(true);
        return;
      }
      try {
        const value = await settingsRepo.get('onboarding_complete');
        if (value === 'true') {
          router.replace('/');
          return;
        }
      } catch {
        // Settings not available yet - show onboarding
      }
      setReady(true);
    }
    checkOnboarding();
  }, [router]);

  const saveAndComplete = useCallback(async () => {
    if (IS_TAURI) {
      try {
        await settingsRepo.set('user_categories', JSON.stringify(categories));
        await settingsRepo.set('user_bots', JSON.stringify(tools));
        await settingsRepo.set('onboarding_complete', 'true');
      } catch {
        // Continue even if save fails
      }
    }
    router.replace('/');
  }, [categories, tools, router]);

  const handleNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      saveAndComplete();
    }
  }, [step, saveAndComplete]);

  const handleBack = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  const handleSkip = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      saveAndComplete();
    }
  }, [step, saveAndComplete]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <TerminalSquare className="size-8 text-amber-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center pt-8 pb-4">
        <div className="flex items-center gap-2">
          <TerminalSquare className="size-6 text-amber-500" />
          <span className="text-lg font-bold tracking-tight text-zinc-50">BottingOS</span>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 py-6">
        <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} stepLabels={STEP_LABELS} />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        {step === 0 && <StepCategories selected={categories} onChange={setCategories} />}
        {step === 1 && <StepTools selected={tools} onChange={setTools} />}
        {step === 2 && <StepImport onImportComplete={saveAndComplete} />}
      </div>

      {/* Footer */}
      <div className="border-t border-white/[0.06] px-6 py-4 flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150',
            step === 0
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          )}
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400 transition-colors duration-150"
          >
            {step === TOTAL_STEPS - 1 ? 'Finish' : 'Next'}
            {step < TOTAL_STEPS - 1 && <ArrowRight className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
