import React from 'react';
import { Check, Box, UserCheck, QrCode, CheckCircle2 } from 'lucide-react';

export type StepIdentifier =
  | 1
  | 2
  | 3
  | 4
  | 'product'
  | 'details'
  | 'payment'
  | 'verify'
  | 'confirmation'
  | 'success';

interface StepProgressProps {
  currentStep: StepIdentifier;
}

export const StepProgress: React.FC<StepProgressProps> = ({ currentStep }) => {
  const steps = [
    { num: 1, key: 'product', label: 'Product', icon: Box },
    { num: 2, key: 'details', label: 'Details', icon: UserCheck },
    { num: 3, key: 'payment', label: 'Payment', icon: QrCode },
    { num: 4, key: 'confirmation', label: 'Confirmation', icon: CheckCircle2 },
  ];

  const currentNum: number =
    typeof currentStep === 'number'
      ? currentStep
      : currentStep === 'product'
      ? 1
      : currentStep === 'details'
      ? 2
      : currentStep === 'payment' || currentStep === 'verify'
      ? 3
      : 4;

  const progressPercent = ((Math.min(Math.max(currentNum, 1), steps.length) - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto py-4 px-6 sm:px-8">
      <div className="relative flex items-center justify-between">
        {/* Background Track - neatly inset from circle center to circle center */}
        <div className="absolute left-5 right-5 top-5 -translate-y-1/2 h-1 bg-slate-200 dark:bg-neutral-800 rounded-full z-0">
          {/* Active Fill */}
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {steps.map((step) => {
          const isCompleted = currentNum > step.num;
          const isCurrent = currentNum === step.num;
          const Icon = step.icon;

          return (
            <div key={step.num} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 font-semibold text-sm shadow-sm ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : isCurrent
                    ? 'bg-gradient-to-br from-cyan-500 to-indigo-600 text-white ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30 scale-105'
                    : 'bg-white dark:bg-neutral-900 border-2 border-slate-300 dark:border-neutral-700 text-slate-400 dark:text-neutral-500'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[2.5]" /> : <Icon className="w-4.5 h-4.5" />}
              </div>
              <span
                className={`mt-2 text-xs font-medium tracking-wide select-none ${
                  isCurrent
                    ? 'text-cyan-600 dark:text-cyan-400 font-bold'
                    : isCompleted
                    ? 'text-slate-800 dark:text-neutral-200 font-medium'
                    : 'text-slate-400 dark:text-neutral-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
