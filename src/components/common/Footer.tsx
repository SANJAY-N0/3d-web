import React from 'react';
import { Link } from 'react-router-dom';
import { Box, Sparkles, Shield, QrCode, Cpu, Layers } from 'lucide-react';
import { getSupportConfig, getWhatsAppLink } from '../../lib/supportConfig';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 text-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-slate-900 dark:bg-neutral-950 rounded-[6px] flex items-center justify-center">
                  <Box className="w-4 h-4 text-cyan-400" />
                </div>
              </div>
              <span className="font-display font-bold text-lg text-slate-900 dark:text-white">PRINTLAB 3D</span>
            </Link>
            <p className="text-slate-600 dark:text-neutral-400 text-sm max-w-sm leading-relaxed">
              3D printed products designed with creativity and precision. Engineered with top-grade PLA+, PETG-CF, and UV photopolymer resins for makers, students, and enthusiasts.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs font-mono text-cyan-600 dark:text-cyan-400/80">
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-neutral-900 px-3 py-1 rounded-md border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300">
                <QrCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Direct UPI Ordering
              </span>
              <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-neutral-900 px-3 py-1 rounded-md border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300">
                <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 0.08 - 0.2mm Precision
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-slate-900 dark:text-white text-sm tracking-wider uppercase">Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Product Catalog</Link>
              </li>
              <li>
                <Link to="/track" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Track Order Status</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Materials & Tech Specs</Link>
              </li>
            </ul>
          </div>

          {/* Customer Care & Support */}
          <div className="space-y-3">
            <h4 className="font-display font-semibold text-slate-900 dark:text-white text-sm tracking-wider uppercase">Support & Contact</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-600 dark:text-neutral-400 block">📞 Call: <a href={`tel:${getSupportConfig().phone.replace(/\s+/g, '')}`} className="text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 font-mono transition-colors">{getSupportConfig().phone}</a></span>
              </li>
              <li>
                <span className="text-slate-600 dark:text-neutral-400 block">💬 WhatsApp: <a href={getWhatsAppLink(getSupportConfig().whatsapp)} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-mono transition-colors">{getSupportConfig().whatsapp}</a></span>
              </li>
              {getSupportConfig().altPhone && (
                <li>
                  <span className="text-slate-600 dark:text-neutral-400 block">📞 Alternative: <a href={`tel:${getSupportConfig().altPhone!.replace(/\s+/g, '')}`} className="text-slate-900 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 font-mono transition-colors">{getSupportConfig().altPhone}</a></span>
                </li>
              )}
              <li className="pt-1">
                <Link to="/track" className="text-cyan-600 dark:text-cyan-400 hover:underline transition-colors">Track Order Status →</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-neutral-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-neutral-400">
          <p>© 2026 PRINTLAB 3D. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-mono">
              <Layers className="w-3.5 h-3.5" /> High Precision Additive Manufacturing
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
