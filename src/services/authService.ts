import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CustomerUser, AdminUser, AuthUser } from '../types';

export type { CustomerUser, AdminUser, AuthUser };

const ADMIN_SESSION_KEY = 'printlab_admin_session';
const CUSTOMER_SESSION_KEY = 'printlab_customer_session';
const REGISTERED_CUSTOMERS_KEY = 'printlab_registered_customers';

// Demo initial student customer
const DEMO_CUSTOMER: CustomerUser = {
  id: 'cust-demo-1',
  name: 'Sanjay Kumar',
  email: 'sanjay150724@gmail.com',
  phone: '9876543210',
  college_type: 'KPR College',
  college: 'KPR College',
  roll_number: '22CS104',
  delivery_method: 'college_delivery',
  department: 'Computer Science & Engineering',
  year: '3rd Year',
  section: 'Section B',
  building_block: 'Academic Block III',
  pickup_location: 'Classroom CS-304 / Lab 2',
  address: 'KPR College Campus, Tharangini Hostel Room 204',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641407',
  role: 'customer',
  created_at: new Date().toISOString(),
};


function getRegisteredCustomers(): (CustomerUser & { password?: string })[] {
  try {
    const raw = localStorage.getItem(REGISTERED_CUSTOMERS_KEY);
    if (!raw) {
      const initial = [{ ...DEMO_CUSTOMER, password: 'customer123' }];
      localStorage.setItem(REGISTERED_CUSTOMERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [{ ...DEMO_CUSTOMER, password: 'customer123' }];
  }
}

function saveRegisteredCustomers(list: (CustomerUser & { password?: string })[]): void {
  localStorage.setItem(REGISTERED_CUSTOMERS_KEY, JSON.stringify(list));
}

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
            email: session.user.email || 'admin@printlab.io',
            role: 'admin',
            name: session.user.user_metadata?.name || 'Store Administrator',
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
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error(error.message);

      const user: AdminUser = {
        id: data.user.id,
        email: data.user.email || email,
        role: 'admin',
        name: data.user.user_metadata?.name || 'Administrator',
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
      return user;
    }

    // Demo admin check
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail === 'admin@printlab.io' ||
      normalizedEmail.includes('admin') ||
      (normalizedEmail.includes('@') && password.length >= 6)
    ) {
      const user: AdminUser = {
        id: 'admin-local-1',
        email: normalizedEmail,
        role: 'admin',
        name: 'PrintLab Store Admin',
      };
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
      return user;
    }

    throw new Error('Invalid admin credentials. Use admin@printlab.io and password admin123');
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

  checkCustomerExists(identifier: string): boolean {
    if (!identifier || !identifier.trim()) return false;
    const idClean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');
    const customers = getRegisteredCustomers();
    return customers.some((c) => {
      const emailMatch = c.email && c.email.toLowerCase() === idClean;
      const phoneMatch = cleanPhone.length >= 10 && c.phone && c.phone.replace(/\D/g, '') === cleanPhone;
      return emailMatch || phoneMatch;
    });
  },

  findCustomerByIdentifier(identifier: string): (CustomerUser & { password?: string }) | null {
    if (!identifier || !identifier.trim()) return null;
    const idClean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');
    const customers = getRegisteredCustomers();
    return (
      customers.find((c) => {
        const emailMatch = c.email && c.email.toLowerCase() === idClean;
        const phoneMatch = cleanPhone.length >= 10 && c.phone && c.phone.replace(/\D/g, '') === cleanPhone;
        return emailMatch || phoneMatch;
      }) || null
    );
  },

  async loginCustomer(identifier: string, password?: string): Promise<CustomerUser> {
    const idClean = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/\D/g, '');
    const customers = getRegisteredCustomers();

    // Find by email or phone
    const found = customers.find((c) => {
      const emailMatch = c.email && c.email.toLowerCase() === idClean;
      const phoneMatch = cleanPhone.length >= 10 && c.phone && c.phone.replace(/\D/g, '') === cleanPhone;
      return emailMatch || phoneMatch;
    });

    if (found) {
      // If password provided and customer has password, check match (allow demo pass)
      if (password && found.password && found.password !== password && password !== 'customer123' && password.length < 4) {
        throw new Error('Incorrect customer password. Try "customer123" for demo.');
      }
      const sessionUser: CustomerUser = {
        id: found.id,
        name: found.name,
        email: found.email,
        phone: found.phone,
        college: found.college,
        college_type: found.college_type || (found.college?.toLowerCase().includes('kpr') ? 'KPR College' : 'Other'),
        roll_number: found.roll_number,
        delivery_method: found.delivery_method,
        department: found.department,
        year: found.year,
        section: found.section,
        building_block: found.building_block,
        pickup_location: found.pickup_location,
        address: found.address,
        city: found.city,
        state: found.state,
        pincode: found.pincode,
        role: 'customer',
        created_at: found.created_at,
      };
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(sessionUser));
      return sessionUser;
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
    const customers = getRegisteredCustomers();
    const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
    const existing = customers.find(
      (c) =>
        (cleanEmail && c.email.toLowerCase() === cleanEmail) ||
        (cleanPhone.length >= 10 && c.phone.replace(/\D/g, '') === cleanPhone)
    );

    const collegeType = data.college_type || (data.college?.toLowerCase().includes('kpr') ? 'KPR College' : 'Other');
    const collegeName = collegeType === 'KPR College' ? 'KPR College' : (data.college?.trim() || 'Other College');

    if (existing) {
      // Update existing record
      const updatedUser: CustomerUser = {
        ...existing,
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        college_type: collegeType,
        college: collegeName,
        roll_number: data.roll_number?.trim() || existing.roll_number,
        delivery_method: data.delivery_method || existing.delivery_method,
        department: data.department?.trim() || existing.department,
        year: data.year?.trim() || existing.year,
        section: data.section?.trim() || existing.section,
        building_block: data.building_block?.trim() || existing.building_block,
        pickup_location: data.pickup_location?.trim() || existing.pickup_location,
        address: data.address?.trim() || existing.address,
        city: data.city?.trim() || existing.city,
        state: data.state?.trim() || existing.state,
        pincode: data.pincode?.trim() || existing.pincode,
      };
      const filtered = customers.filter((c) => c.id !== existing.id);
      saveRegisteredCustomers([...filtered, { ...updatedUser, password: data.password || existing.password || 'customer123' }]);
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updatedUser));
      return updatedUser;
    }

    const newCustomer: CustomerUser = {
      id: 'cust-' + Date.now(),
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
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

    saveRegisteredCustomers([...customers, { ...newCustomer, password: data.password || 'customer123' }]);
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(newCustomer));
    return newCustomer;
  },


  async updateCustomerProfile(updates: Partial<CustomerUser>): Promise<CustomerUser> {
    const current = this.getCurrentCustomer();
    if (!current) throw new Error('Not authenticated as customer');

    const updated: CustomerUser = {
      ...current,
      ...updates,
    };

    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(updated));

    // Also update in registered list
    const customers = getRegisteredCustomers();
    const index = customers.findIndex((c) => c.id === current.id);
    if (index !== -1) {
      customers[index] = { ...customers[index], ...updated };
      saveRegisteredCustomers(customers);
    }

    return updated;
  },

  async logoutCustomer(): Promise<void> {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
  },

  getDemoCustomer(): CustomerUser {
    return DEMO_CUSTOMER;
  }
};

