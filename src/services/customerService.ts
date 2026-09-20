import { Customer } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CURRENT_PROFILE_KEY = 'printlab_user_customer_profile';

// Clean up legacy all-customers cache if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('printlab_customers_data_v1');
  } catch {
    // ignore
  }
}

function isFakeCustomer(c: any): boolean {
  if (!c) return true;
  if (c.email && (c.email.includes('test.com') || c.email.includes('example.com'))) return true;
  return false;
}

function getLocalCustomerProfile(): Customer | null {
  try {
    const raw = localStorage.getItem(CURRENT_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isFakeCustomer(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

function saveLocalCustomerProfile(customer: Customer): void {
  if (!isFakeCustomer(customer)) {
    try {
      localStorage.setItem(CURRENT_PROFILE_KEY, JSON.stringify(customer));
    } catch {
      // ignore
    }
  }
}

export const customerService = {
  async createOrUpdate(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const newCustomer: Customer = {
      ...customerData,
      id: 'cust-' + Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        // Check if customer already exists by phone or email
        let query = supabase.from('customers').select('*');
        if (customerData.phone && customerData.email) {
          query = query.or(`phone.eq.${customerData.phone},email.eq.${customerData.email}`);
        } else if (customerData.phone) {
          query = query.eq('phone', customerData.phone);
        } else if (customerData.email) {
          query = query.eq('email', customerData.email);
        }

        const { data: existing, error: searchError } = await query.maybeSingle();
        if (searchError) throw searchError;

        if (existing) {
          // Update existing customer record in Supabase
          const { data: updated, error: updateError } = await supabase
            .from('customers')
            .update({
              ...customerData,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (updateError) throw updateError;
          if (updated) {
            saveLocalCustomerProfile(updated as Customer);
            return updated as Customer;
          }
        } else {
          // Insert new customer record in Supabase
          const { data: created, error: insertError } = await supabase
            .from('customers')
            .insert([customerData])
            .select()
            .single();

          if (insertError) throw insertError;
          if (created) {
            saveLocalCustomerProfile(created as Customer);
            return created as Customer;
          }
        }
      } catch (err) {
        console.error('Supabase customer createOrUpdate error:', err);
        throw err;
      }
    }

    throw new Error('Database service is not configured.');
  },

  async getAll(): Promise<Customer[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).filter((c) => !isFakeCustomer(c)) as Customer[];
      } catch (err) {
        console.warn('Supabase fetch customers failed:', err);
        return [];
      }
    }
    const current = getLocalCustomerProfile();
    return current ? [current] : [];
  },

  async getById(id: string): Promise<Customer | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        if (data && !isFakeCustomer(data)) return data as Customer;
      } catch (err) {
        console.warn('Supabase customer getById error:', err);
      }
    }

    const current = getLocalCustomerProfile();
    return current && current.id === id ? current : null;
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        if (data) {
          saveLocalCustomerProfile(data as Customer);
          return data as Customer;
        }
      } catch (err) {
        console.warn('Supabase customer update error, updating locally:', err);
      }
    }

    const current = getLocalCustomerProfile();
    if (current && current.id === id) {
      const updated = {
        ...current,
        ...updates,
        updated_at: new Date().toISOString(),
      };
      saveLocalCustomerProfile(updated);
      return updated;
    }
    return null;
  },

  async upsertCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    return this.createOrUpdate(customerData);
  }
};
