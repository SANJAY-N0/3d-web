import React from 'react';
import { ProductCategory } from '../../types';
import { Search, SlidersHorizontal, Check } from 'lucide-react';

export const CATEGORIES: (ProductCategory | 'All')[] = [
  'All',
  'Keychains',
  'Desk Accessories',
  'Miniatures',
  'Phone Accessories',
  'Decorative Items',
  'College Products',
  'Custom Products',
  'Other',
];

interface CategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'newest';
  onSortChange: (sort: 'featured' | 'price-asc' | 'price-desc' | 'newest') => void;
  inStockOnly: boolean;
  onInStockChange: (inStock: boolean) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  inStockOnly,
  onInStockChange,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search 3D models, keychains, phone stands..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 shadow-sm transition-all"
          />
        </div>

        {/* Sort & Availability Controls */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* In Stock toggle */}
          <button
            type="button"
            onClick={() => onInStockChange(!inStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all cursor-pointer ${
              inStockOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40 shadow-sm'
                : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                inStockOnly ? 'bg-emerald-500 border-emerald-500 text-white dark:text-black' : 'border-slate-300 dark:border-neutral-600'
              }`}
            >
              {inStockOnly && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span>In Stock Only</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              aria-label="Sort products"
              className="appearance-none bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-medium px-4 py-2.5 pr-8 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer shadow-sm"
            >
              <option value="featured">Featured First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest Additions</option>
            </select>
            <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Category Pills (Horizontal Scroll on mobile) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md shadow-cyan-600/20 font-semibold'
                  : 'bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200 hover:border-slate-300 dark:hover:border-neutral-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
};
