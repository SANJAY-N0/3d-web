import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Product, CustomizationData, CollegeType, DeliveryMethod } from '../types';
import { productService } from '../services/productService';
import { customerService } from '../services/customerService';
import { orderService } from '../services/orderService';
import { authService } from '../services/authService';
import { departmentService } from '../services/departmentService';
import { Department } from '../types';
import { StepProgress } from '../components/common/StepProgress';
import { formatINR } from '../lib/upiUtils';
import { customerSchema, CustomerFormData } from '../lib/validation';
import {
  User,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Building2,
  Home,
  Truck,
  Minus,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';

const KPR_DEPARTMENTS = [
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Data Science (AI & DS)',
  'Information Technology (IT)',
  'Electronics & Communication Engineering (ECE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'Electrical & Electronics Engineering (EEE)',
  'Biomedical Engineering (BME)',
  'Chemical Engineering',
  'Mechatronics Engineering',
  'MBA / Management',
  'Other / Faculty / Staff',
];

const KPR_BLOCKS = [
  'Main Academic Block',
  'Thillai Block',
  'Veena Block',
  'Mechanical & Civil Workshop Block',
  'Central Library & Innovation Lab',
  'Boys Hostel Block A / B / C',
  'Girls Hostel Block 1 / 2',
  'Campus Cafeteria & Food Court',
];

const YEARS = ['1st Year (Freshman)', '2nd Year', '3rd Year', 'Final Year (4th Year)', 'Postgraduate / Staff'];

export const OrderPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const loggedInCustomer = useMemo(() => authService.getCurrentCustomer(), []);

  const searchParams = new URLSearchParams(location.search);
  const paramProductId = searchParams.get('productId');
  const paramColor = searchParams.get('selectedColor');
  const paramQty = searchParams.get('quantity');

  const stateData = location.state as
    | {
        productId?: string;
        selectedColor?: string;
        quantity?: number;
      }
    | undefined;

  const targetProductId = stateData?.productId || paramProductId;
  const initialColor = stateData?.selectedColor || paramColor || 'Pure White';
  const initialQty = stateData?.quantity || (paramQty ? parseInt(paramQty, 10) : 1);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Order configuration
  const [quantity, setQuantity] = useState(initialQty || 1);
  const [customText, setCustomText] = useState('');
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH'>('ONLINE');

  // Customer form fields initialized directly
  const [customerForm, setCustomerForm] = useState<CustomerFormData>(() => ({
    name: loggedInCustomer?.name || '',
    phone: loggedInCustomer?.phone || '',
    email: loggedInCustomer?.email || '',
    college_type: (loggedInCustomer?.college_type as CollegeType) || 'KPR College',
    college: loggedInCustomer?.college || (loggedInCustomer?.college_type === 'Other' ? '' : 'KPR College'),
    roll_number: loggedInCustomer?.roll_number || '',
    delivery_method:
      loggedInCustomer?.college_type === 'Other'
        ? 'home_delivery'
        : (loggedInCustomer?.delivery_method as DeliveryMethod) || 'college_delivery',

    // KPR delivery fields
    department: loggedInCustomer?.department || KPR_DEPARTMENTS[0],
    year: loggedInCustomer?.year || YEARS[0],
    section: loggedInCustomer?.section || '',
    building_block: loggedInCustomer?.building_block || KPR_BLOCKS[0],
    pickup_location: loggedInCustomer?.pickup_location || '',

    // Home delivery fields
    address: loggedInCustomer?.address || '',
    city: loggedInCustomer?.city || 'Coimbatore',
    state: loggedInCustomer?.state || 'Tamil Nadu',
    pincode: loggedInCustomer?.pincode || '641407',
  }));

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    departmentService
      .getActive('KPR College')
      .then((data) => {
        if (data && data.length > 0) {
          setDepartments(data);
        }
      })
      .catch((err) => console.warn('Failed to load active departments in OrderPage:', err));
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);

    // Enforce authentication before checkout
    if (!authService.isCustomerAuthenticated()) {
      showToast('Please sign in or register to complete your 3D print order.', 'info');
      const params = new URLSearchParams();
      if (targetProductId) params.set('productId', targetProductId);
      if (selectedColor) params.set('selectedColor', selectedColor);
      if (quantity) params.set('quantity', String(quantity));
      const qs = params.toString();
      navigate(`/login?redirect=/order${qs ? `&${qs}` : ''}`);
      return;
    }

    // Sync latest customer profile into checkout form
    const currentCust = authService.getCurrentCustomer();
    if (currentCust) {
      setCustomerForm((prev) => ({
        ...prev,
        name: currentCust.name || prev.name,
        phone: currentCust.phone || prev.phone,
        email: currentCust.email || prev.email,
        college_type: (currentCust.college_type as CollegeType) || prev.college_type,
        college: currentCust.college || prev.college,
        roll_number: currentCust.roll_number || prev.roll_number,
        delivery_method:
          currentCust.college_type === 'Other'
            ? 'home_delivery'
            : (currentCust.delivery_method as DeliveryMethod) || prev.delivery_method,
        department: currentCust.department || prev.department,
        year: currentCust.year || prev.year,
        section: currentCust.section || prev.section,
        building_block: currentCust.building_block || prev.building_block,
        pickup_location: currentCust.pickup_location || prev.pickup_location,
        address: currentCust.address || prev.address,
        city: currentCust.city || prev.city,
        state: currentCust.state || prev.state,
        pincode: currentCust.pincode || prev.pincode,
      }));
    }

    const loadProduct = async () => {
      try {
        if (targetProductId) {
          const prod = await productService.getBySlugOrId(targetProductId);
          if (prod) {
            const colors =
              prod.available_colors && prod.available_colors.length > 0
                ? prod.available_colors.includes('Pure White') ||
                  prod.available_colors.includes('White') ||
                  prod.available_colors.includes('Arctic White')
                  ? prod.available_colors
                  : ['Pure White', ...prod.available_colors]
                : ['Pure White', 'Matte Black', 'Electric Blue'];

            setProduct({ ...prod, available_colors: colors });
            if (initialColor && colors.includes(initialColor)) {
              setSelectedColor(initialColor);
            } else {
              setSelectedColor(colors[0]);
            }
            return;
          }
        }
        // Fallback to first available product
        const all = await productService.getAll();
        if (all.length > 0) {
          const colors = all[0].available_colors?.length
            ? all[0].available_colors
            : ['Pure White', 'Matte Black', 'Electric Blue'];
          setProduct({ ...all[0], available_colors: colors });
          setSelectedColor(colors[0]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [targetProductId, initialColor]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-display font-bold text-2xl text-slate-900 dark:text-white">No Products Available</h2>
        <p className="text-sm text-slate-600 dark:text-neutral-400">
          There are currently no products available to order. Please check back later.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-xl text-cyan-700 dark:text-cyan-300 text-xs font-mono"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const unitPrice = product.price;
  const totalAmount = unitPrice * quantity;

  const handleFieldChange = (field: keyof CustomerFormData, value: any) => {
    let cleanVal = value;
    if (field === 'phone') {
      cleanVal = String(value || '').replace(/\D/g, '').slice(0, 10);
    }
    setCustomerForm((prev) => {
      const updated = { ...prev, [field]: cleanVal };
      // If user switches college_type to Other, automatically switch delivery to home_delivery
      if (field === 'college_type' && cleanVal === 'Other') {
        updated.delivery_method = 'home_delivery';
      }
      return updated;
    });

    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleContinueToPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate customer inputs with Zod
    const validationResult = customerSchema.safeParse(customerForm);
    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      validationResult.error.issues.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setFormErrors(fieldErrors);
      showToast('Please fill all required fields correctly.', 'error');
      return;
    }

    setIsCreatingOrder(true);

    try {
      // 2. Server-side validation enforcement
      try {
        const valRes = await fetch('/api/orders/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...customerForm,
            quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
          }),
        });
        const valText = await valRes.text();
        let valData: any = null;
        try {
          valData = valText ? JSON.parse(valText) : null;
        } catch {
          valData = null;
        }

        if (valData && (!valRes.ok || !valData.valid)) {
          if (valData.errors) {
            setFormErrors(valData.errors);
          }
          showToast(valData.message || 'Validation failed. Please verify details.', 'error');
          setIsCreatingOrder(false);
          return;
        }
      } catch (err) {
        console.warn('Backend validation network check:', err);
      }

      // 3. Format delivery address based on method
      let resolvedAddress = customerForm.address || '';
      if (customerForm.delivery_method === 'college_delivery') {
        resolvedAddress = `KPR Campus: Dept of ${customerForm.department}, ${customerForm.year}, Sec: ${customerForm.section || 'N/A'}, Block: ${customerForm.building_block}${customerForm.pickup_location ? ` (Point: ${customerForm.pickup_location})` : ''}`;
      }

      // 4. Create or update customer record
      const customerPayload = {
        auth_user_id: loggedInCustomer?.id || loggedInCustomer?.auth_user_id || undefined,
        name: customerForm.name,
        phone: customerForm.phone,
        email: customerForm.email,
        college_type: customerForm.college_type,
        college: customerForm.college_type === 'KPR College' ? 'KPR College' : customerForm.college,
        roll_number: customerForm.roll_number,
        delivery_method: customerForm.delivery_method,
        department: customerForm.department,
        department_id: customerForm.department_id || undefined,
        year: customerForm.year,
        section: customerForm.section,
        building_block: customerForm.building_block,
        pickup_location: customerForm.pickup_location,
        address: resolvedAddress,
        city: customerForm.delivery_method === 'college_delivery' ? 'Coimbatore' : customerForm.city,
        state: customerForm.delivery_method === 'college_delivery' ? 'Tamil Nadu' : customerForm.state,
        pincode: customerForm.delivery_method === 'college_delivery' ? '641407' : customerForm.pincode,
      };

      // 5. Prepare customization object
      const customizationData: CustomizationData = {
        customText: customText.trim() || undefined,
        selectedColor: selectedColor || undefined,
        specialInstructions: specialInstructions.trim() || undefined,
      };

      // 6. Create Order directly via backend API & Supabase
      const newOrder = await orderService.createOrder({
        customer: customerPayload,
        product_id: product.id,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        customization: customizationData,
        product,
        payment_method: paymentMethod,
      });

      // Store the active order ID in sessionStorage and localStorage for safe browser reload
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('printlab_last_order_id', newOrder.id);
          localStorage.setItem('printlab_last_order_id', newOrder.id);
        } catch {
          // ignore
        }
      }

      if (paymentMethod === 'CASH') {
        showToast('Cash order placed successfully! Live status updated.', 'success');
        navigate(`/track?order=${newOrder.order_number}`, {
          state: {
            orderId: newOrder.id,
            orderNumber: newOrder.order_number,
            order: newOrder,
          },
        });
      } else {
        showToast('Order registered! Redirecting to UPI payment...', 'success');
        // 7. Navigate directly to UPI Payment page with the real database record
        navigate(`/payment/${newOrder.id}`, {
          state: {
            orderId: newOrder.id,
            orderNumber: newOrder.order_number,
            totalAmount: newOrder.total_amount,
            product,
            customer: newOrder.customer || customerPayload,
            customization: customizationData,
          },
        });
      }
    } catch (err: any) {
      console.error('Order creation error:', err);
      showToast(err.message || 'Failed to create order. Please try again.', 'error');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const isKprStudent = customerForm.college_type === 'KPR College';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Progress Steps */}
      <StepProgress currentStep="details" />

      <div>
        <Link
          to={`/products/${product.slug || product.id}`}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-neutral-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Product Details
        </Link>
      </div>

      <form onSubmit={handleContinueToPayment} className="space-y-8">
        {/* Section 1: Selected Product & Customization */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
                Selected 3D Item
              </span>
              <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white mt-0.5">{product.name}</h2>
            </div>
            <span className="font-display font-bold text-lg text-cyan-600 dark:text-cyan-400">
              {formatINR(product.price)} each
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800">
              <img
                src={product.image_url}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="md:col-span-2 space-y-4">
              {/* Quantity row */}
              <div className="flex items-center justify-between bg-slate-50 dark:bg-neutral-950 p-3 rounded-2xl border border-slate-200 dark:border-neutral-800">
                <span className="text-xs font-mono text-slate-700 dark:text-neutral-300 font-medium">Select Quantity:</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent cursor-pointer shadow-sm"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white w-6 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(20, quantity + 1))}
                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-transparent cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Color selection */}
              {product.available_colors && product.available_colors.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-700 dark:text-neutral-300 font-semibold">Select Color:</label>
                  <select
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 shadow-sm"
                  >
                    {product.available_colors.map((c: string) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Customization Text & Instructions */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="custom-name" className="text-xs font-mono text-slate-700 dark:text-neutral-300 block font-semibold">
                Custom Name / Monogram Text <span className="text-slate-400 dark:text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                id="custom-name"
                type="text"
                maxLength={40}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. SANJAY or MECH-2026"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none font-mono uppercase"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="special-instructions" className="text-xs font-mono text-slate-700 dark:text-neutral-300 block font-semibold">
                Special Instructions <span className="text-slate-400 dark:text-neutral-500 font-normal">(Optional)</span>
              </label>
              <input
                id="special-instructions"
                type="text"
                maxLength={200}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Extra solid infill, gift packing"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Student & College Details */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl">
          <div className="space-y-1 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
              Step 1: Student Information
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">Customer & College Details</h3>
              {loggedInCustomer ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Logged in as {loggedInCustomer.name}</span>
                </div>
              ) : (
                <Link
                  to={`/login?redirect=/order&productId=${product.id}&selectedColor=${encodeURIComponent(
                    selectedColor
                  )}&quantity=${quantity}`}
                  className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-mono inline-flex items-center gap-1 font-medium"
                >
                  <span>Already have an account? Sign in →</span>
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="full-name" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Full Name *
              </label>
              <input
                id="full-name"
                type="text"
                required
                value={customerForm.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g. Sanjay Kumar"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none ${
                  formErrors.name ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                }`}
              />
              {formErrors.name && <p className="text-[11px] text-rose-500">{formErrors.name}</p>}
            </div>

            {/* Mobile Number */}
            <div className="space-y-1.5">
              <label htmlFor="phone" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Mobile Number (10-digits) *
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                value={customerForm.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="10-digit mobile (e.g. 9876543210)"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none font-mono ${
                  formErrors.phone ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                }`}
              />
              {formErrors.phone && <p className="text-[11px] text-rose-500">{formErrors.phone}</p>}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-400" /> Email Address
              </label>
              <input
                id="email"
                type="email"
                value={customerForm.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="e.g. sanjay@kpr.edu.in"
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none ${
                  formErrors.email ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                }`}
              />
              {formErrors.email && <p className="text-[11px] text-rose-500">{formErrors.email}</p>}
            </div>

            {/* College Selection Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="college-select" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> College Name *
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-normal">
                  {isKprStudent ? 'Campus delivery eligible' : 'Home courier only'}
                </span>
              </label>
              <select
                id="college-select"
                value={customerForm.college_type}
                onChange={(e) => {
                  const val = e.target.value as CollegeType;
                  handleFieldChange('college_type', val);
                  if (val === 'KPR College') {
                    handleFieldChange('college', 'KPR College');
                  } else {
                    handleFieldChange('college', '');
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white focus:outline-none font-medium ${
                  formErrors.college_type ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                }`}
              >
                <option value="KPR College">KPR College</option>
                <option value="Other">Other</option>
              </select>
              {formErrors.college_type && <p className="text-[11px] text-rose-500">{formErrors.college_type}</p>}
            </div>

            {/* Registration / Roll Number */}
            <div className="space-y-1.5">
              <label htmlFor="roll-number" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                <GraduationCap className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Registration / Roll Number
              </label>
              <input
                id="roll-number"
                type="text"
                value={customerForm.roll_number || ''}
                onChange={(e) => handleFieldChange('roll_number', e.target.value.toUpperCase())}
                placeholder="e.g. 22CS104 / 711321104..."
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 focus:border-cyan-500 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none font-mono uppercase"
              />
            </div>

            {/* Other College Name Input */}
            {customerForm.college_type === 'Other' && (
              <div className="space-y-1.5 sm:col-span-2">
                <label htmlFor="other-college-name" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> College / Institution Name *
                </label>
                <input
                  id="other-college-name"
                  type="text"
                  required
                  value={customerForm.college || ''}
                  onChange={(e) => handleFieldChange('college', e.target.value)}
                  placeholder="e.g. PSG Tech / CIT / Amrita University / Anna University"
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none ${
                    formErrors.college ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                  }`}
                />
                {formErrors.college && <p className="text-[11px] text-rose-500">{formErrors.college}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Dynamic Delivery Method */}
        <div className="bg-white dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-xl">
          <div className="space-y-1 border-b border-slate-200 dark:border-neutral-800 pb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-semibold block">
              Step 2: Delivery Method & Location
            </span>
            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
              {isKprStudent ? 'Choose Delivery Option' : 'Delivery Address'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              {isKprStudent
                ? 'Select direct classroom/hostel delivery at KPR College or Home Delivery.'
                : 'Enter your shipping address for Home Delivery.'}
            </p>
          </div>

          {/* If KPR Student: Show Delivery Method Toggle (College vs Home) */}
          {isKprStudent ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* College Delivery Option */}
                <div
                  onClick={() => handleFieldChange('delivery_method', 'college_delivery')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                    customerForm.delivery_method === 'college_delivery'
                      ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500/30'
                      : 'bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        College Delivery
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                      FREE (KPR ONLY)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                    Direct hand-delivery to your department, class section, hostel block, or stall.
                  </p>
                </div>

                {/* Home Delivery Option */}
                <div
                  onClick={() => handleFieldChange('delivery_method', 'home_delivery')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                    customerForm.delivery_method === 'home_delivery'
                      ? 'bg-cyan-500/10 border-cyan-500 ring-1 ring-cyan-500/30'
                      : 'bg-slate-50 dark:bg-neutral-950 border-slate-200 dark:border-neutral-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                        <Home className="w-4 h-4" />
                      </div>
                      <span className="font-display font-bold text-sm text-slate-900 dark:text-white">
                        Home Delivery
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[10px] font-mono">
                      Courier
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                    Doorstep courier delivery to your personal address outside campus.
                  </p>
                </div>
              </div>

              {/* Conditional Form: College Delivery Fields */}
              {customerForm.delivery_method === 'college_delivery' ? (
                <div className="space-y-4 pt-2">
                  <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 text-xs text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    <span>⚡ College delivery is available only within KPR College campus locations.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Department */}
                    <div className="space-y-1.5">
                      <label htmlFor="dept" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Department *
                      </label>
                      <select
                        id="dept"
                        value={customerForm.department_id || customerForm.department || ''}
                        onChange={(e) => {
                          const selectedVal = e.target.value;
                          const foundDept = departments.find((d) => d.id === selectedVal || d.name === selectedVal);
                          if (foundDept) {
                            const deptYears = foundDept.years && foundDept.years.length > 0 ? foundDept.years : YEARS;
                            setCustomerForm((prev) => ({
                              ...prev,
                              department_id: foundDept.id,
                              department: `${foundDept.name} (${foundDept.code})`,
                              year: prev.year && deptYears.includes(prev.year) ? prev.year : deptYears[0],
                            }));
                          } else {
                            handleFieldChange('department', selectedVal);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                      >
                        {departments.length > 0 ? (
                          departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))
                        ) : (
                          KPR_DEPARTMENTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Year of Study */}
                    <div className="space-y-1.5">
                      <label htmlFor="year" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                        <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Year of Study *
                      </label>
                      <select
                        id="year"
                        value={customerForm.year || YEARS[0]}
                        onChange={(e) => handleFieldChange('year', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                      >
                        {(() => {
                          const currentDept = departments.find((d) => d.id === customerForm.department_id);
                          const yearsList = currentDept?.years && currentDept.years.length > 0 ? currentDept.years : YEARS;
                          return yearsList.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Section / Class */}
                    <div className="space-y-1.5">
                      <label htmlFor="section" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" /> Class / Section
                      </label>
                      <input
                        id="section"
                        type="text"
                        value={customerForm.section || ''}
                        onChange={(e) => handleFieldChange('section', e.target.value)}
                        placeholder="e.g. CSE-A or Section 2"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none"
                      />
                    </div>

                    {/* Building / Block */}
                    <div className="space-y-1.5">
                      <label htmlFor="block" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Building / Block *
                      </label>
                      <select
                        id="block"
                        value={customerForm.building_block || KPR_BLOCKS[0]}
                        onChange={(e) => handleFieldChange('building_block', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                      >
                        {KPR_BLOCKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pickup or Drop point note */}
                    <div className="space-y-1.5 sm:col-span-2">
                      <label htmlFor="pickup-loc" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Specific Drop Point / Room / Lab (Optional)
                      </label>
                      <input
                        id="pickup-loc"
                        type="text"
                        value={customerForm.pickup_location || ''}
                        onChange={(e) => handleFieldChange('pickup_location', e.target.value)}
                        placeholder="e.g. Room 304, CAD Lab, or 3D Stall Pickup Point"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Home Delivery Fields for KPR Student */
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label htmlFor="address" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Full Street Address *
                    </label>
                    <input
                      id="address"
                      type="text"
                      required
                      value={customerForm.address || ''}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      placeholder="e.g. Door No. 45, Gandhi Street, Anna Nagar"
                      className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none ${
                        formErrors.address ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                      }`}
                    />
                    {formErrors.address && <p className="text-[11px] text-rose-500">{formErrors.address}</p>}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label htmlFor="city" className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">City *</label>
                      <input
                        id="city"
                        type="text"
                        value={customerForm.city || ''}
                        onChange={(e) => handleFieldChange('city', e.target.value)}
                        placeholder="e.g. Coimbatore"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="state" className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">State *</label>
                      <input
                        id="state"
                        type="text"
                        value={customerForm.state || ''}
                        onChange={(e) => handleFieldChange('state', e.target.value)}
                        placeholder="Tamil Nadu"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="pincode" className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Pincode *</label>
                      <input
                        id="pincode"
                        type="text"
                        value={customerForm.pincode || ''}
                        onChange={(e) => handleFieldChange('pincode', e.target.value)}
                        placeholder="641001"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Other College: ONLY Home Delivery allowed */
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 text-xs text-purple-900 dark:text-purple-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="font-semibold">Home Delivery via Courier</span>
                </div>
                <span className="text-[11px] font-mono text-purple-700 dark:text-purple-400">Standard Shipping</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-100 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-xs text-slate-600 dark:text-neutral-400 flex items-center gap-2 font-mono">
                <Info className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                <span>⚡ Note: College delivery is available only within KPR College.</span>
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label htmlFor="other-address" className="font-mono text-slate-700 dark:text-neutral-300 flex items-center gap-1.5 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Full Street Address *
                  </label>
                  <input
                    id="other-address"
                    type="text"
                    required
                    value={customerForm.address || ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    placeholder="e.g. Door No. 12, Main Road, Near Gandhi Park"
                    className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none ${
                      formErrors.address ? 'border-rose-500' : 'border-slate-200 dark:border-neutral-800 focus:border-cyan-500'
                    }`}
                  />
                  {formErrors.address && <p className="text-[11px] text-rose-500">{formErrors.address}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label htmlFor="other-city" className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">City *</label>
                    <input
                      id="other-city"
                      type="text"
                      value={customerForm.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      placeholder="e.g. Coimbatore / Erode / Salem"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="other-state" className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">State *</label>
                    <input
                      id="other-state"
                      type="text"
                      value={customerForm.state || ''}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      placeholder="Tamil Nadu"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="other-pincode" className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">Pincode *</label>
                    <input
                      id="other-pincode"
                      type="text"
                      value={customerForm.pincode || ''}
                      onChange={(e) => handleFieldChange('pincode', e.target.value)}
                      placeholder="641001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl text-slate-900 dark:text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3.5: Payment Method Selection */}
        <div className="bg-white dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-mono text-xs font-semibold uppercase tracking-wider">
            <span>Payment Method</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setPaymentMethod('ONLINE')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                paymentMethod === 'ONLINE'
                  ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 text-slate-900 dark:text-white shadow-md'
                  : 'border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">💳</span>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">Online Payment (UPI)</span>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">GPay, PhonePe, Paytm, QR scan</span>
                  </div>
                </div>
                {paymentMethod === 'ONLINE' && (
                  <CheckCircle2 className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                )}
              </div>
              <span className="inline-block self-start px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-mono font-medium">
                Instant Verification
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('CASH')}
              className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                paymentMethod === 'CASH'
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 text-slate-900 dark:text-white shadow-md'
                  : 'border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 text-slate-600 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">💵</span>
                  <div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white block">Cash on Delivery / Pickup</span>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400">Pay cash upon receiving order</span>
                  </div>
                </div>
                {paymentMethod === 'CASH' && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                )}
              </div>
              <span className="inline-block self-start px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-mono font-medium">
                Cash Pending Verification
              </span>
            </button>
          </div>
        </div>

        {/* Section 4: Live Order Summary & Continue CTA */}
        <div className="bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md dark:shadow-2xl">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-neutral-400 font-medium">
              Total Order Amount
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-display text-cyan-600 dark:text-cyan-400">{formatINR(totalAmount)}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                ({quantity} × {formatINR(unitPrice)})
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreatingOrder}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isCreatingOrder ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Creating 3D Order...</span>
              </>
            ) : (
              <>
                <span>{paymentMethod === 'CASH' ? 'Place Order (Cash on Delivery)' : 'Proceed to UPI Payment'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
