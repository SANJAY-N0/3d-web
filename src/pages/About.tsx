import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Layers,
  Cpu,
  Sparkles,
  Flame,
  ArrowRight,
} from 'lucide-react';

export const About: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-xs font-mono text-cyan-700 dark:text-cyan-400">
          <Cpu className="w-3.5 h-3.5" /> High-End Additive Manufacturing
        </div>
        <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-slate-900 dark:text-white tracking-tight">
          Materials & Tech Specs
        </h1>
        <p className="text-slate-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed">
          At PRINTLAB 3D, we turn 3D geometry into physical reality using industrial-grade precision printers and premium engineering materials.
        </p>
      </div>

      {/* Material Matrix */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Our Engineering Materials</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* PLA+ */}
          <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 hover:border-cyan-500/30 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-200 dark:border-cyan-500/20">
              <Box className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">PLA+ (Tough Bio-Polymer)</h3>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Enhanced impact resistance and low shrinkage. Ideal for keychains, desk accessories, and decorative items. Biodegradable and eco-friendly.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-xs font-mono">
              <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                <span>Tensile Strength:</span>
                <span className="text-slate-900 dark:text-white font-medium">65 MPa</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                <span>Impact Resistance:</span>
                <span className="text-cyan-700 dark:text-cyan-300 font-medium">High</span>
              </div>
            </div>
          </div>

          {/* PETG-CF */}
          <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 hover:border-indigo-500/30 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">PETG Carbon Fiber</h3>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Reinforced with chopped carbon fiber strands for extreme stiffness, heat resistance, and a gorgeous matte textured aesthetic.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-xs font-mono">
              <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                <span>Heat Deflection:</span>
                <span className="text-slate-900 dark:text-white font-medium">80°C</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                <span>Rigidity:</span>
                <span className="text-indigo-700 dark:text-indigo-300 font-medium">Extreme</span>
              </div>
            </div>
          </div>

          {/* UV Resin */}
          <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-2xl p-6 space-y-4 hover:border-purple-500/30 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">SLA 8K UV Resin</h3>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Liquid photopolymer cured layer-by-layer with UV light for ultra-fine tabletop miniatures and jewelry with zero visible layer lines.
              </p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-neutral-800/80 text-xs font-mono">
              <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                <span>Resolution:</span>
                <span className="text-slate-900 dark:text-white font-medium">0.02 - 0.05mm</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-neutral-400">
                <span>Surface Finish:</span>
                <span className="text-purple-700 dark:text-purple-300 font-medium">Glass Smooth</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hardware Fleet Spec */}
      <section className="bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-3xl p-8 sm:p-10 space-y-8 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-neutral-800 pb-3">
          <Box className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">Our Print Farm Specifications</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          <div className="p-4 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800/80">
            <span className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white block">500<span className="text-xs text-cyan-600 dark:text-cyan-400 font-normal"> mm/s</span></span>
            <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 mt-1 block">Max Print Speed</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800/80">
            <span className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white block">0.08<span className="text-xs text-indigo-600 dark:text-indigo-400 font-normal"> mm</span></span>
            <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 mt-1 block">Min Layer Height</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800/80">
            <span className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white block">300<span className="text-xs text-purple-600 dark:text-purple-400 font-normal"> °C</span></span>
            <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 mt-1 block">All-Metal Hotend</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-neutral-950 rounded-2xl border border-slate-200 dark:border-neutral-800/80">
            <span className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white block">16<span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal"> Colors</span></span>
            <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 mt-1 block">Multi-Material Support</span>
          </div>
        </div>
      </section>

      {/* College Stall Ordering Notice */}
      <div className="bg-slate-50 dark:bg-gradient-to-r dark:from-neutral-900 dark:to-neutral-950 border border-cyan-500/30 rounded-3xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm dark:shadow-2xl">
        <div className="space-y-2 text-center sm:text-left">
          <h3 className="font-display font-bold text-xl text-slate-900 dark:text-white">Visiting our College / Tech Fest Stall?</h3>
          <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-md">
            Order online through this portal, pay via UPI, and pick up your fresh 3D print directly from our stall without waiting in line!
          </p>
        </div>

        <Link
          to="/products"
          className="px-6 py-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition-all shrink-0 cursor-pointer"
        >
          <span>Browse Products Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
