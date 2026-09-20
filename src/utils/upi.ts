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
 * Generates customer-facing order number formatted as 3DP-YYYY-XXXXX
 */
export function generateOrderNumber(sequence?: number): string {
  const year = new Date().getFullYear();
  const num = sequence ? String(sequence).padStart(5, '0') : String(Math.floor(1000 + Math.random() * 90000)).padStart(5, '0');
  return `3DP-${year}-${num}`;
}
