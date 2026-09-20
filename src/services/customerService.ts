import { Customer } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const CUSTOMERS_STORAGE_KEY = 'printlab_customers_data_v1';

function getLocalCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCustomers(customers: Customer[]): void {
  localStorage.setItem(CUSTOMERS_STORAGE_KEY, JSON.stringify(customers));
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
        const { data, error } = await supabase.from('customers').insert([customerData]).select().single();
        if (error) throw error;
        if (data) return data as Customer;
      } catch (err) {
        console.warn('Supabase customer insert error, saving locally:', err);
      }
    }

    const current = getLocalCustomers();
    // check if phone already exists
    const existingIndex = current.findIndex(c => c.phone === customerData.phone);
    if (existingIndex !== -1) {
      const updated = {
        ...current[existingIndex],
        ...customerData,
        updated_at: new Date().toISOString(),
      };
      current[existingIndex] = updated;
      saveLocalCustomers(current);
      return updated;
    }

    const updated = [newCustomer, ...current];
    saveLocalCustomers(updated);
    return newCustomer;
  },

  async getAll(): Promise<Customer[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) return data as Customer[];
      } catch (err) {
        console.warn('Supabase fetch customers failed:', err);
      }
    }
    return getLocalCustomers();
  },

  async getById(id: string): Promise<Customer | null> {
    const all = await this.getAll();
    return all.find((c) => c.id === id) || null;
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
        if (data) return data as Customer;
      } catch (err) {
        console.warn('Supabase customer update error, updating locally:', err);
      }
    }

    const current = getLocalCustomers();
    const index = current.findIndex((c) => c.id === id);
    if (index !== -1) {
      current[index] = {
        ...current[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      saveLocalCustomers(current);
      return current[index];
    }
    return null;
  },

  async upsertCustomer(customerData: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    return this.createOrUpdate(customerData);
  }
};
