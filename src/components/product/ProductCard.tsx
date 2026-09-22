import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import { cloudinaryPresets } from '../../lib/cloudinary';
import { ArrowRight, Box } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [imageError, setImageError] = useState(false);
  const imageUrl = product.main_image || product.image_url;
  const optimizedUrl = cloudinaryPresets.card(imageUrl);

  const stock =
    (product as any).stock_quantity !== undefined && (product as any).stock_quantity !== null
      ? Number((product as any).stock_quantity)
      : (product as any).stock !== undefined
      ? Number((product as any).stock)
      : (product.is_available ? 50 : 0);

  const isOutOfStock = stock <= 0 || !product.is_available || product.online_available === false;
  const isLowStock = !isOutOfStock && stock <= 5;

  return (
    <Link
      to={`/products/${product.slug || product.id}`}
      className="group relative bg-white dark:bg-neutral-900/70 hover:bg-slate-50 dark:hover:bg-neutral-900 border border-slate-200 dark:border-neutral-800/80 hover:border-cyan-500/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-cyan-950/20 flex flex-col justify-between"
    >
      {/* Product Image Section */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-100 dark:bg-neutral-950 flex items-center justify-center shrink-0">
        {!imageError && optimizedUrl ? (
          <img
            src={optimizedUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-neutral-900 dark:to-neutral-950 text-slate-400 dark:text-neutral-500">
            <Box className="w-10 h-10 mb-2 stroke-1 text-cyan-500" />
            <span className="text-xs font-medium line-clamp-1">{product.name}</span>
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-0.5">3D Model Ready</span>
          </div>
        )}

        {/* Minimal Category Tag */}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] font-mono font-medium rounded-lg bg-white/90 dark:bg-neutral-950/80 backdrop-blur-md text-cyan-700 dark:text-cyan-300 border border-slate-200/70 dark:border-neutral-700/60 shadow-sm">
            {product.category}
          </span>
        </div>

        {/* Status tag */}
        {isOutOfStock ? (
          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-rose-100 dark:bg-rose-950/90 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 font-semibold">
              Out of Stock
            </span>
          </div>
        ) : isLowStock ? (
          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-amber-100 dark:bg-amber-950/90 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 font-semibold">
              Only {stock} left!
            </span>
          </div>
        ) : product.is_featured ? (
          <div className="absolute top-2.5 right-2.5">
            <span className="px-2 py-0.5 text-[10px] font-mono rounded-lg bg-cyan-600/90 text-white shadow-sm font-semibold">
              ★ Popular
            </span>
          </div>
        ) : null}

        {/* Quick color dots preview */}
        {product.available_colors && product.available_colors.length > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10">
            {product.available_colors.slice(0, 4).map((c, i) => (
              <span
                key={i}
                title={c}
                className={`w-2 h-2 rounded-full border border-white/40 ${
                  c.toLowerCase().includes('white')
                    ? 'bg-white'
                    : c.toLowerCase().includes('black')
                    ? 'bg-neutral-900'
                    : c.toLowerCase().includes('blue')
                    ? 'bg-blue-500'
                    : c.toLowerCase().includes('orange')
                    ? 'bg-orange-500'
                    : c.toLowerCase().includes('green')
                    ? 'bg-emerald-500'
                    : 'bg-amber-400'
                }`}
              />
            ))}
            {product.available_colors.length > 4 && (
              <span className="text-[9px] font-mono text-white/80">+{product.available_colors.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          <h3 className="font-display font-semibold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1 leading-snug">
            {product.name}
          </h3>

          <p className="text-slate-600 dark:text-neutral-400 text-xs line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between gap-1">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-medium">Price</span>
            <span className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-white">
              {formatINR(product.price)}
            </span>
          </div>

          <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-neutral-800 group-hover:bg-cyan-600 group-hover:text-white dark:group-hover:bg-cyan-500 dark:group-hover:text-neutral-950 text-slate-700 dark:text-neutral-200 text-xs font-semibold tracking-wide transition-all shrink-0">
            <span>View</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
};
