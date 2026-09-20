import React, { useState } from 'react';
import { Sparkles, Maximize2, ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import { cloudinaryPresets } from '../../lib/cloudinary';

interface ProductGalleryProps {
  images: string[];
  productName: string;
  category?: string;
  isFeatured?: boolean;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  images,
  productName,
  category = '3D Print',
  isFeatured = false,
}) => {
  const validImages = images && images.length > 0
    ? images
    : ['https://res.cloudinary.com/jushiok7/image/upload/v1711000001/3d-printing/products/prod-001/main.jpg'];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const rawCurrentImage = validImages[currentIndex] || validImages[0];
  const mainStageUrl = cloudinaryPresets.showcase(rawCurrentImage);
  const zoomModalUrl = cloudinaryPresets.zoom(rawCurrentImage);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  // View angle labels for showcase
  const getAngleLabel = (idx: number) => {
    switch (idx) {
      case 0:
        return 'Studio Main';
      case 1:
        return '45° Angle';
      case 2:
        return 'Layer Detail';
      case 3:
        return 'In-Use View';
      default:
        return `Angle #${idx + 1}`;
    }
  };

  return (
    <div className="space-y-4 select-none">
      {/* Main Image Stage */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="group relative aspect-[4/3] rounded-3xl overflow-hidden bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-lg cursor-zoom-in transition-all duration-300"
      >
        <img
          key={mainStageUrl}
          src={mainStageUrl}
          alt={`${productName} - ${getAngleLabel(currentIndex)}`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80';
          }}
          className="w-full h-full object-cover object-center animate-fadeIn duration-300 group-hover:scale-105 transition-transform"
        />

        {/* Top Badges */}
        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 flex flex-wrap gap-2 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 text-slate-900 dark:text-white border border-slate-200/70 dark:border-neutral-700/70 shadow-sm flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>{category}</span>
          </span>

          {isFeatured && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-cyan-600 text-white shadow-sm">
              ★ Popular
            </span>
          )}
        </div>

        {/* View Angle & Zoom Pill */}
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4 flex items-center gap-2 z-10">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono backdrop-blur-md bg-slate-900/80 text-white border border-white/10 shadow-sm">
            {getAngleLabel(currentIndex)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            aria-label="Zoom image"
            className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Left / Right Arrow Controls (Desktop & Mobile) */}
        {validImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous view"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-900 text-slate-800 dark:text-white flex items-center justify-center backdrop-blur-md border border-slate-200 dark:border-neutral-700 shadow-md transition-transform active:scale-90 cursor-pointer opacity-80 group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next view"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 dark:bg-neutral-900/80 hover:bg-white dark:hover:bg-neutral-900 text-slate-800 dark:text-white flex items-center justify-center backdrop-blur-md border border-slate-200 dark:border-neutral-700 shadow-md transition-transform active:scale-90 cursor-pointer opacity-80 group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Bottom index pagination dots */}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/70 backdrop-blur-md border border-white/10 z-10">
            {validImages.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentIndex === idx ? 'w-5 bg-cyan-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {validImages.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 font-mono">
            <span>STUDIO VIEWS ({validImages.length})</span>
            <span>Click thumbnail to switch angle</span>
          </div>

          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {validImages.map((img, idx) => {
              const isSelected = currentIndex === idx;
              const thumbUrl = cloudinaryPresets.thumbnail(img);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all duration-200 cursor-pointer bg-slate-100 dark:bg-neutral-900 ${
                    isSelected
                      ? 'border-cyan-500 scale-[1.02] shadow-md ring-2 ring-cyan-500/30'
                      : 'border-slate-200 dark:border-neutral-800 opacity-60 hover:opacity-100 hover:border-slate-300 dark:hover:border-neutral-700'
                  }`}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail angle ${idx + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Lightbox Button */}
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
              aria-label="Close fullscreen modal"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Lightbox Image */}
            <div className="relative rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 max-h-[80vh] flex items-center justify-center shadow-2xl">
              <img
                src={zoomModalUrl}
                alt={`${productName} detail view`}
                referrerPolicy="no-referrer"
                className="max-h-[78vh] w-auto object-contain"
              />

              {validImages.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    aria-label="Previous view"
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    onClick={handleNext}
                    aria-label="Next view"
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Caption */}
            <div className="mt-3 flex items-center justify-between w-full text-xs font-mono text-neutral-400 px-2">
              <span className="text-white font-semibold">{productName}</span>
              <span>
                {getAngleLabel(currentIndex)} ({currentIndex + 1} of {validImages.length})
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
