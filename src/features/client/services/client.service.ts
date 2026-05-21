import { 
  updateOrderStage,
  subscribeClients,
  subscribeOrders,
  subscribeClientOrders
} from '../../../lib/services';
import { crmService } from '../../crm/services/crm.service';

export const clientService = {
  subscribeOrders,
  subscribeClients,
  subscribeClientOrders,
  
  createClientAndOrder: async (data: any) => {
    // Phase 1 CRM Domain Refactor
    // 1. Create or Find Customer Entity
    const customerId = await crmService.createCustomer({
      name: data.nama,
      phone: data.nomor,
      businessName: data.usaha,
      address: data.alamat
    });
    
    // 2. Create Order Entity reference
    const orderId = await crmService.createOrder(customerId, {
      itemName: data.barang,
      installment: data.angsuran,
      tenor: data.tenor,
      tenorType: data.tenorType
    });
    
    return { clientId: customerId, orderId };
  },

  createRepeatOrder: async (clientId: string, data: any) => {
    // Phase 1 CRM Domain Refactor
    const orderId = await crmService.createRepeatOrder(clientId, {
      itemName: data.barang,
      installment: data.angsuran,
      tenor: data.tenor,
      tenorType: data.tenorType
    });
    return orderId;
  },

  updateOrderStage,
};

