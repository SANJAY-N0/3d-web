import { z } from 'zod';

export const customerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name (at least 2 characters).'),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number.'),
    email: z
      .string()
      .trim()
      .email('Please enter a valid email address.'),
    college_type: z.enum(['KPR College', 'Other']).default('KPR College'),
    college: z.string().optional().or(z.literal('')),
    roll_number: z.string().optional().or(z.literal('')),
    delivery_method: z.enum(['college_delivery', 'home_delivery']).default('college_delivery'),

    // KPR College delivery fields
    department: z.string().optional().or(z.literal('')),
    year: z.string().optional().or(z.literal('')),
    section: z.string().optional().or(z.literal('')),
    building_block: z.string().optional().or(z.literal('')),
    pickup_location: z.string().optional().or(z.literal('')),

    // Home delivery fields
    address: z.string().optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
    state: z.string().optional().or(z.literal('')),
    pincode: z.string().optional().or(z.literal('')),
  })
  // College name validation for Other colleges
  .refine(
    (data) => {
      if (data.college_type === 'Other') {
        return !!data.college && data.college.trim().length >= 2;
      }
      return true;
    },
    {
      message: 'Please enter your College / Institution name.',
      path: ['college'],
    }
  )
  // Delivery method restriction: Only KPR College can use college_delivery
  .refine(
    (data) => {
      if (data.college_type === 'Other' && data.delivery_method === 'college_delivery') {
        return false;
      }
      return true;
    },
    {
      message: 'College delivery is available only within KPR College. Please select Home Delivery.',
      path: ['delivery_method'],
    }
  )
  // Home delivery validations
  .refine(
    (data) => {
      if (data.delivery_method === 'home_delivery') {
        return !!data.address && data.address.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'Please provide full street address (at least 5 characters).',
      path: ['address'],
    }
  )
  .refine(
    (data) => {
      if (data.delivery_method === 'home_delivery') {
        return !!data.city && data.city.trim().length >= 2;
      }
      return true;
    },
    {
      message: 'Please enter your city.',
      path: ['city'],
    }
  )
  .refine(
    (data) => {
      if (data.delivery_method === 'home_delivery') {
        return !!data.state && data.state.trim().length >= 2;
      }
      return true;
    },
    {
      message: 'Please enter your state.',
      path: ['state'],
    }
  )
  .refine(
    (data) => {
      if (data.delivery_method === 'home_delivery') {
        return !!data.pincode && /^\d{6}$/.test(data.pincode.trim());
      }
      return true;
    },
    {
      message: 'Please enter a valid 6-digit postal pincode.',
      path: ['pincode'],
    }
  )
  // College delivery validations
  .refine(
    (data) => {
      if (data.delivery_method === 'college_delivery') {
        return !!data.department && data.department.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please select your department at KPR College.',
      path: ['department'],
    }
  )
  .refine(
    (data) => {
      if (data.delivery_method === 'college_delivery') {
        return !!data.year && data.year.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please select your year of study.',
      path: ['year'],
    }
  )
  .refine(
    (data) => {
      if (data.delivery_method === 'college_delivery') {
        return !!data.building_block && data.building_block.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Please select your building or block.',
      path: ['building_block'],
    }
  );

export type CustomerFormData = z.infer<typeof customerSchema>;

export const customizationSchema = z.object({
  customText: z.string().max(40, 'Custom text cannot exceed 40 characters.').optional(),
  selectedColor: z.string().min(1, 'Please select a color.'),
  specialInstructions: z.string().max(250, 'Instructions cannot exceed 250 characters.').optional(),
});

export type CustomizationFormData = z.infer<typeof customizationSchema>;

export const studentSignupSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name (at least 2 characters).'),
    email: z.string().trim().email('Please enter a valid email address.'),
    phone: z.string().trim().regex(/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number.'),
    college_type: z.enum(['KPR College', 'Other']).default('KPR College'),
    college: z.string().optional(),
    roll_number: z.string().optional(),
    password: z.string().min(4, 'Password should be at least 4 characters.').optional(),
  })
  .refine(
    (data) => {
      if (data.college_type === 'Other') {
        return !!data.college && data.college.trim().length >= 2;
      }
      return true;
    },
    {
      message: 'Please enter your College / Institution name.',
      path: ['college'],
    }
  );

export type StudentSignupFormData = z.infer<typeof studentSignupSchema>;

export const productSchema = z.object({
  name: z.string().min(2, 'Product name is required.'),
  slug: z.string().min(2, 'Slug is required.').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  price: z.number().min(1, 'Price must be greater than 0.'),
  category: z.enum([
    'Keychains',
    'Desk Accessories',
    'Miniatures',
    'Phone Accessories',
    'Decorative Items',
    'College Products',
    'Custom Products',
    'Other',
  ]),
  material: z.string().min(2, 'Material is required (e.g. PLA, PETG, TPU).'),
  dimensions: z.string().min(2, 'Dimensions required (e.g. 50 x 30 x 15 mm).'),
  print_time: z.string().min(1, 'Print time required (e.g. 2h 30m).'),
  available_colors: z.array(z.string()).min(1, 'At least one color is required.'),
  image_url: z.string().url('Please enter a valid image URL.').or(z.string().startsWith('data:image')),
  gallery_urls: z.array(z.string()).default([]),
  model_url: z.string().optional(),
  model_type: z.enum(['mesh_vase', 'mesh_stand', 'mesh_keychain', 'mesh_planter', 'mesh_miniature', 'mesh_organizer', 'custom']).optional(),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export type ProductFormData = z.infer<typeof productSchema>;

export const adminLoginSchema = z.object({
  email: z.string().email('Please enter a valid admin email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

