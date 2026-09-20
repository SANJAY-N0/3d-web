import { ShowcaseItem } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { deleteFromCloudinary } from '../lib/cloudinary';

export const showcaseService = {
  /**
   * Fetch active showcase items for Customer Homepage
   * Sorted by display_order ASC, created_at ASC
   */
  async getActiveShowcase(): Promise<ShowcaseItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Returning empty active showcase items.');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('homepage_showcase')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch active showcase items from Supabase:', error);
        return [];
      }

      return (data || []).map((item) => ({
        ...item,
        display_duration: Math.max(2, Math.min(60, Number(item.display_duration) || 5)),
        display_order: Number(item.display_order) || 0,
        button_text: item.button_text || 'Browse Catalog',
        button_link: item.button_link || '/products',
      }));
    } catch (err) {
      console.error('Error in getActiveShowcase:', err);
      return [];
    }
  },

  /**
   * Fetch all showcase items for Admin Portal
   */
  async getAllShowcase(): Promise<ShowcaseItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      console.warn('Supabase is not configured. Returning empty showcase items.');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('homepage_showcase')
        .select('*')
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch all showcase items from Supabase:', error);
        return [];
      }

      return (data || []).map((item) => ({
        ...item,
        display_duration: Math.max(2, Math.min(60, Number(item.display_duration) || 5)),
        display_order: Number(item.display_order) || 0,
        button_text: item.button_text || 'Browse Catalog',
        button_link: item.button_link || '/products',
      }));
    } catch (err) {
      console.error('Error in getAllShowcase:', err);
      return [];
    }
  },

  /**
   * Add a new showcase item
   */
  async createShowcaseItem(item: Omit<ShowcaseItem, 'id' | 'created_at' | 'updated_at'>): Promise<ShowcaseItem> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const duration = Math.max(2, Math.min(60, Number(item.display_duration) || 5));
    const order = Number(item.display_order) || 0;

    const { data, error } = await supabase
      .from('homepage_showcase')
      .insert({
        image_url: item.image_url,
        cloudinary_public_id: item.cloudinary_public_id || null,
        title: item.title || '',
        subtitle: item.subtitle || '',
        button_text: item.button_text || 'Browse Catalog',
        button_link: item.button_link || '/products',
        display_order: order,
        display_duration: duration,
        is_active: item.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create showcase item in Supabase.');
    }

    return {
      ...data,
      display_duration: Number(data.display_duration) || 5,
      display_order: Number(data.display_order) || 0,
    };
  },

  /**
   * Update an existing showcase item
   */
  async updateShowcaseItem(id: string, updates: Partial<ShowcaseItem>): Promise<ShowcaseItem> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (updates.display_duration !== undefined) {
      payload.display_duration = Math.max(2, Math.min(60, Number(updates.display_duration) || 5));
    }
    if (updates.display_order !== undefined) {
      payload.display_order = Number(updates.display_order) || 0;
    }

    const { data, error } = await supabase
      .from('homepage_showcase')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to update showcase item.');
    }

    return {
      ...data,
      display_duration: Number(data.display_duration) || 5,
      display_order: Number(data.display_order) || 0,
    };
  },

  /**
   * Delete showcase item and optionally delete Cloudinary image asset
   */
  async deleteShowcaseItem(id: string, cloudinaryPublicId?: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    // First delete from Supabase
    const { error } = await supabase
      .from('homepage_showcase')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete showcase item from Supabase.');
    }

    // Then delete from Cloudinary if publicId is provided
    if (cloudinaryPublicId && cloudinaryPublicId.trim()) {
      try {
        await deleteFromCloudinary(cloudinaryPublicId.trim());
      } catch (cldErr) {
        console.warn('Could not delete Cloudinary asset:', cldErr);
      }
    }
  },

  /**
   * Reorder items
   */
  async reorderShowcaseItems(orderedItems: { id: string; display_order: number }[]): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    for (const item of orderedItems) {
      await supabase
        .from('homepage_showcase')
        .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
        .eq('id', item.id);
    }
  },

  /**
   * Toggle active state
   */
  async toggleActive(id: string, is_active: boolean): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase
      .from('homepage_showcase')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to toggle showcase active status.');
    }
  },
};
