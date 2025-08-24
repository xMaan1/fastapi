from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional, List
import json
import uuid
from datetime import datetime, timedelta

from ...models.unified_models import (
    Product, ProductCreate, ProductUpdate, ProductsResponse, ProductResponse,
    POSShift, POSShiftCreate, POSShiftUpdate, POSShiftsResponse, POSShiftResponse,
    POSTransaction, POSTransactionCreate, POSTransactionUpdate, POSTransactionsResponse, POSTransactionResponse,
    POSDashboard, POSMetrics, ProductFilters, POSTransactionFilters, POSShiftFilters
)
from ...config.unified_database import (
    get_db, get_user_by_id,
    get_products, get_product_by_id, create_product, update_product, delete_product,
    get_pos_shifts, get_pos_shift_by_id, get_open_pos_shift, create_pos_shift, update_pos_shift,
    get_pos_transactions, get_pos_transaction_by_id, create_pos_transaction, update_pos_transaction,
    get_pos_dashboard_data
)
from ...api.dependencies import get_current_user, get_tenant_context, require_tenant_admin_or_super_admin

router = APIRouter(prefix="/pos", tags=["pos"])

# Helper functions
def generate_transaction_number():
    """Generate unique transaction number"""
    return f"TXN-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

def generate_shift_number():
    """Generate unique shift number"""
    return f"SHIFT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

def calculate_transaction_totals(items: List[dict], discount: float = 0.0, tax_rate: float = 0.0) -> dict:
    """Calculate transaction totals"""
    subtotal = sum(item['total'] for item in items)
    discount_amount = subtotal * (discount / 100) if discount > 0 else 0
    taxable_amount = subtotal - discount_amount
    tax_amount = taxable_amount * (tax_rate / 100) if tax_rate > 0 else 0
    total = taxable_amount + tax_amount
    
    return {
        "subtotal": round(subtotal, 2),
        "discount": round(discount_amount, 2),
        "taxAmount": round(tax_amount, 2),
        "total": round(total, 2)
    }

# Product endpoints
@router.get("/products", response_model=ProductsResponse)
async def get_pos_products(
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    low_stock: Optional[bool] = Query(None),
    is_active: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all products with optional filtering"""
    try:
        skip = (page - 1) * limit
        products = get_products(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if category or search or low_stock is not None or is_active is not None:
            filtered_products = []
            for product in products:
                if category and product.category != category:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in (product.name or "").lower(),
                        search_lower in (product.sku or "").lower(),
                        search_lower in (product.description or "").lower()
                    ]):
                        continue
                if low_stock is not None:
                    if low_stock and product.stockQuantity > product.lowStockThreshold:
                        continue
                    if not low_stock and product.stockQuantity <= product.lowStockThreshold:
                        continue
                if is_active is not None and product.isActive != is_active:
                    continue
                filtered_products.append(product)
            products = filtered_products
        
        # Get total count for pagination
        total = len(products)
        
        return ProductsResponse(
            products=products,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching products: {str(e)}")

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_pos_product(
    product_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific product by ID"""
    try:
        product = get_product_by_id(db, product_id, tenant_context["tenant_id"] if tenant_context else None)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return ProductResponse(product=product)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching product: {str(e)}")

@router.post("/products", response_model=ProductResponse)
async def create_pos_product(
    product_data: ProductCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new product"""
    try:
        product = Product(
            id=str(uuid.uuid4()),
            **product_data.dict(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdBy=str(current_user.id),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db_product = create_product(db, product.__dict__)
        return ProductResponse(product=db_product)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")

@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_pos_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update an existing product"""
    try:
        db_product = update_product(
            db, 
            product_id, 
            product_data.dict(exclude_unset=True), 
            tenant_context["tenant_id"] if tenant_context else None
        )
        if not db_product:
            raise HTTPException(status_code=404, detail="Product not found")
        return ProductResponse(product=db_product)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")

@router.delete("/products/{product_id}")
async def delete_pos_product(
    product_id: str,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Delete a product"""
    try:
        success = delete_product(db, product_id, tenant_context["tenant_id"] if tenant_context else None)
        if not success:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"message": "Product deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")

# POS Shift endpoints
@router.get("/shifts", response_model=POSShiftsResponse)
async def get_pos_shifts(
    status: Optional[str] = Query(None),
    cashier_id: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all POS shifts with optional filtering"""
    try:
        skip = (page - 1) * limit
        shifts = get_pos_shifts(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if status or cashier_id or date_from or date_to:
            filtered_shifts = []
            for shift in shifts:
                if status and shift.status != status:
                    continue
                if cashier_id and shift.cashierId != cashier_id:
                    continue
                if date_from:
                    shift_date = datetime.fromisoformat(shift.openedAt.replace('Z', '+00:00'))
                    from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                    if shift_date < from_date:
                        continue
                if date_to:
                    shift_date = datetime.fromisoformat(shift.openedAt.replace('Z', '+00:00'))
                    to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                    if shift_date > to_date:
                        continue
                filtered_shifts.append(shift)
            shifts = filtered_shifts
        
        # Get total count for pagination
        total = len(shifts)
        
        return POSShiftsResponse(
            shifts=shifts,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching shifts: {str(e)}")

@router.get("/shifts/{shift_id}", response_model=POSShiftResponse)
async def get_pos_shift(
    shift_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific shift by ID"""
    try:
        shift = get_pos_shift_by_id(db, shift_id, tenant_context["tenant_id"] if tenant_context else None)
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        return POSShiftResponse(shift=shift)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching shift: {str(e)}")

@router.post("/shifts", response_model=POSShiftResponse)
async def create_pos_shift(
    shift_data: POSShiftCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new POS shift"""
    try:
        # Check if user already has an open shift
        existing_open_shift = get_open_pos_shift(db, tenant_context["tenant_id"] if tenant_context else None, str(current_user.id))
        if existing_open_shift:
            raise HTTPException(status_code=400, detail="User already has an open shift")
        
        shift = POSShift(
            id=str(uuid.uuid4()),
            shiftNumber=generate_shift_number(),
            cashierId=str(current_user.id),
            cashierName=f"{current_user.firstName or ''} {current_user.lastName or ''}".strip() or current_user.userName,
            openingBalance=shift_data.openingBalance,
            totalSales=0.0,
            totalTransactions=0,
            status="open",
            openedAt=datetime.now(),
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db_shift = create_pos_shift(db, shift.__dict__)
        return POSShiftResponse(shift=db_shift)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating shift: {str(e)}")

@router.put("/shifts/{shift_id}", response_model=POSShiftResponse)
async def update_pos_shift(
    shift_id: str,
    shift_data: POSShiftUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update an existing shift"""
    try:
        db_shift = update_pos_shift(
            db, 
            shift_id, 
            shift_data.dict(exclude_unset=True), 
            tenant_context["tenant_id"] if tenant_context else None
        )
        if not db_shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        return POSShiftResponse(shift=db_shift)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating shift: {str(e)}")

@router.get("/shifts/current/open")
async def get_current_open_shift(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get current user's open shift"""
    try:
        shift = get_open_pos_shift(db, tenant_context["tenant_id"] if tenant_context else None, str(current_user.id))
        if shift:
            return {"shift": shift}
        return {"shift": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching open shift: {str(e)}")

# POS Transaction endpoints
@router.get("/transactions", response_model=POSTransactionsResponse)
async def get_pos_transactions(
    status: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    amount_from: Optional[float] = Query(None),
    amount_to: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get all POS transactions with optional filtering"""
    try:
        skip = (page - 1) * limit
        transactions = get_pos_transactions(db, tenant_context["tenant_id"] if tenant_context else None, skip, limit)
        
        # Apply additional filters if provided
        if status or payment_method or date_from or date_to or amount_from or amount_to or search:
            filtered_transactions = []
            for transaction in transactions:
                if status and transaction.status != status:
                    continue
                if payment_method and transaction.paymentMethod != payment_method:
                    continue
                if date_from:
                    transaction_date = datetime.fromisoformat(transaction.createdAt.replace('Z', '+00:00'))
                    from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                    if transaction_date < from_date:
                        continue
                if date_to:
                    transaction_date = datetime.fromisoformat(transaction.createdAt.replace('Z', '+00:00'))
                    to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                    if transaction_date > to_date:
                        continue
                if amount_from and transaction.total < amount_from:
                    continue
                if amount_to and transaction.total > amount_to:
                    continue
                if search:
                    search_lower = search.lower()
                    if not any([
                        search_lower in transaction.transactionNumber.lower(),
                        search_lower in (transaction.customerName or "").lower(),
                        search_lower in transaction.cashierName.lower()
                    ]):
                        continue
                filtered_transactions.append(transaction)
            transactions = filtered_transactions
        
        # Get total count for pagination
        total = len(transactions)
        
        return POSTransactionsResponse(
            transactions=transactions,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transactions: {str(e)}")

@router.get("/transactions/{transaction_id}", response_model=POSTransactionResponse)
async def get_pos_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get a specific transaction by ID"""
    try:
        transaction = get_pos_transaction_by_id(db, transaction_id, tenant_context["tenant_id"] if tenant_context else None)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return POSTransactionResponse(transaction=transaction)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transaction: {str(e)}")

@router.post("/transactions", response_model=POSTransactionResponse)
async def create_pos_transaction(
    transaction_data: POSTransactionCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Create a new POS transaction"""
    try:
        # Check if user has an open shift
        open_shift = get_open_pos_shift(db, tenant_context["tenant_id"] if tenant_context else None, str(current_user.id))
        if not open_shift:
            raise HTTPException(status_code=400, detail="No open shift found. Please open a shift first.")
        
        # Calculate totals
        totals = calculate_transaction_totals(transaction_data.items, transaction_data.discount, 0.0)  # No tax for now
        
        transaction = POSTransaction(
            id=str(uuid.uuid4()),
            transactionNumber=generate_transaction_number(),
            **transaction_data.dict(),
            **totals,
            status="completed",  # Auto-complete for now
            tenantId=tenant_context["tenant_id"] if tenant_context else str(uuid.uuid4()),
            shiftId=str(open_shift.id),
            cashierId=str(current_user.id),
            cashierName=f"{current_user.firstName or ''} {current_user.lastName or ''}".strip() or current_user.userName,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        
        db_transaction = create_pos_transaction(db, transaction.__dict__)
        
        # Update shift totals
        open_shift.totalSales += totals["total"]
        open_shift.totalTransactions += 1
        db.commit()
        db.refresh(open_shift)
        
        return POSTransactionResponse(transaction=db_transaction)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating transaction: {str(e)}")

@router.put("/transactions/{transaction_id}", response_model=POSTransactionResponse)
async def update_pos_transaction(
    transaction_id: str,
    transaction_data: POSTransactionUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Update an existing transaction"""
    try:
        db_transaction = update_pos_transaction(
            db, 
            transaction_id, 
            transaction_data.dict(exclude_unset=True), 
            tenant_context["tenant_id"] if tenant_context else None
        )
        if not db_transaction:
            raise HTTPException(status_code=404, detail="Transaction not found")
        return POSTransactionResponse(transaction=db_transaction)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating transaction: {str(e)}")

# POS Reports endpoints
@router.get("/reports/sales")
async def get_pos_sales_report(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    payment_method: Optional[str] = Query(None),
    cashier_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get POS sales report"""
    try:
        transactions = get_pos_transactions(db, tenant_context["tenant_id"] if tenant_context else None, 0, 1000)
        
        # Handle case where no transactions exist
        if not transactions:
            return {
                "summary": {
                    "totalSales": 0.0,
                    "totalTransactions": 0,
                    "averageTransaction": 0.0,
                    "dateRange": {
                        "from": date_from,
                        "to": date_to
                    }
                },
                "paymentMethods": {},
                "dailySales": {},
                "transactions": []
            }
        
        # Apply date filters
        if date_from or date_to:
            filtered_transactions = []
            for transaction in transactions:
                try:
                    transaction_date = datetime.fromisoformat(transaction.createdAt.replace('Z', '+00:00'))
                    
                    if date_from:
                        from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                        if transaction_date < from_date:
                            continue
                    
                    if date_to:
                        to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                        if transaction_date > to_date:
                            continue
                    
                    filtered_transactions.append(transaction)
                except (ValueError, AttributeError) as e:
                    # Skip transactions with invalid dates
                    continue
            transactions = filtered_transactions
        
        # Apply additional filters
        if payment_method:
            transactions = [t for t in transactions if t.paymentMethod == payment_method]
        
        if cashier_id:
            transactions = [t for t in transactions if t.cashierId == cashier_id]
        
        # Calculate report data
        total_sales = sum(t.total for t in transactions)
        total_transactions = len(transactions)
        avg_transaction = total_sales / total_transactions if total_transactions > 0 else 0
        
        # Group by payment method
        payment_methods = {}
        for transaction in transactions:
            method = transaction.paymentMethod
            if method not in payment_methods:
                payment_methods[method] = {"count": 0, "total": 0}
            payment_methods[method]["count"] += 1
            payment_methods[method]["total"] += transaction.total
        
        # Group by date
        daily_sales = {}
        for transaction in transactions:
            try:
                date = transaction.createdAt[:10]  # Get date part only
                if date not in daily_sales:
                    daily_sales[date] = {"sales": 0, "transactions": 0}
                daily_sales[date]["sales"] += transaction.total
                daily_sales[date]["transactions"] += 1
            except (AttributeError, TypeError):
                # Skip transactions with invalid dates
                continue
        
        return {
            "summary": {
                "totalSales": round(total_sales, 2),
                "totalTransactions": total_transactions,
                "averageTransaction": round(avg_transaction, 2),
                "dateRange": {
                    "from": date_from,
                    "to": date_to
                }
            },
            "paymentMethods": payment_methods,
            "dailySales": daily_sales,
            "transactions": transactions[:100]  # Limit to 100 for performance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating sales report: {str(e)}")

@router.get("/reports/inventory")
async def get_pos_inventory_report(
    low_stock_only: bool = Query(False, description="Show only low stock items"),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get POS inventory report"""
    try:
        products = get_products(db, tenant_context["tenant_id"] if tenant_context else None, 0, 1000)
        
        # Handle case where no products exist
        if not products:
            return {
                "summary": {
                    "totalProducts": 0,
                    "totalInventoryValue": 0.0,
                    "lowStockItems": 0,
                    "outOfStockItems": 0
                },
                "categorySummary": {},
                "lowStockProducts": [],
                "products": []
            }
        
        # Apply filters
        if low_stock_only:
            products = [p for p in products if p.stockQuantity <= p.lowStockThreshold]
        
        if category:
            products = [p for p in products if p.category == category]
        
        # Calculate inventory metrics
        total_products = len(products)
        total_value = sum(p.price * p.stockQuantity for p in products)
        low_stock_count = len([p for p in products if p.stockQuantity <= p.lowStockThreshold])
        out_of_stock_count = len([p for p in products if p.stockQuantity == 0])
        
        # Group by category
        category_summary = {}
        for product in products:
            cat = product.category
            if cat not in category_summary:
                category_summary[cat] = {"count": 0, "totalValue": 0, "lowStock": 0}
            category_summary[cat]["count"] += 1
            category_summary[cat]["totalValue"] += product.price * product.stockQuantity
            if product.stockQuantity <= product.lowStockThreshold:
                category_summary[cat]["lowStock"] += 1
        
        return {
            "summary": {
                "totalProducts": total_products,
                "totalInventoryValue": round(total_value, 2),
                "lowStockItems": low_stock_count,
                "outOfStockItems": out_of_stock_count
            },
            "categorySummary": category_summary,
            "lowStockProducts": [p for p in products if p.stockQuantity <= p.lowStockThreshold],
            "products": products[:100]  # Limit to 100 for performance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating inventory report: {str(e)}")

@router.get("/reports/shifts")
async def get_pos_shifts_report(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    cashier_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get POS shifts report"""
    try:
        shifts = get_pos_shifts(db, tenant_context["tenant_id"] if tenant_context else None, 0, 1000)
        
        # Handle case where no shifts exist
        if not shifts:
            return {
                "summary": {
                    "totalShifts": 0,
                    "openShifts": 0,
                    "closedShifts": 0,
                    "totalSales": 0.0,
                    "totalTransactions": 0,
                    "dateRange": {
                        "from": date_from,
                        "to": date_to
                    }
                },
                "cashierSummary": {},
                "shifts": []
            }
        
        # Apply date filters
        if date_from or date_to:
            filtered_shifts = []
            for shift in shifts:
                try:
                    shift_date = datetime.fromisoformat(shift.openedAt.replace('Z', '+00:00'))
                    
                    if date_from:
                        from_date = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                        if shift_date < from_date:
                            continue
                    
                    if date_to:
                        to_date = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
                        if shift_date > to_date:
                            continue
                    
                    filtered_shifts.append(shift)
                except (ValueError, AttributeError) as e:
                    # Skip shifts with invalid dates
                    continue
            shifts = filtered_shifts
        
        # Apply cashier filter
        if cashier_id:
            shifts = [s for s in shifts if s.cashierId == cashier_id]
        
        # Calculate report data
        total_shifts = len(shifts)
        open_shifts = len([s for s in shifts if s.status == "open"])
        closed_shifts = len([s for s in shifts if s.status == "closed"])
        total_sales = sum(s.totalSales for s in shifts)
        total_transactions = sum(s.totalTransactions for s in shifts)
        
        # Group by cashier
        cashier_summary = {}
        for shift in shifts:
            cashier = shift.cashierName
            if cashier not in cashier_summary:
                cashier_summary[cashier] = {"shifts": 0, "totalSales": 0, "totalTransactions": 0}
            cashier_summary[cashier]["shifts"] += 1
            cashier_summary[cashier]["totalSales"] += shift.totalSales
            cashier_summary[cashier]["totalTransactions"] += shift.totalTransactions
        
        return {
            "summary": {
                "totalShifts": total_shifts,
                "openShifts": open_shifts,
                "closedShifts": closed_shifts,
                "totalSales": round(total_sales, 2),
                "totalTransactions": total_transactions,
                "dateRange": {
                    "from": date_from,
                    "to": date_to
                }
            },
            "cashierSummary": cashier_summary,
            "shifts": shifts[:100]  # Limit to 100 for performance
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating shifts report: {str(e)}")

# POS Dashboard endpoint
@router.get("/dashboard")
async def get_pos_dashboard(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Get POS dashboard data"""
    try:
        dashboard_data = get_pos_dashboard_data(db, tenant_context["tenant_id"] if tenant_context else None)
        return dashboard_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")

# Product search endpoint for POS
@router.get("/products/search")
async def search_products(
    q: str = Query(..., description="Search query for product name, SKU, or barcode"),
    db: Session = Depends(get_db),
    tenant_context: Optional[dict] = Depends(get_tenant_context)
):
    """Search products for POS operations"""
    try:
        products = get_products(db, tenant_context["tenant_id"] if tenant_context else None, 0, 100)
        
        # Filter products by search query
        search_lower = q.lower()
        matching_products = []
        
        for product in products:
            if (search_lower in product.name.lower() or 
                search_lower in product.sku.lower() or 
                (product.barcode and search_lower in product.barcode.lower())):
                matching_products.append(product)
        
        return {
            "products": matching_products[:10],  # Limit to 10 results
            "total": len(matching_products)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching products: {str(e)}")
