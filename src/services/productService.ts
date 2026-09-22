import { Product } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Immediately purge any legacy product cache from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('printlab_products_data_v1');
    window.localStorage.removeItem('printlab_products_data_v2');
  }
} catch {
  // ignore in non-browser environments
}

function normalizeProduct(p: any): Product {
  const mainImg = p.main_image || p.image_url || '';
  const gallery = Array.isArray(p.gallery_images) && p.gallery_images.length > 0
    ? p.gallery_images
    : (Array.isArray(p.gallery_urls) && p.gallery_urls.length > 0 ? p.gallery_urls : [mainImg]);

  const stockQty = p.stock_quantity !== undefined && p.stock_quantity !== null
    ? Number(p.stock_quantity)
    : (p.stock !== undefined && p.stock !== null ? Number(p.stock) : (p.is_available ? 50 : 0));

  const isAvailable = p.is_available !== false && stockQty > 0;

  return {
    ...p,
    image_url: mainImg,
    main_image: mainImg,
    gallery_urls: gallery,
    gallery_images: gallery,
    stock: stockQty,
    stock_quantity: stockQty,
    online_available: p.online_available !== undefined ? Boolean(p.online_available) : true,
    on_spot_available: p.on_spot_available !== undefined ? Boolean(p.on_spot_available) : true,
    status: p.status || (isAvailable ? 'ACTIVE' : 'INACTIVE'),
    is_available: isAvailable,
    public_id: p.public_id || (mainImg.includes('res.cloudinary.com') ? mainImg.split('/upload/')[1]?.replace(/^v\d+\//, '') : undefined),
    gallery_public_ids: p.gallery_public_ids || gallery.map((g: string) => (g.includes('res.cloudinary.com') ? g.split('/upload/')[1]?.replace(/^v\d+\//, '') : '')),
  };
}

function isFakeProduct(p: any): boolean {
  if (!p || !p.name) return true;
  const name = p.name.trim().toLowerCase();
  if (name === 'nothing' || name === 'test' || name === 'dummy') return true;
  if (p.description && p.description.includes('lksnfoadfnfasnfpa')) return true;
  if (p.main_image && (p.main_image.includes('Screenshot') || p.main_image.includes('Ishan') || p.main_image.includes('26,200'))) return true;
  if (p.image_url && (p.image_url.includes('Screenshot') || p.image_url.includes('Ishan') || p.image_url.includes('26,200'))) return true;
  return false;
}

export const productService = {
  /**
   * Fetch all products from Supabase (pure real data, no fake mock fallback)
   */
  async getAll(): Promise<Product[]> {
    // Purge any stale products cache from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('printlab_products_data_v1');
        window.localStorage.removeItem('printlab_products_data_v2');
      }
    } catch {
      // ignore
    }

    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Returning empty product list (0 products).');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase products query error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map(normalizeProduct).filter((p) => !isFakeProduct(p));
    } catch (err) {
      console.error('Supabase products fetch failed:', err);
      return [];
    }
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
    if (!isSupabaseConfigured || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .maybeSingle();

      if (error) {
        console.error('Supabase single product fetch error:', error);
        return null;
      }
      if (data && !isFakeProduct(data)) {
        return normalizeProduct(data);
      }
      return null;
    } catch (err) {
      console.error('Supabase single product fetch failed:', err);
      return null;
    }
  },

  /**
   * Create new product in Supabase
   */
  async create(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Cannot create product.');
    }

    // Verify authenticated admin session before insert
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Admin authentication session expired. Please log in again.');
    }

    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) {
      console.error('Supabase product insert error:', error);
      throw error;
    }

    return normalizeProduct(data);
  },

  /**
   * Update existing product in Supabase
   */
  async update(id: string, updates: Partial<Product>): Promise<Product> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Cannot update product.');
    }

    // Verify authenticated admin session before update
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Admin authentication session expired. Please log in again.');
    }

    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase product update error:', error);
      throw error;
    }

    return normalizeProduct(data);
  },

  /**
   * Delete product in Supabase
   */
  async delete(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Cannot delete product.');
    }

    // Verify authenticated admin session before delete
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Admin authentication session expired. Please log in again.');
    }

    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('Supabase product delete error:', error);
      throw error;
    }
  },

  /**
   * Clear all locally cached products
   */
  async clearLocalProductsCache(): Promise<Product[]> {
    try {
      localStorage.removeItem('printlab_products_data_v1');
      localStorage.removeItem('printlab_products_data_v2');
    } catch {
      // ignore
    }
    return this.getAll();
  }
};

export function clearLocalCaches(): void {
  try {
    localStorage.removeItem('printlab_products_data_v1');
    localStorage.removeItem('printlab_products_data_v2');
    localStorage.removeItem('printlab_orders_data_v1');
    localStorage.removeItem('printlab_customers_data_v1');
  } catch {
    // ignore
  }
}

// Backward-compatibility alias
export const resetAllStorageToSeed = clearLocalCaches;
