import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverEffect = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden ${
        hoverEffect ? 'hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
