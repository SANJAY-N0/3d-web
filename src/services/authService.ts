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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.user) {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          return null;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          return null;
        }

        // Strictly verify user exists in admins table with role = 'admin'
        const { data: adminRecord, error: adminErr } = await supabase
          .from('admins')
          .select('id, email, name, role')
          .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
          .eq('role', 'admin')
          .maybeSingle();

        if (adminErr || !adminRecord) {
          localStorage.removeItem(ADMIN_SESSION_KEY);
          return null;
        }

        return {
          id: user.id,
          email: adminRecord.email || user.email || '',
          role: 'admin',
          name: adminRecord.name || user.user_metadata?.name || 'Administrator',
        };
      } catch (err) {
        console.warn('Supabase auth session check failed:', err);
        localStorage.removeItem(ADMIN_SESSION_KEY);
        return null;
      }
    }

    return null;
  },

  async login(email: string, password: string): Promise<AdminUser> {
    return this.loginAdmin(email, password);
  },

  async loginAdmin(email: string, password: string): Promise<AdminUser> {
    if (!email || !password) {
      throw new Error('Please provide both email and password.');
    }

    if (!isSupabaseConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please check your environment variables.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.user) {
      throw new Error('No user returned from Supabase authentication.');
    }

    // Strictly verify the user exists in the admins table with role = 'admin'
    const { data: adminRecord, error: adminErr } = await supabase
      .from('admins')
      .select('*')
      .or(`auth_user_id.eq.${data.user.id},email.eq.${data.user.email}`)
      .eq('role', 'admin')
      .maybeSingle();

    if (adminErr || !adminRecord) {
      // Reject login immediately and sign out from Supabase Auth
      await supabase.auth.signOut();
      localStorage.removeItem(ADMIN_SESSION_KEY);
      throw new Error('Access denied. This account does not have administrator privileges.');
    }

    // Link auth_user_id if not linked yet
    if (!adminRecord.auth_user_id) {
      await supabase
        .from('admins')
        .update({ auth_user_id: data.user.id })
        .eq('id', adminRecord.id);
    }

    const user: AdminUser = {
      id: data.user.id,
      email: adminRecord.email || data.user.email || email.trim(),
      role: 'admin',
      name: adminRecord.name || data.user.user_metadata?.name || 'Administrator',
    };
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(user));
    return user;
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
        // Fallback to local check
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

    if (!password) {
      throw new Error('Please enter your password.');
    }

    // 1. Supabase Auth authentication if configured
    if (isSupabaseConfigured && supabase) {
      let emailToAuth = idClean.includes('@') ? idClean : '';

      // If phone provided instead of email, lookup associated email from customers table
      if (!emailToAuth && cleanPhone.length >= 10) {
        const { data: custData, error: custLookupErr } = await supabase
          .from('customers')
          .select('email')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (custLookupErr) {
          console.warn('Phone lookup in customers table warning:', custLookupErr);
        }

        if (custData && custData.email) {
          emailToAuth = custData.email.trim().toLowerCase();
        } else {
          throw new Error('No account found with this phone number. Please use your email or register a new account.');
        }
      }

      if (!emailToAuth) {
        throw new Error('Please provide a valid email address or 10-digit registered phone number.');
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailToAuth,
        password,
      });

      if (authError) {
        const msg = authError.message || '';
        // Handle unconfirmed email error specifically
        if (msg.toLowerCase().includes('email not confirmed') || (authError as any).code === 'email_not_confirmed') {
          const err: any = new Error('Please confirm your email before signing in.');
          err.code = 'email_not_confirmed';
          err.email = emailToAuth;
          throw err;
        }

        if (msg.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Invalid email or password. Please verify your credentials and try again.');
        }

        throw new Error(msg || 'Invalid email or password.');
      }

      if (!authData?.user) {
        throw new Error('Login failed. No user returned from authentication service.');
      }

      // Fetch or link customer profile
      let profile: any = null;
      try {
        const { data: existingProfile } = await supabase
          .from('customers')
          .select('*')
          .or(`auth_user_id.eq.${authData.user.id},email.eq.${emailToAuth}`)
          .maybeSingle();

        profile = existingProfile;

        // If profile exists without auth_user_id, link it now
        if (profile && !profile.auth_user_id) {
          await supabase
            .from('customers')
            .update({ auth_user_id: authData.user.id })
            .eq('id', profile.id);
        } else if (!profile) {
          // If no profile exists yet, create one linking to auth_user_id
          const newProfile = {
            auth_user_id: authData.user.id,
            name: authData.user.user_metadata?.name || emailToAuth.split('@')[0],
            email: emailToAuth,
            phone: authData.user.user_metadata?.phone || cleanPhone || '',
            college: 'KPR College',
            college_type: 'KPR College',
            delivery_method: 'college_delivery',
            address: 'KPR College Campus',
            city: 'Coimbatore',
            state: 'Tamil Nadu',
            pincode: '641407',
          };
          const { data: inserted } = await supabase
            .from('customers')
            .insert([newProfile])
            .select()
            .maybeSingle();
          profile = inserted;
        }
      } catch (err) {
        console.warn('Customer profile lookup/link warning:', err);
      }

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

    // 2. Offline fallback
    const current = this.getCurrentCustomer();
    if (current) {
      const emailMatch = current.email && current.email.toLowerCase() === idClean;
      const phoneMatch = cleanPhone.length >= 10 && current.phone && current.phone.replace(/\D/g, '') === cleanPhone;
      if (emailMatch || phoneMatch) {
        return current;
      }
    }

    throw new Error('Account not found. Please register to create an account.');
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
  }): Promise<CustomerUser & { needsEmailConfirmation?: boolean }> {
    const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : '';
    const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
    const collegeType = data.college_type || (data.college?.toLowerCase().includes('kpr') ? 'KPR College' : 'Other');
    const collegeName = collegeType === 'KPR College' ? 'KPR College' : (data.college?.trim() || 'Other College');

    if (!data.password || data.password.length < 6) {
      throw new Error('Password is required and must be at least 6 characters.');
    }

    let authUserId: string | undefined = undefined;
    let needsEmailConfirmation = false;

    // 1. Register with Supabase Auth (pure authentication)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: data.password,
          options: {
            data: {
              name: data.name.trim(),
              phone: cleanPhone,
            },
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });

        if (authError) {
          if (authError.message.toLowerCase().includes('already registered')) {
            throw new Error('An account with this email already exists. Please sign in with your password.');
          }
          throw new Error(authError.message);
        }

        if (authData.user) {
          authUserId = authData.user.id;
          // If session is null, email confirmation is required by Supabase project settings
          if (!authData.session) {
            needsEmailConfirmation = true;
          }
        }
      } catch (err: any) {
        throw new Error(err.message || 'Supabase authentication failed.');
      }
    }

    // 2. Persist customer profile to Supabase `customers` table
    // NOTE: PASSWORDS ARE NEVER STORED IN THE CUSTOMERS TABLE. Passwords belong solely to Supabase Auth.
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
          .maybeSingle();

        if (!insertError && inserted) {
          customerId = inserted.id;
        }
      } catch (err) {
        console.warn('Customer profile insert error:', err);
      }
    }

    // 3. Create session customer object
    const newCustomer: CustomerUser & { needsEmailConfirmation?: boolean } = {
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
      needsEmailConfirmation,
    };

    // Only set active session if email confirmation was not required or already confirmed
    if (!needsEmailConfirmation) {
      localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(newCustomer));
    }

    return newCustomer;
  },

  async resendConfirmationEmail(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to resend confirmation email.');
      }
      return;
    }

    throw new Error('Supabase is not configured.');
  },

  async resetCustomerPassword(email: string): Promise<void> {
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });
      if (error) throw new Error(error.message);
      return;
    }

    throw new Error('Password reset requires an active Supabase connection.');
  },

  async updateCustomerPassword(newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw new Error(error.message || 'Failed to update password.');
      }
      return;
    }

    throw new Error('Password update requires an active Supabase connection.');
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
