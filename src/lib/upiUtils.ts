export const DEFAULT_UPI_ID = import.meta.env.VITE_UPI_ID || 'printlab3d@okhdfcbank';
export const DEFAULT_BUSINESS_NAME = import.meta.env.VITE_BUSINESS_NAME || 'PRINTLAB 3D';

export const UPI_CONFIG = {
  upiId: DEFAULT_UPI_ID,
  businessName: DEFAULT_BUSINESS_NAME,
};

/**
 * Builds a standard UPI payment string compatible with PhonePe, GPay, Paytm, BHIM, etc.
 */
export function buildUPIUri(params: {
  upiId?: string;
  businessName?: string;
  amount: number;
  orderNumber: string;
  note?: string;
}): string {
  const upiId = params.upiId || DEFAULT_UPI_ID;
  const businessName = params.businessName || DEFAULT_BUSINESS_NAME;
  const note = params.note || `Payment for 3D Print Order ${params.orderNumber}`;
  const encodedName = encodeURIComponent(businessName);
  const encodedNote = encodeURIComponent(note);
  const formattedAmount = params.amount.toFixed(2);

  return `upi://pay?pa=${upiId}&pn=${encodedName}&am=${formattedAmount}&cu=INR&tn=${encodedNote}`;
}

/**
 * Formats Indian Rupee currency string
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generates customer-facing order number formatted as 3DP-YYYY-XXXXX
 */
export function generateOrderNumber(sequence?: number): string {
  const year = new Date().getFullYear();
  const num = sequence ? String(sequence).padStart(5, '0') : String(Math.floor(1000 + Math.random() * 90000)).padStart(5, '0');
  return `3DP-${year}-${num}`;
}

/**
 * Formats ISO timestamp into friendly Indian date/time representation
 */
export function formatUPITimestamp(isoString?: string): string {
  if (!isoString) return new Date().toLocaleDateString('en-IN');
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
