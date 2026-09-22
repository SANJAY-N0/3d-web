import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DEFAULT_UPI_ID, DEFAULT_BUSINESS_NAME } from '../lib/upiUtils';
import { DEFAULT_SUPPORT_CONFIG } from '../lib/supportConfig';
import { DEFAULT_CLOUDINARY_CLOUD_NAME, getCloudinaryDefaultFolder } from '../lib/cloudinary';

export interface SettingItem {
  key: string;
  value: string;
  description?: string;
  updated_at?: string;
}

const SETTINGS_STORAGE_PREFIX = 'printlab_setting_';

// Default system settings map
const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  merchant_upi_id: {
    value: DEFAULT_UPI_ID,
    description: 'Merchant UPI ID for customer QR code and payment intent generation',
  },
  merchant_name: {
    value: DEFAULT_BUSINESS_NAME,
    description: 'Merchant Payee Display Name shown during UPI checkout',
  },
  support_phone: {
    value: DEFAULT_SUPPORT_CONFIG.phone,
    description: 'Primary customer support phone number',
  },
  support_whatsapp: {
    value: DEFAULT_SUPPORT_CONFIG.whatsapp,
    description: 'Customer care WhatsApp contact number',
  },
  support_alt_phone: {
    value: '',
    description: 'Alternative customer support phone number',
  },
  cloudinary_cloud_name: {
    value: DEFAULT_CLOUDINARY_CLOUD_NAME,
    description: 'Cloudinary cloud name for product media assets',
  },
  cloudinary_folder: {
    value: getCloudinaryDefaultFolder(),
    description: 'Cloudinary root upload folder for 3D product showcase',
  },
};

export const settingsService = {
  /**
   * Fetch all settings from Supabase (with localStorage fallback)
   */
  async getAll(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    // 1. Initialize with defaults
    for (const [key, item] of Object.entries(DEFAULT_SETTINGS)) {
      result[key] = item.value;
    }

    // 2. Overlay localStorage
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      const localVal = localStorage.getItem(`${SETTINGS_STORAGE_PREFIX}${key}`) ||
                       localStorage.getItem(`printlab_${key}`);
      if (localVal !== null) {
        result[key] = localVal;
      }
    }

    // 3. Fetch latest from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('settings').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          for (const row of data) {
            result[row.key] = row.value;
            // Keep localStorage in sync
            localStorage.setItem(`${SETTINGS_STORAGE_PREFIX}${row.key}`, row.value);
          }
        }
      } catch (err) {
        console.warn('Supabase settings fetch failed, using local/default:', err);
      }
    }

    return result;
  },

  /**
   * Get single setting value by key
   */
  async get(key: string): Promise<string> {
    // Check Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', key)
          .maybeSingle();
        if (error) throw error;
        if (data?.value !== undefined) {
          localStorage.setItem(`${SETTINGS_STORAGE_PREFIX}${key}`, data.value);
          return data.value;
        }
      } catch (err) {
        console.warn(`Supabase fetch setting '${key}' failed:`, err);
      }
    }

    // Fallback to localStorage
    const local = localStorage.getItem(`${SETTINGS_STORAGE_PREFIX}${key}`) ||
                  localStorage.getItem(`printlab_${key}`);
    if (local !== null) return local;

    // Fallback to default
    return DEFAULT_SETTINGS[key]?.value || '';
  },

  /**
   * Save a single setting
   */
  async set(key: string, value: string, description?: string): Promise<void> {
    // 1. Update localStorage
    localStorage.setItem(`${SETTINGS_STORAGE_PREFIX}${key}`, value);
    // Backward-compat keys used in existing components
    if (key === 'merchant_upi_id') localStorage.setItem('printlab_merchant_upi_id', value);
    if (key === 'merchant_name') localStorage.setItem('printlab_merchant_name', value);
    if (key === 'support_phone') localStorage.setItem('printlab_support_phone', value);
    if (key === 'support_whatsapp') localStorage.setItem('printlab_support_whatsapp', value);
    if (key === 'support_alt_phone') localStorage.setItem('printlab_support_alt_phone', value);
    if (key === 'cloudinary_cloud_name') localStorage.setItem('printlab_cloudinary_cloud_name', value);
    if (key === 'cloudinary_folder') localStorage.setItem('printlab_cloudinary_folder', value);

    // 2. Persist to Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('settings').upsert({
          key,
          value,
          description: description || DEFAULT_SETTINGS[key]?.description || '',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'key' });

        if (error) throw error;
      } catch (err) {
        console.warn(`Supabase save setting '${key}' failed:`, err);
      }
    }

    if (typeof window !== 'undefined' && (key === 'support_whatsapp' || key === 'support_phone' || key === 'support_alt_phone')) {
      window.dispatchEvent(new CustomEvent('printlab_support_settings_updated'));
    }
  },

  /**
   * Save multiple settings in batch
   */
  async setMany(settings: Record<string, string>): Promise<void> {
    const promises = Object.entries(settings).map(([k, v]) => this.set(k, v));
    await Promise.all(promises);
  }
};
