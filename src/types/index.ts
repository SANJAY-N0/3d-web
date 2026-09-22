export type OrderStatus =
  // Standard Live Orders & POS status values
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  // Modern 6-stage tracker
  | 'ORDER_PLACED'
  | 'PAYMENT_PROCESSING'
  | 'PAYMENT_CONFIRMED'
  | 'ORDER_PROCESSING'
  | 'PRODUCT_READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_FAILED'
  // Legacy backward-compatibility aliases
  | 'PENDING_PAYMENT'
  | 'PENDING_PAYMENT_VERIFICATION'
  | 'PAYMENT_VERIFIED'
  | 'PRINTING'
  | 'READY_FOR_PICKUP';

export type PaymentMethod = 'CASH' | 'ONLINE' | 'UPI';

export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CASH_PENDING'
  | 'CASH_RECEIVED'
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
  stock?: number;
  stock_quantity?: number;
  online_available?: boolean;
  on_spot_available?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
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

export interface DepartmentYear {
  id: string;
  department_id: string;
  year: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Department {
  id: string;
  college_name: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  years?: string[];
  department_years?: DepartmentYear[];
}

export interface AcademicImportDepartment {
  name: string;
  code: string;
  years: string[];
}

export interface AcademicImportData {
  college_code: string;
  departments: AcademicImportDepartment[];
}

export interface AcademicImportResult {
  success: boolean;
  departmentsCreated: number;
  departmentsSkipped: number;
  yearsCreated: number;
  yearsSkipped: number;
  message?: string;
}

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
  department_id?: string;
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
  payment_method?: PaymentMethod;
  payment_status: PaymentStatus;
  amount: number;
  upi_id?: string;
  transaction_id?: string;
  payment_gateway?: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  screenshot_url?: string;
  payment_screenshot_url?: string;
  verified_by?: string;
  verified_at?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  customization?: CustomizationData;
  created_at?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  total_amount: number;
  customization?: CustomizationData;
  payment_method?: PaymentMethod;
  payment_status?: PaymentStatus;
  order_status: OrderStatus;
  confirmed_at?: string;
  confirmed_by?: string;
  payment_session_created_at?: string;
  payment_session_expires_at?: string;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  product?: Product;
  customer?: Customer;
  payment?: Payment;
  order_items?: OrderItem[];
  items?: OrderItem[];
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
  department_id?: string;
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

export interface PosCartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PosBillRequest {
  items: { product_id: string; quantity: number }[];
  customer_name?: string;
  customer_mobile?: string;
  customer_email?: string;
  payment_method: 'CASH' | 'UPI' | 'ONLINE';
  cash_received?: number;
  change_amount?: number;
  transaction_id?: string;
  payment_screenshot_url?: string;
  discount?: number;
  tax?: number;
  notes?: string;
}

export interface BillingTransaction {
  id: string;
  bill_number: string;
  order_id: string;
  customer_name: string;
  customer_mobile: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  billing_status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
  cash_received?: number;
  change_amount?: number;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PosBillResponse {
  success: boolean;
  bill_number: string;
  order: Order;
  payment?: Payment;
  billing_transaction?: BillingTransaction;
  items: any[];
  summary: {
    subtotal: number;
    discount: number;
    tax: number;
    total_amount: number;
    cash_received?: number;
    change_amount?: number;
  };
}



