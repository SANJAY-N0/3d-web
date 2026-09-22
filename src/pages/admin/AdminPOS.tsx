import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  ShoppingBag,
  Clock,
  ArrowRight,
  Box,
  Receipt,
  RotateCcw,
  Bell,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  User,
  Phone,
  X,
} from 'lucide-react';
import { Product, PosCartItem, Order, PosBillResponse, PaymentMethod } from '../../types';
import { productService } from '../../services/productService';
import { orderService } from '../../services/orderService';
import { formatINR } from '../../lib/upiUtils';
import { useToast } from '../../components/common/Toast';
import { useTheme } from '../../context/ThemeContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { POSPaymentModal } from '../../components/admin/POSPaymentModal';
import { POSReceiptModal } from '../../components/admin/POSReceiptModal';
import { POSPreviousOrdersModal } from '../../components/admin/POSPreviousOrdersModal';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { CATEGORIES } from '../../components/product/CategoryFilter';

export const AdminPOS: React.FC = () => {
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Products & Categories
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Cart State
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isPreviousOrdersModalOpen, setIsPreviousOrdersModalOpen] = useState(false);
  const [completedBillData, setCompletedBillData] = useState<PosBillResponse | null>(null);
  const [submittingBill, setSubmittingBill] = useState(false);

  // UI States
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [showCustomerInput, setShowCustomerInput] = useState(false);

  // Notifications State & Realtime
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; time: string; read: boolean }[]
  >([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Fetch Products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.warn('Failed to fetch products for POS:', err);
      showToast('Failed to load product catalog.', 'error');
    } finally {
      setLoadingProducts(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Realtime subscription for incoming orders, payments, and billing status
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('pos-realtime-activity')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as any;
          const orderNum = newOrder?.order_number || 'New Order';
          const isPos = newOrder?.customization?.is_pos_bill;
          if (!isPos) {
            showToast(`🔔 New Customer Order #${orderNum} received!`, 'info');
            setNotificationCount((prev) => prev + 1);
            setNotifications((prev) => [
              {
                id: String(Date.now()),
                title: `New Online Order: #${orderNum}`,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                read: false,
              },
              ...prev.slice(0, 19),
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'payments' },
        (payload) => {
          const updated = payload.new as any;
          if (updated?.payment_status === 'PAID' || updated?.payment_status === 'VERIFIED') {
            setNotificationCount((prev) => prev + 1);
            setNotifications((prev) => [
              {
                id: String(Date.now()),
                title: `Payment ${updated.payment_status}: ₹${updated.amount}`,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                read: false,
              },
              ...prev.slice(0, 19),
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'billing_transactions' },
        (payload) => {
          const newBill = payload.new as any;
          if (newBill?.bill_number) {
            setNotifications((prev) => [
              {
                id: String(Date.now()),
                title: `Bill Generated: ${newBill.bill_number}`,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                read: false,
              },
              ...prev.slice(0, 19),
            ]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products' },
        (payload) => {
          const updatedProd = payload.new as Product;
          if (updatedProd && updatedProd.id) {
            setProducts((prev) =>
              prev.map((p) => (p.id === updatedProd.id ? { ...p, ...updatedProd } : p))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showToast]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard Shortcuts: Ctrl+1 / Ctrl+K (focus search), Ctrl+Enter (confirm bill), Esc (close modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '1' || e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (cart.length > 0 && !isPaymentModalOpen && !isReceiptModalOpen) {
          e.preventDefault();
          setIsPaymentModalOpen(true);
        }
      } else if (e.key === 'Escape') {
        if (isPaymentModalOpen) setIsPaymentModalOpen(false);
        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        if (isPreviousOrdersModalOpen) setIsPreviousOrdersModalOpen(false);
        if (showNotificationsDropdown) setShowNotificationsDropdown(false);
        if (mobileCartOpen) setMobileCartOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cart.length,
    isPaymentModalOpen,
    isReceiptModalOpen,
    isPreviousOrdersModalOpen,
    showNotificationsDropdown,
    mobileCartOpen,
  ]);

  // Combined Categories list: CATEGORIES + any Dynamic DB Categories
  const categories = useMemo(() => {
    const dynamicSet = new Set<string>(CATEGORIES);
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        dynamicSet.add(p.category.trim());
      }
    });
    return Array.from(dynamicSet);
  }, [products]);

  // Filtered Products: strictly POS on-spot available items
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // 0. Channel availability & status filter
      if (p.on_spot_available === false) return false;
      if (p.status === 'INACTIVE') return false;

      // 1. Category filter
      if (selectedCategory !== 'All' && selectedCategory !== 'All Items') {
        if (p.category !== selectedCategory) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCat = (p.category || '').toLowerCase().includes(q);
        const matchMat = (p.material || '').toLowerCase().includes(q);
        const matchDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchMat && !matchDesc) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const handleAddToCart = (product: Product) => {
    const currentStock =
      (product as any).stock_quantity !== undefined
        ? Number((product as any).stock_quantity)
        : (product as any).stock !== undefined
        ? Number((product as any).stock)
        : (product.is_available ? 50 : 0);

    if (!product.is_available || currentStock <= 0) {
      showToast(`${product.name} is currently out of stock.`, 'error');
      return;
    }

    const existing = cart.find((item) => item.product.id === product.id);

    if (existing && existing.quantity >= currentStock) {
      showToast(`Cannot add more. Maximum available stock is ${currentStock}.`, 'error');
      return;
    }

    setCart((prev) => {
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            product,
            quantity: 1,
            unit_price: product.price,
            total_price: product.price,
          },
        ];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;

            const currentStock =
              (item.product as any).stock_quantity !== undefined
                ? Number((item.product as any).stock_quantity)
                : (item.product as any).stock !== undefined
                ? Number((item.product as any).stock)
                : 50;

            if (delta > 0 && newQty > currentStock) {
              showToast(`Cannot exceed available stock of ${currentStock}.`, 'error');
              return item;
            }

            return {
              ...item,
              quantity: newQty,
              total_price: newQty * item.unit_price,
            };
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[];
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscount(0);
    setTax(0);
    setCustomerName('Walk-in Customer');
    setCustomerMobile('');
  };

  // Totals calculations
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.total_price, 0);
  }, [cart]);

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal - discount + tax);
  }, [subtotal, discount, tax]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Handle Bill Completion
  const handleCompleteBill = async (paymentData: {
    payment_method: PaymentMethod;
    cash_received?: number;
    change_amount?: number;
    transaction_id?: string;
    payment_screenshot_url?: string;
    notes?: string;
  }) => {
    if (cart.length === 0) return;

    setSubmittingBill(true);
    try {
      const response = await orderService.createPosBill({
        items: cart.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
        })),
        customer_name: customerName.trim() || 'Walk-in Customer',
        customer_mobile: customerMobile.trim() || '9999999999',
        payment_method: paymentData.payment_method,
        cash_received: paymentData.cash_received,
        change_amount: paymentData.change_amount,
        transaction_id: paymentData.transaction_id,
        payment_screenshot_url: paymentData.payment_screenshot_url,
        discount,
        tax,
        notes: paymentData.notes,
      });

      showToast(`Bill #${response.bill_number} generated successfully!`, 'success');
      setCompletedBillData(response);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      handleClearCart();
      // Reload products to update fresh stock values
      loadProducts();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete POS bill.', 'error');
    } finally {
      setSubmittingBill(false);
    }
  };

  // View Previous Bill in Receipt Modal
  const handleSelectPreviousBill = (order: Order) => {
    const billNum = (order.customization as any)?.bill_number || order.order_number;
    const items =
      order.order_items && order.order_items.length > 0
        ? order.order_items
        : order.items || [
            {
              id: 'temp',
              order_id: order.id,
              product_name: order.product?.name || 'Item',
              quantity: order.quantity || 1,
              unit_price: order.unit_price || order.total_amount,
              total_price: order.total_amount,
            },
          ];

    const billResponse: PosBillResponse = {
      success: true,
      bill_number: billNum,
      order,
      payment: order.payment,
      items,
      summary: {
        subtotal: order.subtotal || order.total_amount,
        discount: (order.customization as any)?.discount || 0,
        tax: (order.customization as any)?.tax || 0,
        total_amount: order.total_amount,
        cash_received: (order.customization as any)?.cash_received,
        change_amount: (order.customization as any)?.change_amount,
      },
    };

    setCompletedBillData(billResponse);
    setIsPreviousOrdersModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="flex-1 flex flex-col h-full overflow-hidden select-none font-sans">
        {/* 
          1. POS TOP BAR: Purpose-built counter header
        */}
        <div className="h-12 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl px-3.5 flex items-center justify-between z-20 shrink-0 mb-2.5 shadow-xs">
          {/* Left: [ + ] Walk-in Order | POS COUNTER ACTIVE | Subtitle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearCart}
              className="w-8 h-8 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center font-bold transition-transform active:scale-95 cursor-pointer shadow-xs"
              title="New Walk-in Order / Reset Cart"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white leading-none">
                Walk-in Order
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                POS ACTIVE
              </span>
            </div>

            <span className="text-slate-300 dark:text-neutral-700 text-xs hidden md:inline">•</span>
            <span className="text-xs text-slate-500 dark:text-neutral-400 truncate max-w-[240px] sm:max-w-md hidden md:inline">
              Select menu items to generate customer bill
            </span>
          </div>

          {/* Right: Notifications, Previous Orders */}
          <div className="flex items-center gap-2">
            {/* Realtime Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotificationsDropdown(!showNotificationsDropdown);
                  setNotificationCount(0);
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-600 dark:text-neutral-300 transition-colors cursor-pointer relative flex items-center justify-center"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xl p-2.5 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-neutral-800">
                    <span className="font-bold text-xs text-slate-800 dark:text-neutral-200">Realtime Alerts</span>
                    <button
                      type="button"
                      onClick={() => setNotifications([])}
                      className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-neutral-300"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-neutral-800/60 mt-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="py-2 px-1">
                          <p className="font-semibold text-slate-800 dark:text-neutral-200 text-xs leading-tight">
                            {n.title}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">{n.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Previous Orders Button */}
            <button
              type="button"
              onClick={() => setIsPreviousOrdersModalOpen(true)}
              className="h-8.5 px-3 rounded-lg bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-neutral-700 transition-colors cursor-pointer shadow-2xs"
            >
              <Receipt className="w-3.5 h-3.5 text-indigo-500" />
              <span>Previous Orders</span>
            </button>
          </div>
        </div>

        {/* 
          MAIN LAYOUT:
          Desktop: ~70% Product Catalog + ~30% Billing Cart (minmax 340px)
        */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(0,6fr)_minmax(320px,4fr)] lg:grid-cols-[minmax(0,7fr)_minmax(340px,3fr)] overflow-hidden gap-3 min-h-0">
          {/* 
            LEFT ~70%: PRODUCT CATALOG AREA
          */}
          <section className="flex flex-col bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs h-full min-h-0">
            {/* Search Bar & Category Filter Pills */}
            <div className="p-3 border-b border-slate-200 dark:border-neutral-800 space-y-2.5 bg-slate-50/70 dark:bg-neutral-950/40 shrink-0">
              {/* Search Bar: height 42px, text 14px, icon 18px */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 3D model, product name or press Ctrl+1..."
                  className="w-full h-10.5 pl-10 pr-16 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-sans shadow-2xs"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 bg-slate-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-neutral-700 pointer-events-none hidden sm:inline">
                  Ctrl+1
                </span>
              </div>

              {/* Category Filter Pills: height 34px, font 12-13px */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center ${
                        isSelected
                          ? 'bg-cyan-600 text-white shadow-xs'
                          : 'bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Catalog Section Header: Product Catalog (N items) */}
            <div className="px-3.5 py-2 border-b border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-950/20 flex items-center justify-between shrink-0">
              <span className="font-semibold text-sm text-slate-800 dark:text-neutral-200">
                Product Catalog <span className="text-slate-400 font-normal">({filteredProducts.length} items)</span>
              </span>
              {selectedCategory !== 'All' && (
                <span className="text-xs font-medium text-cyan-600 dark:text-cyan-400">
                  Filtered by: {selectedCategory}
                </span>
              )}
            </div>

            {/* Product Catalog Grid (Compact, dense, readable cards aligned at start) */}
            <div className="flex-1 overflow-y-auto p-3">
              {loadingProducts ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 content-start">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 animate-pulse space-y-2 h-[210px]"
                    >
                      <div className="h-[100px] bg-slate-200 dark:bg-neutral-800 rounded-lg w-full" />
                      <div className="h-3.5 bg-slate-200 dark:bg-neutral-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-neutral-800 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2.5 text-slate-400">
                  <Box className="w-10 h-10 text-slate-300 dark:text-neutral-700" />
                  <h4 className="font-bold text-sm text-slate-700 dark:text-neutral-300">No items match your search</h4>
                  <p className="text-xs max-w-xs">Try searching another product name or select "All" categories.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-semibold text-xs cursor-pointer hover:bg-cyan-500 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 content-start">
                  {filteredProducts.map((product) => {
                    const stock =
                      (product as any).stock_quantity !== undefined
                        ? Number((product as any).stock_quantity)
                        : (product as any).stock !== undefined
                        ? Number((product as any).stock)
                        : (product.is_available ? 50 : 0);
                    const isOutOfStock = stock <= 0 || !product.is_available;
                    const isLowStock = !isOutOfStock && stock <= 5;
                    const cartItem = cart.find((it) => it.product.id === product.id);

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOutOfStock && handleAddToCart(product)}
                        className={`group relative rounded-xl border p-2 flex flex-col justify-between transition-all select-none h-[210px] ${
                          isOutOfStock
                            ? 'opacity-55 border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 cursor-not-allowed'
                            : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 hover:border-cyan-500/60 dark:hover:border-cyan-500/60 hover:shadow-md cursor-pointer active:scale-[0.99]'
                        } ${cartItem ? 'ring-2 ring-cyan-500 border-transparent shadow-xs' : ''}`}
                      >
                        {/* 1. Image (height ~100px) */}
                        <div className="relative w-full h-[100px] rounded-lg overflow-hidden bg-slate-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                          {product.main_image || product.image_url ? (
                            <img
                              src={product.main_image || product.image_url}
                              alt={product.name}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                (e.target as HTMLElement).parentElement?.classList.add('flex', 'items-center', 'justify-center');
                              }}
                            />
                          ) : (
                            <UtensilsCrossed className="w-7 h-7 text-slate-400" />
                          )}

                          {/* Stock Badge (Top-left, 11px-12px font-semibold) */}
                          <div className="absolute top-1.5 left-1.5 pointer-events-none">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-rose-600 text-white shadow-xs">
                                OUT OF STOCK
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-amber-500 text-white shadow-xs">
                                Low: {stock}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-900/80 text-white backdrop-blur-xs shadow-xs">
                                Stock: {stock}
                              </span>
                            )}
                          </div>

                          {/* Cart Badge if in bill */}
                          {cartItem && (
                            <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-cyan-600 text-white font-mono font-bold text-xs shadow-sm">
                              ×{cartItem.quantity}
                            </div>
                          )}
                        </div>

                        {/* 2. Product Name (14px font-semibold, 2 lines clamp, fixed height 40px) */}
                        <div className="pt-2 flex-1 flex flex-col justify-between">
                          <h4
                            className="font-semibold text-sm text-slate-800 dark:text-neutral-100 line-clamp-2 leading-snug h-10 overflow-hidden"
                            title={product.name}
                          >
                            {product.name}
                          </h4>

                          {/* 3. Bottom Row: Price (15px-17px bold) + Add Button (32x32px) */}
                          <div className="flex items-center justify-between pt-1 mt-auto">
                            <span className="font-mono font-bold text-base text-cyan-600 dark:text-cyan-400 tracking-tight">
                              {formatINR(product.price)}
                            </span>

                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddToCart(product);
                              }}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer shadow-xs ${
                                isOutOfStock
                                  ? 'bg-slate-200 text-slate-400 dark:bg-neutral-800 cursor-not-allowed'
                                  : 'bg-cyan-50 hover:bg-cyan-600 text-cyan-600 hover:text-white dark:bg-cyan-950/60 dark:text-cyan-400 dark:hover:bg-cyan-600 dark:hover:text-white active:scale-95'
                              }`}
                              title="Add to Bill"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 
            RIGHT ~30%: BILLING CART PANEL (minmax 340px)
          */}
          <aside
            className={`flex flex-col bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs h-full min-h-0 ${
              mobileCartOpen ? 'fixed inset-2 z-50 flex' : 'hidden md:flex'
            }`}
          >
            {/* Billing Header: 16px font-bold, item count 12-13px */}
            <div className="p-3 border-b border-slate-200 dark:border-neutral-800 flex items-center justify-between bg-slate-50/80 dark:bg-neutral-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">Active Bill Cart</h3>
                  <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                    {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                {mobileCartOpen && (
                  <button
                    type="button"
                    onClick={() => setMobileCartOpen(false)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-neutral-800 text-slate-400 cursor-pointer md:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Customer info bar: 14px customer name */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-neutral-800/80 bg-slate-50/40 dark:bg-neutral-950/30 text-xs shrink-0">
              {!showCustomerInput ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate max-w-[240px]">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-slate-700 dark:text-neutral-300 font-medium text-sm truncate">
                      {customerName} {customerMobile ? `(${customerMobile})` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCustomerInput(true)}
                    className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="w-1/2 h-8.5 px-2.5 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-md text-xs"
                    />
                    <input
                      type="tel"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="Mobile"
                      className="w-1/2 h-8.5 px-2.5 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded-md text-xs font-mono"
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setShowCustomerInput(false)}
                      className="text-xs font-semibold text-cyan-600 hover:underline cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Active Bill Items / Centered Empty State */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-slate-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-slate-700 dark:text-neutral-300">No items added to bill</h4>
                  <p className="text-xs max-w-[210px] text-slate-400 leading-relaxed">
                    Select items from the catalog on the left to begin billing
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/80 dark:bg-neutral-950/60 flex flex-col gap-1.5 text-xs shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[220px] text-sm">
                        {item.product.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-neutral-800/50">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold text-sm px-1.5 text-slate-900 dark:text-white min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Price calculation */}
                      <div className="text-right">
                        <span className="font-mono text-xs text-slate-400 block leading-none">
                          {formatINR(item.unit_price)} each
                        </span>
                        <span className="font-mono font-bold text-sm text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                          {formatINR(item.total_price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bill Calculation & Confirm Button (Fixed at bottom) */}
            <div className="p-3.5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/80 space-y-3 text-xs shrink-0">
              {/* Financial Calculations: 13px-14px font */}
              <div className="space-y-1.5 font-mono text-sm">
                <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                  <span>Subtotal:</span>
                  <span>{formatINR(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-neutral-400 items-center">
                  <span>Discount:</span>
                  <div className="flex items-center gap-1">
                    <span>-₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={discount || ''}
                      onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-16 h-7 px-1.5 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded text-right text-xs"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-neutral-400 items-center">
                  <span>Tax:</span>
                  <div className="flex items-center gap-1">
                    <span>+₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={tax || ''}
                      onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="0"
                      className="w-16 h-7 px-1.5 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-700 rounded text-right text-xs"
                    />
                  </div>
                </div>

                {/* PAYABLE TOTAL: 18px font-bold */}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-neutral-800">
                  <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    PAYABLE TOTAL:
                  </span>
                  <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">
                    {formatINR(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Confirm Button: 44-48px height, 13-14px font-bold */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setIsPaymentModalOpen(true)}
                className="w-full h-11 sm:h-12 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md active:scale-98 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>CONFIRM ORDER ({formatINR(totalAmount)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-xs text-center text-slate-400 font-mono">
                Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-neutral-800 rounded text-[11px]">Ctrl+Enter</kbd> to confirm
              </p>
            </div>
          </aside>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="md:hidden p-2.5 bg-white dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2 z-40 shrink-0 mt-1 rounded-lg">
          <div>
            <span className="text-xs text-slate-500 block">Total ({totalItemsCount} items)</span>
            <span className="font-mono font-bold text-base text-cyan-600 dark:text-cyan-400">
              {formatINR(totalAmount)}
            </span>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => setMobileCartOpen(true)}
            className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            <span>View Bill ({totalItemsCount})</span>
            <span>{formatINR(totalAmount)} →</span>
          </button>
        </div>
      </div>

      {/* MODALS */}
      <POSPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cartItems={cart}
        subtotal={subtotal}
        discount={discount}
        tax={tax}
        totalAmount={totalAmount}
        customerName={customerName}
        customerMobile={customerMobile}
        onCompleteBill={handleCompleteBill}
        loading={submittingBill}
      />

      <POSReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        billData={completedBillData}
        onNewBill={handleClearCart}
      />

      <POSPreviousOrdersModal
        isOpen={isPreviousOrdersModalOpen}
        onClose={() => setIsPreviousOrdersModalOpen(false)}
        onSelectBill={handleSelectPreviousBill}
      />
    </AdminLayout>
  );
};

