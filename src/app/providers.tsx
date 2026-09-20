import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../components/common/Toast';

export interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
};
