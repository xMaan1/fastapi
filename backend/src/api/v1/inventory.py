from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import uuid

from ..dependencies import get_current_user, get_current_tenant
from ...config.unified_database import get_db
from ...models.unified_models import (
    User, Tenant,
    Warehouse, WarehouseCreate, WarehouseUpdate, WarehouseResponse, WarehousesResponse,
    StorageLocation, StorageLocationCreate, StorageLocationUpdate, StorageLocationResponse, StorageLocationsResponse,
    StockMovement, StockMovementCreate, StockMovementUpdate, StockMovementResponse, StockMovementsResponse,
    Supplier, SupplierCreate, SupplierUpdate, SupplierResponse, SuppliersResponse,
    PurchaseOrder, PurchaseOrderCreate, PurchaseOrderUpdate, PurchaseOrderResponse, PurchaseOrdersResponse,
    Receiving, ReceivingCreate, ReceivingUpdate, ReceivingResponse, ReceivingsResponse,
    InventoryDashboardStats, StockAlert
)
from ...config.unified_database import (
    get_warehouses, get_warehouse_by_id, create_warehouse, update_warehouse, delete_warehouse,
    get_storage_locations, get_storage_location_by_id, create_storage_location, update_storage_location, delete_storage_location,
    get_stock_movements, get_stock_movement_by_id, create_stock_movement, update_stock_movement,
    get_suppliers, get_supplier_by_id, create_supplier, update_supplier, delete_supplier,
    get_purchase_orders, get_purchase_order_by_id, create_purchase_order, update_purchase_order, delete_purchase_order,
    get_receivings, get_receiving_by_id, create_receiving, update_receiving, delete_receiving,
    get_inventory_dashboard_stats
)

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

# Warehouse Endpoints
@router.get("/warehouses", response_model=WarehousesResponse)
def read_warehouses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get all warehouses for the current tenant"""
    warehouses = get_warehouses(db, str(current_tenant.id), skip, limit)
    total = len(warehouses)  # Simplified - you can add proper count query
    return WarehousesResponse(warehouses=warehouses, total=total)

@router.get("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
def read_warehouse(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get a specific warehouse by ID"""
    warehouse = get_warehouse_by_id(db, warehouse_id, str(current_tenant.id))
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return WarehouseResponse(warehouse=warehouse)

@router.post("/warehouses", response_model=WarehouseResponse)
def create_warehouse_endpoint(
    warehouse: WarehouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Create a new warehouse"""
    warehouse_data = warehouse.dict()
    warehouse_data.update({
        "id": str(uuid.uuid4()),
        "tenantId": str(current_tenant.id),
        "createdBy": str(current_user.id),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    
    db_warehouse = create_warehouse(db, warehouse_data)
    return WarehouseResponse(warehouse=db_warehouse)

@router.put("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
def update_warehouse_endpoint(
    warehouse_id: str,
    warehouse: WarehouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Update an existing warehouse"""
    warehouse_update = warehouse.dict(exclude_unset=True)
    warehouse_update["updatedAt"] = datetime.utcnow()
    
    db_warehouse = update_warehouse(db, warehouse_id, warehouse_update, str(current_tenant.id))
    if not db_warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    
    return WarehouseResponse(warehouse=db_warehouse)

@router.delete("/warehouses/{warehouse_id}")
def delete_warehouse_endpoint(
    warehouse_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Delete a warehouse"""
    success = delete_warehouse(db, warehouse_id, str(current_tenant.id))
    if not success:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return {"message": "Warehouse deleted successfully"}

# Storage Location Endpoints
@router.get("/storage-locations", response_model=StorageLocationsResponse)
def read_storage_locations(
    warehouse_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get all storage locations for the current tenant"""
    locations = get_storage_locations(db, str(current_tenant.id), warehouse_id, skip, limit)
    total = len(locations)
    return StorageLocationsResponse(storageLocations=locations, total=total)

@router.get("/storage-locations/{location_id}", response_model=StorageLocationResponse)
def read_storage_location(
    location_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get a specific storage location by ID"""
    location = get_storage_location_by_id(db, location_id, str(current_tenant.id))
    if not location:
        raise HTTPException(status_code=404, detail="Storage location not found")
    return StorageLocationResponse(storageLocation=location)

@router.post("/storage-locations", response_model=StorageLocationResponse)
def create_storage_location_endpoint(
    location: StorageLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Create a new storage location"""
    location_data = location.dict()
    location_data.update({
        "id": str(uuid.uuid4()),
        "tenantId": str(current_tenant.id),
        "createdBy": str(current_user.id),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    
    db_location = create_storage_location(db, location_data)
    return StorageLocationResponse(storageLocation=db_location)

@router.put("/storage-locations/{location_id}", response_model=StorageLocationResponse)
def update_storage_location_endpoint(
    location_id: str,
    location: StorageLocationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Update an existing storage location"""
    location_update = location.dict(exclude_unset=True)
    location_update["updatedAt"] = datetime.utcnow()
    
    db_location = update_storage_location(db, location_id, location_update, str(current_tenant.id))
    if not db_location:
        raise HTTPException(status_code=404, detail="Storage location not found")
    
    return StorageLocationResponse(storageLocation=db_location)

@router.delete("/storage-locations/{location_id}")
def delete_storage_location_endpoint(
    location_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Delete a storage location"""
    success = delete_storage_location(db, location_id, str(current_tenant.id))
    if not success:
        raise HTTPException(status_code=404, detail="Storage location not found")
    return {"message": "Storage location deleted successfully"}

# Stock Movement Endpoints
@router.get("/stock-movements", response_model=StockMovementsResponse)
def read_stock_movements(
    product_id: Optional[str] = Query(None),
    warehouse_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get all stock movements for the current tenant"""
    movements = get_stock_movements(db, str(current_tenant.id), product_id, warehouse_id, skip, limit)
    total = len(movements)
    return StockMovementsResponse(stockMovements=movements, total=total)

@router.get("/stock-movements/{movement_id}", response_model=StockMovementResponse)
def read_stock_movement(
    movement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get a specific stock movement by ID"""
    movement = get_stock_movement_by_id(db, movement_id, str(current_tenant.id))
    if not movement:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    return StockMovementResponse(stockMovement=movement)

@router.post("/stock-movements", response_model=StockMovementResponse)
def create_stock_movement_endpoint(
    movement: StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Create a new stock movement"""
    movement_data = movement.dict()
    movement_data.update({
        "id": str(uuid.uuid4()),
        "tenantId": str(current_tenant.id),
        "createdBy": str(current_user.id),
        "status": "pending",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    
    db_movement = create_stock_movement(db, movement_data)
    return StockMovementResponse(stockMovement=db_movement)

@router.put("/stock-movements/{movement_id}", response_model=StockMovementResponse)
def update_stock_movement_endpoint(
    movement_id: str,
    movement: StockMovementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Update an existing stock movement"""
    movement_update = movement.dict(exclude_unset=True)
    movement_update["updatedAt"] = datetime.utcnow()
    
    db_movement = update_stock_movement(db, movement_id, movement_update, str(current_tenant.id))
    if not db_movement:
        raise HTTPException(status_code=404, detail="Stock movement not found")
    
    return StockMovementResponse(stockMovement=db_movement)

# Supplier Endpoints
@router.get("/suppliers", response_model=SuppliersResponse)
def read_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get all suppliers for the current tenant"""
    suppliers = get_suppliers(db, str(current_tenant.id), skip, limit)
    total = len(suppliers)
    return SuppliersResponse(suppliers=suppliers, total=total)

@router.get("/suppliers/{supplier_id}", response_model=SupplierResponse)
def read_supplier(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get a specific supplier by ID"""
    supplier = get_supplier_by_id(db, supplier_id, str(current_tenant.id))
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return SupplierResponse(supplier=supplier)

@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier_endpoint(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Create a new supplier"""
    supplier_data = supplier.dict()
    supplier_data.update({
        "id": str(uuid.uuid4()),
        "tenantId": str(current_tenant.id),
        "createdBy": str(current_user.id),
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    
    db_supplier = create_supplier(db, supplier_data)
    return SupplierResponse(supplier=db_supplier)

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier_endpoint(
    supplier_id: str,
    supplier: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Update an existing supplier"""
    supplier_update = supplier.dict(exclude_unset=True)
    supplier_update["updatedAt"] = datetime.utcnow()
    
    db_supplier = update_supplier(db, supplier_id, supplier_update, str(current_tenant.id))
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    return SupplierResponse(supplier=db_supplier)

@router.delete("/suppliers/{supplier_id}")
def delete_supplier_endpoint(
    supplier_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Delete a supplier"""
    success = delete_supplier(db, supplier_id, str(current_tenant.id))
    if not success:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted successfully"}

# Purchase Order Endpoints
@router.get("/purchase-orders", response_model=PurchaseOrdersResponse)
def read_purchase_orders(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get all purchase orders for the current tenant"""
    orders = get_purchase_orders(db, str(current_tenant.id), status, skip, limit)
    total = len(orders)
    return PurchaseOrdersResponse(purchaseOrders=orders, total=total)

@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def read_purchase_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get a specific purchase order by ID"""
    order = get_purchase_order_by_id(db, order_id, str(current_tenant.id))
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return PurchaseOrderResponse(purchaseOrder=order)

@router.post("/purchase-orders", response_model=PurchaseOrderResponse)
def create_purchase_order_endpoint(
    order: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Create a new purchase order"""
    # Calculate total amount from items
    total_amount = sum(item.totalCost for item in order.items)
    
    order_data = order.dict()
    order_data.update({
        "id": str(uuid.uuid4()),
        "tenantId": str(current_tenant.id),
        "createdBy": str(current_user.id),
        "status": "draft",
        "totalAmount": total_amount,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    
    db_order = create_purchase_order(db, order_data)
    return PurchaseOrderResponse(purchaseOrder=db_order)

@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order_endpoint(
    order_id: str,
    order: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Update an existing purchase order"""
    order_update = order.dict(exclude_unset=True)
    order_update["updatedAt"] = datetime.utcnow()
    
    db_order = update_purchase_order(db, order_id, order_update, str(current_tenant.id))
    if not db_order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    return PurchaseOrderResponse(purchaseOrder=db_order)

@router.delete("/purchase-orders/{order_id}")
def delete_purchase_order_endpoint(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Delete a purchase order"""
    success = delete_purchase_order(db, order_id, str(current_tenant.id))
    if not success:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {"message": "Purchase order deleted successfully"}

# Receiving Endpoints
@router.get("/receivings", response_model=ReceivingsResponse)
def read_receivings(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get all receivings for the current tenant"""
    receivings = get_receivings(db, str(current_tenant.id), status, skip, limit)
    total = len(receivings)
    return ReceivingsResponse(receivings=receivings, total=total)

@router.get("/receivings/{receiving_id}", response_model=ReceivingResponse)
def read_receiving(
    receiving_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get a specific receiving by ID"""
    receiving = get_receiving_by_id(db, receiving_id, str(current_tenant.id))
    if not receiving:
        raise HTTPException(status_code=404, detail="Receiving not found")
    return ReceivingResponse(receiving=receiving)

@router.post("/receivings", response_model=ReceivingResponse)
def create_receiving_endpoint(
    receiving: ReceivingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Create a new receiving"""
    receiving_data = receiving.dict()
    receiving_data.update({
        "id": str(uuid.uuid4()),
        "tenantId": str(current_tenant.id),
        "createdBy": str(current_user.id),
        "status": "pending",
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })
    
    db_receiving = create_receiving(db, receiving_data)
    return ReceivingResponse(receiving=db_receiving)

@router.put("/receivings/{receiving_id}", response_model=ReceivingResponse)
def update_receiving_endpoint(
    receiving_id: str,
    receiving: ReceivingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Update an existing receiving"""
    receiving_update = receiving.dict(exclude_unset=True)
    receiving_update["updatedAt"] = datetime.utcnow()
    
    db_receiving = update_receiving(db, receiving_id, receiving_update, str(current_tenant.id))
    if not db_receiving:
        raise HTTPException(status_code=404, detail="Receiving not found")
    
    return ReceivingResponse(receiving=db_receiving)

@router.delete("/receivings/{receiving_id}")
def delete_receiving_endpoint(
    receiving_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Delete a receiving"""
    success = delete_receiving(db, receiving_id, str(current_tenant.id))
    if not success:
        raise HTTPException(status_code=404, detail="Receiving not found")
    return {"message": "Receiving deleted successfully"}

# Dashboard Endpoints
@router.get("/dashboard", response_model=InventoryDashboardStats)
def get_inventory_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    current_tenant: Tenant = Depends(get_current_tenant)
):
    """Get inventory dashboard statistics"""
    return get_inventory_dashboard_stats(db, str(current_tenant.id))
