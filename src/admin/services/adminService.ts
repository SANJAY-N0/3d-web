import { orderService } from '../../services/orderService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { AdminStats, Order, Product } from '../../types';

export const adminService = {
  getStats: (): Promise<AdminStats> => orderService.getAdminStats(),
  getOrders: (): Promise<Order[]> => orderService.getAll(),
  updateOrderStatus: (orderId: string, status: any) => orderService.updateStatus(orderId, status),
  getProducts: (): Promise<Product[]> => productService.getAll(),
  createProduct: (data: any) => productService.create(data),
  updateProduct: (id: string, data: any) => productService.update(id, data),
  deleteProduct: (id: string) => productService.delete(id),
  verifyPayment: (orderId: string, adminId?: string, notes?: string): Promise<void> =>
    paymentService.verifyPayment(orderId, 'VERIFIED', adminId, notes),
  rejectPayment: (orderId: string, adminId?: string, notes?: string): Promise<void> =>
    paymentService.verifyPayment(orderId, 'REJECTED', adminId, notes),
};
