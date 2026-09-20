import { Product } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const PRODUCTS_STORAGE_KEY = 'printlab_products_data_v1';

function normalizeProduct(p: any): Product {
  const mainImg = p.main_image || p.image_url || '';
  const gallery = Array.isArray(p.gallery_images) && p.gallery_images.length > 0
    ? p.gallery_images
    : (Array.isArray(p.gallery_urls) && p.gallery_urls.length > 0 ? p.gallery_urls : [mainImg]);

  return {
    ...p,
    image_url: mainImg,
    main_image: mainImg,
    gallery_urls: gallery,
    gallery_images: gallery,
    public_id: p.public_id || (mainImg.includes('res.cloudinary.com') ? mainImg.split('/upload/')[1]?.replace(/^v\d+\//, '') : undefined),
    gallery_public_ids: p.gallery_public_ids || gallery.map((g: string) => (g.includes('res.cloudinary.com') ? g.split('/upload/')[1]?.replace(/^v\d+\//, '') : '')),
  };
}

function getLocalProducts(): Product[] {
  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: any[] = JSON.parse(raw);
    return parsed.map(normalizeProduct);
  } catch {
    return [];
  }
}

function saveLocalProducts(products: Product[]): void {
  localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
}

export const productService = {
  /**
   * Fetch all products from Supabase (pure real data, no fake mock fallback)
   */
  async getAll(): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase products query error:', error);
          throw error;
        }

        // Return real data from Supabase (empty array if none exist)
        const products = (data || []).map(normalizeProduct);
        saveLocalProducts(products);
        return products;
      } catch (err) {
        console.warn('Supabase products fetch failed, using local cache:', err);
        return getLocalProducts();
      }
    }
    return getLocalProducts();
  },

  /**
   * Fetch featured products for homepage
   */
  async getFeatured(): Promise<Product[]> {
    const all = await this.getAll();
    return all.filter((p) => p.is_featured && p.is_available);
  },

  /**
   * Fetch single product by slug or id
   */
  async getBySlugOrId(idOrSlug: string): Promise<Product | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
          .maybeSingle();

        if (error) throw error;
        if (data) return normalizeProduct(data);
        return null;
      } catch (err) {
        console.warn('Supabase single product fetch failed:', err);
      }
    }
    const all = getLocalProducts();
    return all.find((p) => p.id === idOrSlug || p.slug === idOrSlug) || null;
  },

  /**
   * Create new product in Supabase
   */
  async create(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const newProduct: Product = {
      ...productData,
      id: 'prod-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('products').insert([productData]).select().single();
        if (error) throw error;
        if (data) return normalizeProduct(data);
      } catch (err) {
        console.warn('Supabase product insert failed, saving locally:', err);
      }
    }

    const current = getLocalProducts();
    const updated = [newProduct, ...current];
    saveLocalProducts(updated);
    return newProduct;
  },

  /**
   * Update existing product in Supabase
   */
  async update(id: string, updates: Partial<Product>): Promise<Product> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        if (data) return normalizeProduct(data);
      } catch (err) {
        console.warn('Supabase product update failed:', err);
      }
    }

    const current = getLocalProducts();
    const index = current.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Product not found');

    const updatedProduct = {
      ...current[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    current[index] = updatedProduct;
    saveLocalProducts(current);
    return updatedProduct;
  },

  /**
   * Delete product in Supabase
   */
  async delete(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase product delete failed:', err);
      }
    }

    const current = getLocalProducts();
    const updated = current.filter((p) => p.id !== id);
    saveLocalProducts(updated);
  },

  /**
   * Clear all locally cached products
   */
  async clearLocalProductsCache(): Promise<Product[]> {
    localStorage.removeItem(PRODUCTS_STORAGE_KEY);
    return this.getAll();
  }
};

export function clearLocalCaches(): void {
  localStorage.removeItem('printlab_products_data_v1');
  localStorage.removeItem('printlab_orders_data_v1');
  localStorage.removeItem('printlab_customers_data_v1');
}

// Backward-compatibility alias
export const resetAllStorageToSeed = clearLocalCaches;
