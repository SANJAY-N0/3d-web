import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-neutral-800 ${className}`}
      {...props}
    />
  );
};

export {
  ProductCardSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
} from '../common/Skeleton';
