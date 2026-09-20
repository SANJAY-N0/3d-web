export type OrderStatus =
  // Modern 6-stage tracker
  | 'ORDER_PLACED'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_PROCESSING'
  | 'PRODUCT_READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'PAYMENT_EXPIRED'
  // Legacy backward-compatibility aliases
  | 'PENDING_PAYMENT'
  | 'PENDING_PAYMENT_VERIFICATION'
  | 'PAYMENT_VERIFIED'
  | 'PRINTING'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED';

export type PaymentStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'VERIFIED'
  | 'REJECTED'
  | 'PENDING_REVIEW';

export type ScreenshotAnalysisStatus =
  | 'NOT_ANALYZED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'FAILED';

export type DetectedPaymentStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'PENDING'
  | 'UNKNOWN';

export type ProductCategory =
  | 'Keychains'
  | 'Desk Accessories'
  | 'Miniatures'
  | 'Phone Accessories'
  | 'Decorative Items'
  | 'College Products'
  | 'Custom Products'
  | 'Other';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: ProductCategory;
  material: string;
  dimensions: string;
  print_time: string;
  available_colors: string[];
  image_url: string;
  main_image?: string;
  gallery_urls: string[];
  gallery_images?: string[];
  public_id?: string;
  gallery_public_ids?: string[];
  model_url?: string;
  model_type?: 'mesh_vase' | 'mesh_stand' | 'mesh_keychain' | 'mesh_planter' | 'mesh_miniature' | 'mesh_organizer' | 'custom';
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface CloudinaryUploadResponse {
  success: boolean;
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
}

export interface CloudinaryConfigStatus {
  configured: boolean;
  cloudName: string;
}

export type CollegeType = 'KPR College' | 'Other';
export type DeliveryMethod = 'college_delivery' | 'home_delivery';

export interface Customer {
  id: string;
  auth_user_id?: string;
  name: string;
  phone: string;
  email?: string;
  college?: string;
  college_type?: CollegeType;
  roll_number?: string;
  delivery_method?: DeliveryMethod;
  // KPR College delivery fields
  department?: string;
  year?: string;
  section?: string;
  building_block?: string;
  pickup_location?: string;
  // Home delivery fields
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CustomizationData {
  customText?: string;
  selectedColor?: string;
  specialInstructions?: string;
  infillPercentage?: number;
}

export interface PaymentAnalysis {
  detected_upi_id?: string;
  detected_transaction_id?: string;
  detected_amount?: number;
  detected_payment_status?: DetectedPaymentStatus;
  ocr_confidence?: number;
  upi_match?: boolean;
  amount_match?: boolean;
  transaction_match?: boolean;
  is_duplicate_transaction?: boolean;
  duplicate_order_number?: string;
  screenshot_analysis_status?: ScreenshotAnalysisStatus;
  receiver_name?: string;
  sender_name?: string;
  payment_date?: string;
  payment_time?: string;
  warnings?: string[];
  raw_ocr_summary?: string;
}

export interface Payment extends PaymentAnalysis {
  id: string;
  order_id: string;
  amount: number;
  upi_id?: string;
  transaction_id?: string;
  screenshot_url?: string;
  payment_status: PaymentStatus;
  verified_by?: string;
  verified_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  customization?: CustomizationData;
  order_status: OrderStatus;
  payment_session_created_at?: string;
  payment_session_expires_at?: string;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  product?: Product;
  customer?: Customer;
  payment?: Payment;
}

export interface CustomerUser {
  id: string;
  auth_user_id?: string;
  name: string;
  email: string;
  phone: string;
  college?: string;
  college_type?: CollegeType;
  roll_number?: string;
  delivery_method?: DeliveryMethod;
  department?: string;
  year?: string;
  section?: string;
  building_block?: string;
  pickup_location?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role: 'customer';
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
  name?: string;
}

export type AuthUser = CustomerUser | AdminUser;

export interface AdminStats {
  totalProducts: number;
  availableProducts: number;
  totalOrders: number;
  pendingPaymentVerification: number;
  verifiedOrders: number;
  printingOrders: number;
  readyOrders: number;
  completedOrders: number;
  totalRevenue: number;
}

export interface ShowcaseItem {
  id: string;
  image_url: string;
  cloudinary_public_id?: string;
  title: string;
  subtitle: string;
  button_text: string;
  button_link: string;
  display_order: number;
  display_duration: number; // in seconds (2 - 60, default 5)
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

