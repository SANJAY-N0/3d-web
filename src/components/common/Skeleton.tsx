import React from 'react';

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-100 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-3 animate-pulse">
      <div className="w-full aspect-square bg-slate-200 dark:bg-neutral-800 rounded-lg sm:rounded-xl" />
      <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-3/4" />
      <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-full" />
      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-neutral-800/80">
        <div className="h-5 bg-slate-200 dark:bg-neutral-800 rounded w-1/3" />
        <div className="h-7 bg-slate-200 dark:bg-neutral-800 rounded-lg w-16" />
      </div>
    </div>
  );
};

export const TableRowSkeleton: React.FC = () => {
  return (
    <tr className="border-b border-slate-200 dark:border-neutral-800/60 animate-pulse">
      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-24" /></td>
      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-32" /></td>
      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-28" /></td>
      <td className="p-4"><div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-16" /></td>
      <td className="p-4"><div className="h-6 bg-slate-200 dark:bg-neutral-800 rounded-full w-24" /></td>
      <td className="p-4"><div className="h-6 bg-slate-200 dark:bg-neutral-800 rounded-full w-24" /></td>
      <td className="p-4 text-right"><div className="h-8 bg-slate-200 dark:bg-neutral-800 rounded-lg w-20 ml-auto" /></td>
    </tr>
  );
};

export const StatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-slate-100 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-slate-200 dark:bg-neutral-800 rounded w-1/2 mb-4" />
      <div className="h-8 bg-slate-200 dark:bg-neutral-800 rounded w-1/3 mb-2" />
      <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-2/3" />
    </div>
  );
};
