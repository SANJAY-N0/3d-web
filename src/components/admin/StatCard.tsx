import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  accent?: 'cyan' | 'indigo' | 'emerald' | 'amber' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'cyan',
}) => {
  const accentColors = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-sm dark:shadow-xl flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-medium">
          {title}
        </span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${accentColors[accent]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4">
        <div className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 font-mono">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
