import { useState, useEffect, useCallback } from 'react';
import { Product, ProductCategory } from '../../../types';
import { productService } from '../services/productService';

export function useProducts(initialCategory?: ProductCategory | 'All') {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>(initialCategory || 'All');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter((p) => p.category === selectedCategory);

  return {
    products,
    filteredProducts,
    loading,
    error,
    selectedCategory,
    setSelectedCategory,
    refetch: fetchProducts,
  };
}
