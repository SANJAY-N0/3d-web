export interface SupportConfig {
  phone: string;
  whatsapp: string;
  altPhone?: string;
}

export const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  phone: '+91 98765 43210',
  whatsapp: '+91 98765 43210',
};

/**
 * Retrieves dynamically configured customer support contact settings
 */
export function getSupportConfig(): SupportConfig {
  if (typeof window !== 'undefined') {
    const phone = localStorage.getItem('printlab_support_phone');
    const whatsapp = localStorage.getItem('printlab_support_whatsapp');
    const altPhone = localStorage.getItem('printlab_support_alt_phone');

    return {
      phone: phone && phone.trim() ? phone.trim() : DEFAULT_SUPPORT_CONFIG.phone,
      whatsapp: whatsapp && whatsapp.trim() ? whatsapp.trim() : DEFAULT_SUPPORT_CONFIG.whatsapp,
      altPhone: altPhone && altPhone.trim() ? altPhone.trim() : undefined,
    };
  }

  return DEFAULT_SUPPORT_CONFIG;
}

/**
 * Generates direct WhatsApp chat URL with clean numeric phone
 */
export function getWhatsAppLink(whatsappNumber: string, message?: string): string {
  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  const encodedText = message ? encodeURIComponent(message) : encodeURIComponent('Hello PrintLab 3D! I have an enquiry about an order.');
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}
