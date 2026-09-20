import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CustomerUser, AdminUser, AuthUser } from '../types';

export type { CustomerUser, AdminUser, AuthUser };

const ADMIN_SESSION_KEY = 'printlab_admin_session';
const CUSTOMER_SESSION_KEY = 'printlab_customer_session';

export const authService = {
  // ================= ADMIN AUTH =================
  async getCurrentUser(): Promise<AdminUser | null> {
    return this.getCurrentAdmin();
  },

  async getCurrentAdmin(): Promise<AdminUser | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          return {
            id: session.user.id,
            email: session.user.email || '',
            role: 'admin',
            name: session.user.user_metadata?.name || 'Administrator',
          };
        }
      } catch (err) {
        console.warn('Supabase auth session check failed:', err);
      }
    }

    try {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<AdminUser> {
    return this.loginAdmin(email, password);
  },

  async loginAdmin(email: string, password: string): Promise<AdminUser> {
    if (!email || !password) {
      throw new Error('Please provide both email and password.');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw new Error(error.message);

      const user: AdminUser = {
        id: data.user.id,
        email: data.user.email || email.trim(),
        role: 'admin',
        name: data.user.user_metadata?.name || 'Administrator',
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
      return user;
    }

    // Local fallback for standalone environments
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.includes('@') && password.length >= 6) {
      const user: AdminUser = {
        id: 'admin-' + Date.now(),
        email: normalizedEmail,
        role: 'admin',
        name: 'Administrator',
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
      return user;
    }

    throw new Error('Invalid administrator credentials.');
  },

  async logout(): Promise<void> {
    await this.logoutAdmin();
  },

  async logoutAdmin(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout failed:', err);
      }
    }
    localStorage.removeItem(ADMIN_SESSION_KEY);
  },

  isAuthenticated(): boolean {
    return this.isAdminAuthenticated();
  },

  isAdminAuthenticated(): boolean {
    return Boolean(localStorage.getItem(ADMIN_SESSION_KEY));
  },

  // ================= CUSTOMER AUTH =================
  getCurrentCustomer(): CustomerUser | null {
    try {
      const stored = localStorage.getItem(CUSTOMER_SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  isCustomerAuthenticated(): boolean {
    return Boolean(localStorage.getItem(CUSTOMER_SESSION_KEY));
  },

  async checkCustomerExistsAsync(identifier: string): Promise<boolean> {
    if (!identifier || !identifier.trim()) return false;
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');

    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('customers').select('id, email, phone');
        if (clean.includes('@')) {
          query = query.eq('email', clean);
        } else if (cleanPhone.length >= 10) {
          query = query.eq('phone', cleanPhone);
        } else {
          return false;
        }
        const { data, error } = await query.maybeSingle();
        if (!error && data) return true;
      } catch {
        // Continue to local check
      }
    }

    const localCust = this.getCurrentCustomer();
    if (localCust) {
      if (localCust.email?.toLowerCase() === clean) return true;
      if (cleanPhone.length >= 10 && localCust.phone?.replace(/\D/g, '') === cleanPhone) return true;
    }
    return false;
  },

  checkCustomerExists(identifier: string): boolean {
    if (!identifier || !identifier.trim()) return false;
    const clean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');

    const current = this.getCurrentCustomer();
    if (current) {
      if (current.email?.toLowerCase() === clean) return true;
      if (cleanPhone.length >= 10 && current.phone?.replace(/\D/g, '') === cleanPhone) return true;
    }
    return false;
  },

  async loginCustomer(identifier: string, password?: string): Promise<CustomerUser> {
    const idClean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');

    if (!identifier.trim()) {
      throw new Error('Please enter your email or phone number.');
    }

    // 1. Supabase Auth authentication if configured
    if (isSupabaseConfigured && supabase) {
      let emailToAuth = idClean.includes('@') ? idClean : '';

      // If phone provided, lookup associated email from customers table
      if (!emailToAuth && cleanPhone.length >= 10) {
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (custData && custData.email) {
          emailToAuth = custData.email;
        }
      }

      if (emailToAuth && password) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailToAuth,
          password,
        });

        if (authError) {
          throw new Error(authError.message || 'Invalid email or password.');
        }

        // Fetch customer profile
        const { data: profile } = await supabase
          .from('customers')
          .select('*')
          .or(`auth_user_id.eq.${authData.user.id},email.eq.${emailToAuth}`)
          .maybeSingle();

        const sessionUser: CustomerUser = {
          id: profile?.id || authData.user.id,
          auth_user_id: authData.user.id,
          name: profile?.name || authData.user.user_metadata?.name || emailToAuth.split('@')[0],
          email: emailToAuth,
          phone: profile?.phone || '',
          college: profile?.college,
          college_type: profile?.college_type || 'KPR College',
          roll_number: profile?.roll_number,
          delivery_method: profile?.delivery_method || 'college_delivery',
          department: profile?.department,
          year: profile?.year,
          section: profile?.section,
          building_block: profile?.building_block,
          pickup_location: profile?.pickup_location,
          address: profile?.address || '',
          city: profile?.city || 'Coimbatore',
          state: profile?.state || 'Tamil Nadu',
          pincode: profile?.pincode || '641407',
          role: 'customer',
          created_at: profile?.created_at || new Date().toISOString(),
        };

        localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessionUser));
        return sessionUser;
      }
    }

    // 2. Local session check
    const current = this.getCurrentCustomer();
    if (current) {
      const emailMatch = current.email && current.email.toLowerCase() === idClean;
      const phoneMatch = cleanPhone.length >= 10 && current.phone && current.phone.replace(/\D/g, '') === cleanPhone;
      if (emailMatch || phoneMatch) {
        return current;
      }
    }

    throw new Error('Account not found with this email or phone. Please register to create an account.');
  },

  async signupCustomer(data: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    college_type?: 'KPR College' | 'Other';
    college?: string;
    roll_number?: string;
    delivery_method?: 'college_delivery' | 'home_delivery';
    department?: string;
    year?: string;
    section?: string;
    building_block?: string;
    pickup_location?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }): Promise<CustomerUser> {
    const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
    const collegeType = data.college_type || (data.college?.toLowerCase().includes('kpr') ? 'KPR College' : 'Other');
    const collegeName = collegeType === 'KPR College' ? 'KPR College' : (data.college?.trim() || 'Other College');

    let authUserId: string | undefined = undefined;

    // 1. Register with Supabase Auth if configured and password provided
    if (isSupabaseConfigured && supabase && data.password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: {
              name: data.name.trim(),
              phone: cleanPhone,
            },
          },
        });

        if (authError) {
          // If user already registered, advise login
          if (authError.message.includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in.');
          }
          throw new Error(authError.message);
        }

        if (authData.user) {
          authUserId = authData.user.id;
        }
      } catch (err: any) {
        throw new Error(err.message || 'Supabase authentication failed.');
      }
    }

    // 2. Persist customer profile to Supabase `customers` table
    let customerId = 'cust-' + Date.now();
    if (isSupabaseConfigured && supabase) {
      try {
        const customerRow = {
          auth_user_id: authUserId,
          name: data.name.trim(),
          phone: cleanPhone,
          email: cleanEmail,
          college: collegeName,
          college_type: collegeType,
          roll_number: data.roll_number?.trim() || '',
          delivery_method: data.delivery_method || (collegeType === 'KPR College' ? 'college_delivery' : 'home_delivery'),
          department: data.department?.trim() || '',
          year: data.year?.trim() || '',
          section: data.section?.trim() || '',
          building_block: data.building_block?.trim() || '',
          pickup_location: data.pickup_location?.trim() || '',
          address: data.address?.trim() || (collegeType === 'KPR College' ? 'KPR College Campus' : 'Delivery Address'),
          city: data.city?.trim() || 'Coimbatore',
          state: data.state?.trim() || 'Tamil Nadu',
          pincode: data.pincode?.trim() || '641407',
        };

        const { data: inserted, error: insertError } = await supabase
          .from('customers')
          .insert([customerRow])
          .select()
          .single();

        if (!insertError && inserted) {
          customerId = inserted.id;
        }
      } catch (err) {
        console.warn('Customer profile insert error:', err);
      }
    }

    // 3. Create session user object (NEVER storing raw password)
    const newCustomer: CustomerUser = {
      id: customerId,
      auth_user_id: authUserId,
      name: data.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      college_type: collegeType,
      college: collegeName,
      roll_number: data.roll_number?.trim() || '',
      delivery_method: data.delivery_method || (collegeType === 'KPR College' ? 'college_delivery' : 'home_delivery'),
      department: data.department?.trim() || '',
      year: data.year?.trim() || '',
      section: data.section?.trim() || '',
      building_block: data.building_block?.trim() || '',
      pickup_location: data.pickup_location?.trim() || '',
      address: data.address?.trim() || (collegeType === 'KPR College' ? 'KPR College Campus' : 'Delivery Address'),
      city: data.city?.trim() || 'Coimbatore',
      state: data.state?.trim() || 'Tamil Nadu',
      pincode: data.pincode?.trim() || '641407',
      role: 'customer',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(newCustomer));
    return newCustomer;
  },

  async resetCustomerPassword(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw new Error(error.message);
      return;
    }

    // In offline mode
    throw new Error('Password reset requires an active Supabase connection.');
  },

  async updateCustomerProfile(updates: Partial<CustomerUser>): Promise<CustomerUser> {
    const current = this.getCurrentCustomer();
    if (!current) throw new Error('Not authenticated as customer');

    const updated: CustomerUser = {
      ...current,
      ...updates,
    };

    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured && supabase && updated.id) {
      try {
        await supabase
          .from('customers')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', updated.id);
      } catch (err) {
        console.warn('Customer profile update in Supabase failed:', err);
      }
    }

    return updated;
  },

  async logoutCustomer(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase customer signout failed:', err);
      }
    }
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
  }
};
