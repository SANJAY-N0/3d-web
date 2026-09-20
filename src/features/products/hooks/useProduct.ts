import { useState, useEffect } from 'react';
import { Product } from '../../../types';
import { productService } from '../services/productService';

export function useProduct(idOrSlug?: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(idOrSlug));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idOrSlug) {
      setProduct(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    productService
      .getBySlugOrId(idOrSlug)
      .then((data) => {
        if (isMounted) setProduct(data);
      })
      .catch((err: any) => {
        if (isMounted) setError(err?.message || 'Failed to load product');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [idOrSlug]);

  return { product, loading, error };
}
