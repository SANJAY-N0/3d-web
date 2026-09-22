import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export interface SupportConfig {
  phone: string;
  whatsapp: string;
  altPhone?: string;
}

export const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  phone: '+91 9894709708',
  whatsapp: '+91 8056709708',
};

// In-memory cache
let cachedSupportConfig: SupportConfig | null = null;

/**
 * Converts any phone/WhatsApp input into the official WhatsApp API format
 * e.g. "+91 8056709708" -> "918056709708"
 *      "8056709708"     -> "918056709708"
 */
export function formatWhatsAppNumber(whatsappNumber: string): string {
  let cleaned = (whatsappNumber || '').replace(/\D/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = '91' + cleaned.slice(1);
  } else if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned || '918056709708';
}

/**
 * Generates direct WhatsApp API URL using the phone parameter
 * Format: https://api.whatsapp.com/send?phone=918056709708&text=...
 */
export function getWhatsAppLink(whatsappNumber: string, message?: string): string {
  const cleanNumber = formatWhatsAppNumber(whatsappNumber);
  const encodedText = message
    ? encodeURIComponent(message)
    : encodeURIComponent('Hello PrintLab 3D! I have an enquiry about an order.');
  return `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${encodedText}`;
}

/**
 * Retrieves synchronous customer support contact settings (memory / localStorage / defaults)
 */
export function getSupportConfig(): SupportConfig {
  if (cachedSupportConfig) {
    return cachedSupportConfig;
  }

  if (typeof window !== 'undefined') {
    let phone = localStorage.getItem('printlab_support_phone');
    let whatsapp = localStorage.getItem('printlab_support_whatsapp');
    let altPhone = localStorage.getItem('printlab_support_alt_phone');

    if (phone && phone.includes('98765')) {
      localStorage.removeItem('printlab_support_phone');
      phone = null;
    }
    if (whatsapp && whatsapp.includes('98765')) {
      localStorage.removeItem('printlab_support_whatsapp');
      whatsapp = null;
    }
    if (altPhone && altPhone.includes('98765')) {
      localStorage.removeItem('printlab_support_alt_phone');
      altPhone = null;
    }

    cachedSupportConfig = {
      phone: phone && phone.trim() ? phone.trim() : DEFAULT_SUPPORT_CONFIG.phone,
      whatsapp: whatsapp && whatsapp.trim() ? whatsapp.trim() : DEFAULT_SUPPORT_CONFIG.whatsapp,
      altPhone: altPhone && altPhone.trim() ? altPhone.trim() : undefined,
    };
    return cachedSupportConfig;
  }

  return DEFAULT_SUPPORT_CONFIG;
}

/**
 * Asynchronously fetch latest support settings from Supabase database or backend API
 */
export async function fetchSupportConfigFromDB(): Promise<SupportConfig> {
  let dbWhatsapp = '';
  let dbPhone = '';
  let dbAlt = '';

  // 1. Try Supabase directly
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['support_whatsapp', 'support_phone', 'support_alt_phone']);

      if (!error && data && data.length > 0) {
        for (const row of data) {
          if (row.key === 'support_whatsapp' && row.value) dbWhatsapp = row.value.trim();
          if (row.key === 'support_phone' && row.value) dbPhone = row.value.trim();
          if (row.key === 'support_alt_phone' && row.value) dbAlt = row.value.trim();
        }
      }
    } catch (err) {
      console.warn('Supabase fetch support settings warning:', err);
    }
  }

  // 2. Try Server API fallback if not found
  if (!dbWhatsapp) {
    try {
      const res = await fetch('/api/settings/support');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.support_whatsapp) dbWhatsapp = json.support_whatsapp.trim();
          if (json.support_phone) dbPhone = json.support_phone.trim();
          if (json.support_alt_phone) dbAlt = json.support_alt_phone.trim();
        }
      }
    } catch {
      // ignore
    }
  }

  const updated: SupportConfig = {
    phone: dbPhone || localStorage.getItem('printlab_support_phone') || DEFAULT_SUPPORT_CONFIG.phone,
    whatsapp: dbWhatsapp || localStorage.getItem('printlab_support_whatsapp') || DEFAULT_SUPPORT_CONFIG.whatsapp,
    altPhone: dbAlt || localStorage.getItem('printlab_support_alt_phone') || undefined,
  };

  cachedSupportConfig = updated;

  if (typeof window !== 'undefined') {
    if (updated.phone) localStorage.setItem('printlab_support_phone', updated.phone);
    if (updated.whatsapp) localStorage.setItem('printlab_support_whatsapp', updated.whatsapp);
    if (updated.altPhone) localStorage.setItem('printlab_support_alt_phone', updated.altPhone);
    window.dispatchEvent(new CustomEvent('printlab_support_settings_updated', { detail: updated }));
  }

  return updated;
}

/**
 * React hook to get real-time updated support configuration
 */
export function useSupportConfig(): SupportConfig {
  const [config, setConfig] = useState<SupportConfig>(() => getSupportConfig());

  useEffect(() => {
    // 1. Initial fetch from database
    fetchSupportConfigFromDB().then((data) => {
      setConfig(data);
    });

    // 2. Listen to custom window update events (e.g. when changed in AdminSettings)
    const handleUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        setConfig(getSupportConfig());
      }
    };
    window.addEventListener('printlab_support_settings_updated', handleUpdate);

    // 3. Supabase Realtime listener on settings table
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel('support-settings-realtime-listener')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'settings' },
          (payload: any) => {
            const newRow = payload.new;
            if (
              newRow &&
              (newRow.key === 'support_whatsapp' ||
                newRow.key === 'support_phone' ||
                newRow.key === 'support_alt_phone')
            ) {
              fetchSupportConfigFromDB().then((data) => {
                setConfig(data);
              });
            }
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('printlab_support_settings_updated', handleUpdate);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return config;
}
