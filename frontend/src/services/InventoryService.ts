import { apiService } from "./ApiService";
import {
  Warehouse,
  WarehouseCreate,
  WarehouseUpdate,
  WarehousesResponse,
  WarehouseResponse,
  StorageLocation,
  StorageLocationCreate,
  StorageLocationUpdate,
  StorageLocationsResponse,
  StorageLocationResponse,
  StockMovement,
  StockMovementCreate,
  StockMovementUpdate,
  StockMovementsResponse,
  StockMovementResponse,
  Supplier,
  SupplierCreate,
  SupplierUpdate,
  SuppliersResponse,
  SupplierResponse,
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderUpdate,
  PurchaseOrdersResponse,
  PurchaseOrderResponse,
  Receiving,
  ReceivingCreate,
  ReceivingUpdate,
  ReceivingsResponse,
  ReceivingResponse,
  InventoryDashboardStats,
} from "../models/inventory";

class InventoryService {
  // Warehouse Management
  async getWarehouses(
    skip: number = 0,
    limit: number = 100,
  ): Promise<WarehousesResponse> {
    const response = await apiService.get(
      `/inventory/warehouses?skip=${skip}&limit=${limit}`,
    );
    return response.data;
  }

  async getWarehouse(id: string): Promise<WarehouseResponse> {
    const response = await apiService.get(`/inventory/warehouses/${id}`);
    return response.data;
  }

  async createWarehouse(
    warehouse: WarehouseCreate,
  ): Promise<WarehouseResponse> {
    const response = await apiService.post("/inventory/warehouses", warehouse);
    return response.data;
  }

  async updateWarehouse(
    id: string,
    warehouse: WarehouseUpdate,
  ): Promise<WarehouseResponse> {
    const response = await apiService.put(
      `/inventory/warehouses/${id}`,
      warehouse,
    );
    return response.data;
  }

  async deleteWarehouse(id: string): Promise<void> {
    await apiService.delete(`/inventory/warehouses/${id}`);
  }

  // Storage Location Management
  async getStorageLocations(
    warehouseId?: string,
    skip: number = 0,
    limit: number = 100,
  ): Promise<StorageLocationsResponse> {
    const params = new URLSearchParams();
    if (warehouseId) params.append("warehouse_id", warehouseId);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const response = await apiService.get(
      `/inventory/storage-locations?${params.toString()}`,
    );
    return response.data;
  }

  async getStorageLocation(id: string): Promise<StorageLocationResponse> {
    const response = await apiService.get(`/inventory/storage-locations/${id}`);
    return response.data;
  }

  async createStorageLocation(
    location: StorageLocationCreate,
  ): Promise<StorageLocationResponse> {
    const response = await apiService.post(
      "/inventory/storage-locations",
      location,
    );
    return response.data;
  }

  async updateStorageLocation(
    id: string,
    location: StorageLocationUpdate,
  ): Promise<StorageLocationResponse> {
    const response = await apiService.put(
      `/inventory/storage-locations/${id}`,
      location,
    );
    return response.data;
  }

  async deleteStorageLocation(id: string): Promise<void> {
    await apiService.delete(`/inventory/storage-locations/${id}`);
  }

  // Stock Movement Management
  async getStockMovements(
    productId?: string,
    warehouseId?: string,
    skip: number = 0,
    limit: number = 100,
  ): Promise<StockMovementsResponse> {
    const params = new URLSearchParams();
    if (productId) params.append("product_id", productId);
    if (warehouseId) params.append("warehouse_id", warehouseId);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const response = await apiService.get(
      `/inventory/stock-movements?${params.toString()}`,
    );
    return response.data;
  }

  async getStockMovement(id: string): Promise<StockMovementResponse> {
    const response = await apiService.get(`/inventory/stock-movements/${id}`);
    return response.data;
  }

  async createStockMovement(
    movement: StockMovementCreate,
  ): Promise<StockMovementResponse> {
    const response = await apiService.post(
      "/inventory/stock-movements",
      movement,
    );
    return response.data;
  }

  async updateStockMovement(
    id: string,
    movement: StockMovementUpdate,
  ): Promise<StockMovementResponse> {
    const response = await apiService.put(
      `/inventory/stock-movements/${id}`,
      movement,
    );
    return response.data;
  }

  // Supplier Management
  async getSuppliers(
    skip: number = 0,
    limit: number = 100,
  ): Promise<SuppliersResponse> {
    const response = await apiService.get(
      `/inventory/suppliers?skip=${skip}&limit=${limit}`,
    );
    return response.data;
  }

  async getSupplier(id: string): Promise<SupplierResponse> {
    const response = await apiService.get(`/inventory/suppliers/${id}`);
    return response.data;
  }

  async createSupplier(supplier: SupplierCreate): Promise<SupplierResponse> {
    const response = await apiService.post("/inventory/suppliers", supplier);
    return response.data;
  }

  async updateSupplier(
    id: string,
    supplier: SupplierUpdate,
  ): Promise<SupplierResponse> {
    const response = await apiService.put(
      `/inventory/suppliers/${id}`,
      supplier,
    );
    return response.data;
  }

  async deleteSupplier(id: string): Promise<void> {
    await apiService.delete(`/inventory/suppliers/${id}`);
  }

  // Purchase Order Management
  async getPurchaseOrders(
    status?: string,
    skip: number = 0,
    limit: number = 100,
  ): Promise<PurchaseOrdersResponse> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const response = await apiService.get(
      `/inventory/purchase-orders?${params.toString()}`,
    );
    return response.data;
  }

  async getPurchaseOrder(id: string): Promise<PurchaseOrderResponse> {
    const response = await apiService.get(`/inventory/purchase-orders/${id}`);
    return response.data;
  }

  async createPurchaseOrder(
    order: PurchaseOrderCreate,
  ): Promise<PurchaseOrderResponse> {
    const response = await apiService.post("/inventory/purchase-orders", order);
    return response.data;
  }

  async updatePurchaseOrder(
    id: string,
    order: PurchaseOrderUpdate,
  ): Promise<PurchaseOrderResponse> {
    const response = await apiService.put(
      `/inventory/purchase-orders/${id}`,
      order,
    );
    return response.data;
  }

  async deletePurchaseOrder(id: string): Promise<void> {
    await apiService.delete(`/inventory/purchase-orders/${id}`);
  }

  // Receiving Management
  async getReceivings(
    status?: string,
    skip: number = 0,
    limit: number = 100,
  ): Promise<ReceivingsResponse> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    params.append("skip", skip.toString());
    params.append("limit", limit.toString());

    const response = await apiService.get(
      `/inventory/receivings?${params.toString()}`,
    );
    return response.data;
  }

  async getReceiving(id: string): Promise<ReceivingResponse> {
    const response = await apiService.get(`/inventory/receivings/${id}`);
    return response.data;
  }

  async createReceiving(
    receiving: ReceivingCreate,
  ): Promise<ReceivingResponse> {
    const response = await apiService.post("/inventory/receivings", receiving);
    return response.data;
  }

  async updateReceiving(
    id: string,
    receiving: ReceivingUpdate,
  ): Promise<ReceivingResponse> {
    const response = await apiService.put(
      `/inventory/receivings/${id}`,
      receiving,
    );
    return response.data;
  }

  async deleteReceiving(id: string): Promise<void> {
    await apiService.delete(`/inventory/receivings/${id}`);
  }

  // Dashboard
  async getInventoryDashboard(): Promise<InventoryDashboardStats> {
    const response = await apiService.get("/inventory/dashboard");
    return response.data;
  }
}

export const inventoryService = new InventoryService();
