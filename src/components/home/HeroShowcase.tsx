import React, { useState, useEffect } from 'react';
import { Box } from 'lucide-react';
import { ShowcaseItem } from '../../types';
import { showcaseService } from '../../services/showcaseService';
import { getOptimizedImageUrl } from '../../lib/cloudinary';

export const HeroShowcase: React.FC = () => {
  const [items, setItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch active showcase items from Supabase
  useEffect(() => {
    let isMounted = true;
    showcaseService
      .getActiveShowcase()
      .then((data) => {
        if (isMounted) {
          setItems(data);
          setCurrentIndex(0);
        }
      })
      .catch((err) => {
        console.error('Failed to load showcase items:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatic Looping with per-image display_duration stored in Supabase
  useEffect(() => {
    if (items.length <= 1) return;

    const currentItem = items[currentIndex];
    const durationSeconds = currentItem
      ? Math.max(2, Math.min(60, Number(currentItem.display_duration) || 5))
      : 5;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, durationSeconds * 1000);

    return () => clearTimeout(timer);
  }, [items, currentIndex]);

  // Loading skeleton state
  if (loading) {
    return (
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-b from-cyan-500/20 via-indigo-500/10 to-slate-200 dark:to-neutral-800/30 shadow-2xl">
        <div className="relative w-full h-full rounded-xl sm:rounded-[22px] overflow-hidden bg-slate-200 dark:bg-neutral-900 animate-pulse flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Clean minimal placeholder if no active showcase items exist
  if (items.length === 0) {
    return (
      <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-b from-cyan-500/20 via-indigo-500/10 to-slate-200 dark:to-neutral-800/30 shadow-2xl">
        <div className="relative w-full h-full rounded-xl sm:rounded-[22px] overflow-hidden bg-slate-100 dark:bg-neutral-950 flex flex-col items-center justify-center p-8 text-center border border-slate-200 dark:border-neutral-800">
          <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
            <Box className="w-7 h-7" />
          </div>
          <h3 className="font-display font-semibold text-sm sm:text-base text-slate-800 dark:text-neutral-200">
            Showcase Ready
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-xs">
            Add showcase slides in the Admin Portal to feature high-resolution 3D prints here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[4/3] sm:aspect-[16/11] lg:aspect-[4/3] rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-indigo-500/20 to-slate-200/80 dark:to-neutral-800/40 shadow-2xl shadow-cyan-500/10 transition-all duration-300">
      <div className="relative w-full h-full rounded-xl sm:rounded-[22px] overflow-hidden bg-slate-900 border border-slate-200/60 dark:border-neutral-800">
        {/* Images Stack with Smooth Fade Transition */}
        {items.map((item, index) => {
          const isActive = index === currentIndex;
          const optimizedUrl = getOptimizedImageUrl(item.image_url, {
            width: 1400,
            quality: 'auto',
            format: 'auto',
          });

          return (
            <div
              key={item.id || index}
              className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!isActive}
            >
              <img
                src={optimizedUrl}
                alt={item.title || '3D Printing Showcase'}
                className="w-full h-full object-cover object-center"
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
