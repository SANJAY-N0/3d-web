import { useState } from 'react';
import { DeliveryMethod } from '../../../types';
import { deliveryService } from '../services/deliveryService';

export function useDelivery(initialMethod: DeliveryMethod = 'college_delivery') {
  const [method, setMethod] = useState<DeliveryMethod>(initialMethod);

  const deliveryFee = deliveryService.calculateDeliveryFee(method);
  const estimatedDays = deliveryService.getEstimatedDeliveryDays(method);

  return {
    method,
    setMethod,
    deliveryFee,
    estimatedDays,
    departments: deliveryService.getKprDepartments(),
    blocks: deliveryService.getKprBlocks(),
    pickupLocations: deliveryService.getKprPickupLocations(),
  };
}
