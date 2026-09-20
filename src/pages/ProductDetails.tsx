import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Product } from '../types';
import { productService } from '../services/productService';
import { authService } from '../services/authService';
import { formatINR } from '../lib/upiUtils';
import { ProductGallery } from '../components/product/ProductGallery';
import {
  Ruler,
  Palette,
  Minus,
  Plus,
  ShoppingBag,
  ArrowLeft,
  Share2,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Sparkles,
  Truck,
  Building2,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

export const ProductDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('Pure White');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!slug) return;

    productService
      .getBySlugOrId(slug)
      .then((data) => {
        if (data) {
          const colors =
            data.available_colors && data.available_colors.length > 0
              ? data.available_colors.includes('Pure White') ||
                data.available_colors.includes('White') ||
                data.available_colors.includes('Arctic White')
                ? data.available_colors
                : ['Pure White', ...data.available_colors]
              : ['Pure White', 'Matte Black', 'Electric Blue', 'Cyber Orange'];

          setProduct({ ...data, available_colors: colors });
          setSelectedColor(colors[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-widest">
            Loading Product...
          </span>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">Product Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          The 3D printed product you are looking for does not exist.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-xl text-cyan-700 dark:text-cyan-300 text-xs font-mono"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Catalog
        </Link>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `Check out ${product.name} on PRINTLAB 3D`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Product link copied to clipboard!', 'success');
    }
  };

  const handleOrderNow = () => {
    const isAuth = authService.isCustomerAuthenticated();

    if (!isAuth) {
      showToast('Please sign in or register to complete your 3D print order.', 'info');
      navigate(
        `/login?redirect=/order&productId=${product.id}&selectedColor=${encodeURIComponent(
          selectedColor
        )}&quantity=${quantity}`
      );
      return;
    }

    navigate('/order', {
      state: {
        productId: product.id,
        selectedColor,
        quantity,
      },
    });
  };

  // Compile full gallery images with unique views
  const galleryImages = Array.from(new Set([product.image_url, ...(product.gallery_urls || [])]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Top Breadcrumb & Share */}
      <div className="flex items-center justify-between">
        <Link
          to="/products"
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>

        <button
          onClick={handleShare}
          className="p-2 rounded-xl bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm cursor-pointer"
          title="Share Product"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Modern Product Image Gallery */}
        <div className="lg:col-span-7">
          <ProductGallery
            images={galleryImages}
            productName={product.name}
            category={product.category}
            isFeatured={product.is_featured}
          />

          {/* Campus Fulfillment Perks */}
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-neutral-900/50 border border-slate-200 dark:border-neutral-800/80 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-200 dark:border-cyan-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">KPR College Fast Campus Delivery</p>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Direct classroom, hostel or department hand-delivery
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 text-xs font-bold shrink-0">
              <Truck className="w-3.5 h-3.5" /> FREE CAMPUS DROP
            </div>
          </div>
        </div>

        {/* Right Column: Product Information (Prioritized Hierarchy) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header & Price */}
          <div className="space-y-2 border-b border-slate-200 dark:border-neutral-800 pb-6">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-mono font-medium rounded-lg bg-slate-100 dark:bg-neutral-900 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-neutral-800">
                {product.category}
              </span>
              <span
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border font-semibold flex items-center gap-1 ${
                  product.is_available
                    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                    : 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {product.is_available ? 'In Stock (Ready to Print)' : 'Out of Stock'}
              </span>
            </div>

            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="font-display font-extrabold text-3xl text-cyan-600 dark:text-cyan-400">
                {formatINR(product.price)}
              </span>
              <span className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                / unit (incl. taxes)
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
            {product.description}
          </p>

          {/* Product Specifications Grid */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-neutral-900/60 p-4 rounded-2xl border border-slate-200 dark:border-neutral-800 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 flex items-center gap-1 font-semibold">
                <Ruler className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Dimensions
              </span>
              <p className="font-medium text-slate-800 dark:text-neutral-200 font-mono">{product.dimensions}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 flex items-center gap-1 font-semibold">
                <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" /> Material
              </span>
              <p className="font-medium text-slate-800 dark:text-neutral-200">{product.material}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 flex items-center gap-1 font-semibold">
                <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Print Quality
              </span>
              <p className="font-medium text-slate-800 dark:text-neutral-200 font-mono">0.12mm Ultra Fine</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 flex items-center gap-1 font-semibold">
                <Building2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" /> Fulfillment
              </span>
              <p className="font-medium text-slate-800 dark:text-neutral-200">Campus Drop & Courier</p>
            </div>
          </div>

          {/* Color & Variant Selection */}
          {product.available_colors && product.available_colors.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-slate-700 dark:text-neutral-300 uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                  <Palette className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Available Colors:
                </span>
                <span className="font-medium text-cyan-700 dark:text-cyan-300 font-mono font-bold">
                  {selectedColor}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.available_colors.map((color: string) => {
                  const isSelected = selectedColor === color;
                  const isWhiteColor = color.toLowerCase().includes('white');
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-50 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500 shadow-sm font-semibold ring-1 ring-cyan-500/30'
                          : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full border ${
                          isWhiteColor
                            ? 'bg-white border-slate-400 shadow-sm'
                            : color.toLowerCase().includes('black')
                            ? 'bg-neutral-900 border-neutral-700'
                            : color.toLowerCase().includes('blue')
                            ? 'bg-blue-500 border-blue-400'
                            : color.toLowerCase().includes('orange')
                            ? 'bg-orange-500 border-orange-400'
                            : color.toLowerCase().includes('green')
                            ? 'bg-emerald-500 border-emerald-400'
                            : 'bg-neutral-400 border-neutral-300'
                        }`}
                      />
                      <span>{color}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase tracking-wider block font-semibold">
              Quantity
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(20, quantity + 1))}
                  className="p-2 rounded-lg text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-neutral-400 font-mono">
                Total Price:{' '}
                <b className="text-slate-900 dark:text-white text-sm">
                  {formatINR(product.price * quantity)}
                </b>
              </div>
            </div>
          </div>

          {/* Order / Buy Now CTA Button */}
          <div className="pt-4 space-y-2">
            <button
              onClick={handleOrderNow}
              disabled={!product.is_available}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <ShoppingBag className="w-4.5 h-4.5" />
              <span>{product.is_available ? 'Order / Buy Now' : 'Currently Unavailable'}</span>
            </button>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 dark:text-neutral-400 pt-1 font-mono">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> UPI Direct Pay
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Campus & Home Delivery
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


