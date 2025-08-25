export enum PurchaseOrderStatus {
  DRAFT = "draft",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  ORDERED = "ordered",
  PARTIALLY_RECEIVED = "partially_received",
  RECEIVED = "received",
  CANCELLED = "cancelled",
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItemCreate {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity?: number;
  notes?: string;
}

export interface PurchaseOrderItemUpdate {
  productId?: string;
  productName?: string;
  sku?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  receivedQuantity?: number;
  notes?: string;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  createdBy: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  expectedDeliveryDate: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  notes?: string;
  items: PurchaseOrderItemCreate[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderCreate {
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  expectedDeliveryDate: string;
  notes?: string;
  items: PurchaseOrderItemCreate[];
}

export interface PurchaseOrderUpdate {
  orderNumber?: string;
  supplierId?: string;
  supplierName?: string;
  expectedDeliveryDate?: string;
  status?: PurchaseOrderStatus;
  totalAmount?: number;
  notes?: string;
}

export interface PurchaseOrderResponse {
  purchaseOrder: PurchaseOrder;
}

export interface PurchaseOrdersResponse {
  purchaseOrders: PurchaseOrder[];
  total: number;
}
