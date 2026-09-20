import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ProductModal } from '../../components/admin/ProductModal';
import { productService } from '../../services/productService';
import { Product } from '../../types';
import { formatINR } from '../../lib/upiUtils';
import { cloudinaryPresets } from '../../lib/cloudinary';
import {
  Box,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ExternalLink,
  Layers,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export const AdminProducts: React.FC = () => {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err: any) {
      showToast('Failed to load products.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (productData: any) => {
    try {
      if (selectedProduct) {
        await productService.update(selectedProduct.id, productData);
        showToast('Product updated successfully in Supabase!', 'success');
      } else {
        await productService.create(productData);
        showToast('Product created and saved to Supabase!', 'success');
      }
      setIsModalOpen(false);
      await loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to save product.', 'error');
      throw err;
    }
  };

  const handleToggleAvailability = async (prod: Product) => {
    try {
      await productService.update(prod.id, { is_available: !prod.is_available });
      showToast(`${prod.name} marked as ${!prod.is_available ? 'In Stock' : 'Out of Stock'}.`, 'success');
      await loadProducts();
    } catch (err: any) {
      showToast('Failed to update availability.', 'error');
    }
  };

  const handleDelete = async (prod: Product) => {
    if (window.confirm(`Are you sure you want to delete "${prod.name}" from the catalog?`)) {
      try {
        await productService.delete(prod.id);
        showToast('Product deleted.', 'info');
        await loadProducts();
      } catch (err: any) {
        showToast('Failed to delete product.', 'error');
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.material.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white">3D Product Catalog</h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Manage products, pricing, materials, and showcase media.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadProducts}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 border border-slate-300 dark:border-neutral-800 cursor-pointer"
              title="Refresh Catalog"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleCreateNew}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, category, or material..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-sm"
          />
        </div>

        {/* Product Cards Table Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white dark:bg-neutral-900/70 border border-slate-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col h-full hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-sm"
            >
              {/* Product Image: Fixed Consistent Aspect Ratio & Height */}
              <div className="relative aspect-[16/9] w-full bg-slate-100 dark:bg-neutral-950 overflow-hidden shrink-0">
                <img
                  src={cloudinaryPresets.card(prod.main_image || prod.image_url)}
                  alt={prod.name}
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.parentElement?.querySelector('.img-fallback') as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                  className="w-full h-full object-cover object-center"
                />
                <div
                  className="img-fallback w-full h-full hidden flex-col items-center justify-center bg-slate-100 dark:bg-neutral-900 text-slate-400 dark:text-neutral-500 p-4 text-center"
                >
                  <Box className="w-8 h-8 text-cyan-500 mb-1" />
                  <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">3D Model Ready</span>
                </div>
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-neutral-700">
                    {prod.category}
                  </span>
                  {prod.is_featured && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono">
                      ★ Featured
                    </span>
                  )}
                  {((prod.gallery_images && prod.gallery_images.length > 1) || (prod.gallery_urls && prod.gallery_urls.length > 1)) && (
                    <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 text-[9px] font-mono flex items-center gap-1">
                      <ImageIcon className="w-2.5 h-2.5" />
                      {prod.gallery_images?.length || prod.gallery_urls?.length}
                    </span>
                  )}
                </div>

                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => handleToggleAvailability(prod)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border backdrop-blur-md transition-colors cursor-pointer ${
                      prod.is_available
                        ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {prod.is_available ? '✓ In Stock' : '✕ Out of Stock'}
                  </button>
                </div>
              </div>

              {/* Info Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white truncate">{prod.name}</h3>
                    <span className="font-display font-bold text-sm text-cyan-600 dark:text-cyan-400 shrink-0">{formatINR(prod.price)}</span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">{prod.description}</p>
                </div>

                {/* Useful product specs without timing info */}
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                  <span>{prod.material}</span>
                  <span>{prod.dimensions || prod.category}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3 bg-slate-50 dark:bg-neutral-950/80 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0">
                <a
                  href={`/products/${prod.slug || prod.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white text-xs inline-flex items-center gap-1 border border-slate-200 dark:border-neutral-800 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  <span>Preview</span>
                </a>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEdit(prod)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center gap-1 border border-slate-300 dark:border-neutral-700 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(prod)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 border border-rose-200 dark:border-rose-900/30 transition-colors cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && !loading && (
          <div className="p-12 text-center bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-3xl space-y-3">
            <Box className="w-8 h-8 text-slate-400 dark:text-neutral-500 mx-auto" />
            <h3 className="font-display font-semibold text-base text-slate-900 dark:text-white">
              {products.length === 0 ? 'No products in catalog' : 'No products found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {products.length === 0
                ? 'Your Supabase database currently has 0 products. Click "Add New Product" to create your first item.'
                : 'Try adjusting your search query or clear the filter.'}
            </p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        initialProduct={selectedProduct}
      />
    </AdminLayout>
  );
};
