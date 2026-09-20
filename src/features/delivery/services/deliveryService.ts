import { KPR_COLLEGE_CONFIG } from '../../../config/constants';
import { DeliveryMethod } from '../../../types';

export const deliveryService = {
  getKprDepartments() {
    return KPR_COLLEGE_CONFIG.departments;
  },

  getKprBlocks() {
    return KPR_COLLEGE_CONFIG.blocks;
  },

  getKprPickupLocations() {
    return KPR_COLLEGE_CONFIG.pickupLocations;
  },

  calculateDeliveryFee(method: DeliveryMethod): number {
    return method === 'college_delivery' ? 0 : 49;
  },

  getEstimatedDeliveryDays(method: DeliveryMethod): string {
    return method === 'college_delivery' ? '1-2 Days (Campus Hand Delivery)' : '3-5 Business Days';
  },
};
