"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  ShoppingCart,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { inventoryService } from "../../../services/InventoryService";
import {
  StockAlert,
  InventoryDashboardStats,
  PurchaseOrderCreate,
  PurchaseOrderItemCreate,
  Supplier,
} from "../../../models/inventory";
import { DashboardLayout } from "../../../components/layout";
import { formatCurrency } from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

export default function AlertsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboardStats, setDashboardStats] =
    useState<InventoryDashboardStats | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newOrder, setNewOrder] = useState<PurchaseOrderCreate>({
    orderNumber: "",
    supplierId: "",
    supplierName: "",
    expectedDeliveryDate: "",
    notes: "",
    items: [],
  });
  const [newItem, setNewItem] = useState<PurchaseOrderItemCreate>({
    productId: "",
    productName: "",
    sku: "",
    quantity: 0,
    unitCost: 0,
    totalCost: 0,
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsResponse, suppliersResponse] = await Promise.all([
        inventoryService.getInventoryDashboard(),
        inventoryService.getSuppliers(),
      ]);
      setDashboardStats(statsResponse);
      setSuppliers(suppliersResponse.suppliers);

      // Set default supplier if available
      if (suppliersResponse.suppliers.length > 0 && !newOrder.supplierId) {
        setNewOrder((prev) => ({
          ...prev,
          supplierId: suppliersResponse.suppliers[0].id,
          supplierName: suppliersResponse.suppliers[0].name,
        }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const stats = await inventoryService.getInventoryDashboard();
      setDashboardStats(stats);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    }
  };

  const filteredAlerts =
    dashboardStats?.lowStockAlerts?.filter((alert) => {
      if (filterType === "all") return true;
      return alert.alertType === filterType;
    }) || [];

  const handleAddItem = () => {
    if (
      !newItem.productId ||
      !newItem.productName ||
      newItem.quantity <= 0 ||
      newItem.unitCost <= 0
    ) {
      alert("Please fill in all required fields for the item");
      return;
    }

    const itemWithTotal = {
      ...newItem,
      totalCost: newItem.quantity * newItem.unitCost,
    };

    setNewOrder((prev) => ({
      ...prev,
      items: [...prev.items, itemWithTotal],
    }));

    // Reset item form
    setNewItem({
      productId: "",
      productName: "",
      sku: "",
      quantity: 0,
      unitCost: 0,
      totalCost: 0,
      notes: "",
    });
  };

  const removeItem = (index: number) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleCreateOrder = async () => {
    if (
      !newOrder.orderNumber ||
      !newOrder.supplierId ||
      newOrder.items.length === 0
    ) {
      alert("Please fill in all required fields and add at least one item");
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.createPurchaseOrder(newOrder);
      setIsPOModalOpen(false);
      resetForm();
      fetchData(); // Refresh alerts to see if any are resolved
    } catch (error) {
      console.error("Error creating purchase order:", error);
      alert("Failed to create purchase order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewOrder({
      orderNumber: "",
      supplierId: suppliers.length > 0 ? suppliers[0].id : "",
      supplierName: suppliers.length > 0 ? suppliers[0].name : "",
      expectedDeliveryDate: "",
      notes: "",
      items: [],
    });
    setNewItem({
      productId: "",
      productName: "",
      sku: "",
      quantity: 0,
      unitCost: 0,
      totalCost: 0,
      notes: "",
    });
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case "out_of_stock":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "low_stock":
        return <Package className="h-5 w-5 text-orange-500" />;
      case "expiry_warning":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertBadge = (alertType: string) => {
    const badgeConfig = {
      out_of_stock: { variant: "destructive", label: "Out of Stock" },
      low_stock: { variant: "secondary", label: "Low Stock" },
      expiry_warning: { variant: "default", label: "Expiry Warning" },
    };

    const config =
      badgeConfig[alertType as keyof typeof badgeConfig] ||
      badgeConfig.low_stock;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const getPriorityColor = (alertType: string) => {
    switch (alertType) {
      case "out_of_stock":
        return "border-l-red-500 bg-red-50";
      case "low_stock":
        return "border-l-orange-500 bg-orange-50";
      case "expiry_warning":
        return "border-l-yellow-500 bg-yellow-50";
      default:
        return "border-l-gray-500 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Inventory Alerts
            </h1>
            <p className="text-muted-foreground">
              Monitor stock levels and inventory warnings
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAlerts}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={() => setIsPOModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create PO
            </Button>
          </div>
        </div>

        {/* Alert Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Alerts
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.lowStockAlerts?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">Active alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Out of Stock
              </CardTitle>
              <Package className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardStats?.outOfStockProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">Critical items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardStats?.lowStockProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">Warning items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Products
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardStats?.totalProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">Inventory items</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                onClick={() => setFilterType("all")}
              >
                All Alerts ({dashboardStats?.lowStockAlerts?.length || 0})
              </Button>
              <Button
                variant={filterType === "out_of_stock" ? "default" : "outline"}
                onClick={() => setFilterType("out_of_stock")}
              >
                Out of Stock ({dashboardStats?.outOfStockProducts || 0})
              </Button>
              <Button
                variant={filterType === "low_stock" ? "default" : "outline"}
                onClick={() => setFilterType("low_stock")}
              >
                Low Stock ({dashboardStats?.lowStockProducts || 0})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAlerts.length > 0 ? (
              <div className="space-y-4">
                {filteredAlerts.map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${getPriorityColor(alert.alertType)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getAlertIcon(alert.alertType)}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-lg">
                              {alert.productName}
                            </h3>
                            {getAlertBadge(alert.alertType)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            SKU: {alert.sku}
                          </p>
                          <p className="text-sm mb-3">{alert.message}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              <span>
                                Current: <strong>{alert.currentStock}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              <span>
                                Minimum: <strong>{alert.minStockLevel}</strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(
                              `/inventory/products/${alert.productId}`,
                            )
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setIsPOModalOpen(true)}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Order
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">No alerts found</h3>
                <p className="text-muted-foreground mb-4">
                  {filterType === "all"
                    ? "All inventory items are properly stocked"
                    : `No ${filterType.replace("_", " ")} alerts at the moment`}
                </p>
                {filterType !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => setFilterType("all")}
                  >
                    View All Alerts
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => setIsPOModalOpen(true)}
              >
                <ShoppingCart className="h-6 w-6" />
                <span>Create Purchase Order</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push("/inventory/stock-movements")}
              >
                <Package className="h-6 w-6" />
                <span>Record Stock Movement</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push("/inventory/products")}
              >
                <Eye className="h-6 w-6" />
                <span>View All Products</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Purchase Order Modal */}
        <Dialog open={isPOModalOpen} onOpenChange={setIsPOModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order from Alert</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Order Number *</Label>
                  <Input
                    id="orderNumber"
                    value={newOrder.orderNumber}
                    onChange={(e) =>
                      setNewOrder((prev) => ({
                        ...prev,
                        orderNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter PO number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedDeliveryDate">
                    Expected Delivery *
                  </Label>
                  <Input
                    id="expectedDeliveryDate"
                    type="date"
                    value={newOrder.expectedDeliveryDate}
                    onChange={(e) =>
                      setNewOrder((prev) => ({
                        ...prev,
                        expectedDeliveryDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierId">Supplier *</Label>
                <Select
                  value={newOrder.supplierId}
                  onValueChange={(value) => {
                    const supplier = suppliers.find((s) => s.id === value);
                    setNewOrder((prev) => ({
                      ...prev,
                      supplierId: value,
                      supplierName: supplier?.name || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newOrder.notes}
                  onChange={(e) =>
                    setNewOrder((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Enter order notes"
                  rows={3}
                />
              </div>

              {/* Items Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-medium">Order Items</Label>
                  <Button variant="outline" size="sm" onClick={handleAddItem}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Button>
                </div>

                {/* Add Item Form */}
                <div className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="productId">Product ID *</Label>
                    <Input
                      id="productId"
                      value={newItem.productId}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          productId: e.target.value,
                        }))
                      }
                      placeholder="Product ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="productName">Product Name *</Label>
                    <Input
                      id="productName"
                      value={newItem.productName}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          productName: e.target.value,
                        }))
                      }
                      placeholder="Product name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={newItem.quantity}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="Qty"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitCost">Unit Cost *</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={newItem.unitCost}
                      onChange={(e) =>
                        setNewItem((prev) => ({
                          ...prev,
                          unitCost: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="Cost"
                    />
                  </div>
                </div>

                {/* Items List */}
                {newOrder.items.length > 0 && (
                  <div className="space-y-2">
                    <Label>Added Items</Label>
                    <div className="space-y-2">
                      {newOrder.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {item.productName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unitCost)}{" "}
                              = {formatCurrency(item.totalCost)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                          >
                            <Plus className="h-4 w-4 rotate-45" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="text-right font-medium">
                      Total:{" "}
                      {formatCurrency(
                        newOrder.items.reduce(
                          (sum, item) => sum + item.totalCost,
                          0,
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsPOModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOrder}
                disabled={isSubmitting || newOrder.items.length === 0}
              >
                {isSubmitting ? "Creating..." : "Create Purchase Order"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
