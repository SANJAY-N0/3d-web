import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { productService } from '../services/productService';
import { ProductCard } from '../components/product/ProductCard';
import { ProductCardSkeleton } from '../components/common/Skeleton';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Palette,
} from 'lucide-react';

export const Home: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    productService
      .getFeatured()
      .then((prods) => {
        setFeaturedProducts(prods.slice(0, 8));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12 sm:space-y-20 pb-16 sm:pb-20">
      {/* Hero Section */}
      <section className="relative pt-6 sm:pt-16 pb-8 sm:pb-20 overflow-hidden">
        {/* Ambient subtle glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse" />
                <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                  Custom 3D Printing Showcase
                </span>
              </div>

              {/* Headline */}
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl lg:text-6xl text-slate-900 dark:text-white tracking-tight leading-tight">
                Unique 3D Prints. <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 dark:from-cyan-400 dark:via-indigo-300 dark:to-purple-400">
                  Made on Demand.
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-slate-600 dark:text-neutral-400 text-xs sm:text-base max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Explore custom keychains, desk accessories, miniatures, and phone stands. Order directly at our stall or online via instant UPI.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/products"
                  className="px-5 sm:px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Explore Catalog</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/track"
                  className="px-4 sm:px-6 py-3 rounded-xl bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 hover:text-slate-950 dark:hover:text-white font-medium text-xs sm:text-sm border border-slate-200 dark:border-neutral-800 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Track Order</span>
                </Link>
              </div>

              {/* Quick Value Points */}
              <div className="pt-4 sm:pt-6 border-t border-slate-200 dark:border-neutral-800/80 grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto lg:mx-0 text-left">
                <div className="bg-white dark:bg-neutral-900/40 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-neutral-800/60 shadow-sm">
                  <Palette className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mb-1" />
                  <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">Custom</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">Color & Text</span>
                </div>
                <div className="bg-white dark:bg-neutral-900/40 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-neutral-800/60 shadow-sm">
                  <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mb-1" />
                  <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">UPI Pay</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">Instant QR</span>
                </div>
                <div className="bg-white dark:bg-neutral-900/40 p-2 sm:p-3 rounded-xl border border-slate-200 dark:border-neutral-800/60 shadow-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-1" />
                  <span className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white block">Verified</span>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400">Direct Order</span>
                </div>
              </div>
            </div>

            {/* Right Hero Showcase Image */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-xs sm:max-w-md lg:max-w-none">
                <div className="relative rounded-2xl sm:rounded-3xl p-1 bg-gradient-to-b from-cyan-500/30 via-indigo-500/20 to-slate-200 dark:to-neutral-800/30 shadow-2xl">
                  <div className="relative rounded-xl sm:rounded-[22px] overflow-hidden bg-slate-100 dark:bg-neutral-950 aspect-square">
                    <img
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80"
                      alt="3D Printed Showcase"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 bg-white/95 dark:bg-neutral-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-200 dark:border-neutral-800 flex items-center justify-between shadow-lg">
                      <div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Custom 3D Products</h4>
                        <p className="text-[10px] text-slate-500 dark:text-neutral-400 font-mono">Precision crafted</p>
                      </div>
                      <Link
                        to="/products"
                        className="px-3 py-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-500/20 hover:bg-cyan-500 text-cyan-700 hover:text-white dark:text-cyan-300 dark:hover:text-neutral-950 text-xs font-semibold transition-all"
                      >
                        Browse
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section: 2 columns on mobile (50% each) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-3 sm:pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <h2 className="font-display font-bold text-lg sm:text-2xl text-slate-900 dark:text-white">
              Featured Products
            </h2>
          </div>

          <Link
            to="/products"
            className="text-xs font-mono text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 flex items-center gap-1 transition-colors font-semibold"
          >
            <span>View all</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-2xl space-y-2 shadow-sm">
            <p className="text-xs text-slate-500 dark:text-neutral-400">No featured products available at this time.</p>
            <Link to="/products" className="text-xs text-cyan-600 dark:text-cyan-400 font-mono hover:underline inline-block">
              Browse All Products →
            </Link>
          </div>
        )}
      </section>

      {/* How It Works Flow */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="bg-slate-100/80 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl p-5 sm:p-10 space-y-6 sm:space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-[11px] font-mono uppercase text-cyan-600 dark:text-cyan-400 tracking-wider font-semibold">
              Fast & Simple
            </span>
            <h2 className="font-display font-bold text-lg sm:text-2xl text-slate-900 dark:text-white">
              How to Order via UPI
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 space-y-2 shadow-sm">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-display font-bold text-xs">
                01
              </div>
              <h3 className="font-display font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">Choose Item</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Pick your product, favorite color, and add custom text if needed.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 space-y-2 shadow-sm">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-display font-bold text-xs">
                02
              </div>
              <h3 className="font-display font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">Scan UPI QR</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Scan the dynamic QR code using GPay, PhonePe, or Paytm.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 space-y-2 shadow-sm">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-display font-bold text-xs">
                03
              </div>
              <h3 className="font-display font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">Submit Proof</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Upload your payment screenshot or enter the 12-digit UTR ID.
              </p>
            </div>

            <div className="bg-white dark:bg-neutral-950/80 border border-slate-200 dark:border-neutral-800 rounded-xl p-3.5 sm:p-5 space-y-2 shadow-sm">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-display font-bold text-xs">
                04
              </div>
              <h3 className="font-display font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">Ready for Pickup</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                We verify and produce your 3D print ready for pickup or delivery.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
