import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Product } from '../types';
import { productService } from '../services/productService';
import { ProductCard } from '../components/product/ProductCard';
import { CategoryFilter } from '../components/product/CategoryFilter';
import { ProductCardSkeleton } from '../components/common/Skeleton';
import { Box, FilterX } from 'lucide-react';

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const selectedCategory = searchParams.get('category') || 'All';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'newest'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    productService
      .getAll()
      .then((data) => setProducts(data))
      .finally(() => setLoading(false));
  }, []);

  const handleCategorySelect = (category: string) => {
    if (category === 'All') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);
  };

  // Filtered & Sorted items
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }
        // In stock only
        if (inStockOnly && !p.is_available) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        // Default: featured first
        if (a.is_featured === b.is_featured) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return a.is_featured ? -1 : 1;
      });
  }, [products, selectedCategory, searchQuery, sortBy, inStockOnly]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Header Banner */}
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-cyan-600 dark:text-cyan-400 font-semibold">
          <Box className="w-3.5 h-3.5" /> 3D Printed Catalog
        </div>
        <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-slate-900 dark:text-white">
          Explore Products
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 max-w-2xl">
          Browse our customized keychains, desk accessories, miniatures, and phone stands.
        </p>
      </div>

      {/* Filter and Search controls */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        inStockOnly={inStockOnly}
        onInStockChange={setInStockOnly}
      />

      {/* Product Results: 2 columns on mobile (50% each), 3 on tablet, 4 on desktop */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 pt-2">
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
          <ProductCardSkeleton />
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 pt-2">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="p-8 sm:p-12 text-center bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl space-y-4 my-8 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 flex items-center justify-center mx-auto">
            <FilterX className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 dark:text-white">
              {products.length === 0 ? 'No products available' : 'No products found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
              {products.length === 0
                ? 'There are currently no products available in the catalog.'
                : "We couldn't find any 3D print items matching your search or filters."}
            </p>
          </div>
          {products.length > 0 && (
            <button
              onClick={() => {
                setSearchQuery('');
                handleCategorySelect('All');
                setInStockOnly(false);
              }}
              className="px-4 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-cyan-700 dark:text-cyan-300 text-xs font-mono rounded-xl border border-slate-300 dark:border-neutral-700 cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
