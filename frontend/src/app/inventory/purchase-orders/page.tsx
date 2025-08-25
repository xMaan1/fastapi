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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  ClipboardList,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  DollarSign,
  Building2,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { inventoryService } from "../../../services/InventoryService";
import {
  PurchaseOrder,
  PurchaseOrderCreate,
  PurchaseOrderItemCreate,
  Supplier,
} from "../../../models/inventory";
import { DashboardLayout } from "../../../components/layout";
import { formatDate, formatCurrency } from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

export default function PurchaseOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
      const [ordersResponse, suppliersResponse] = await Promise.all([
        inventoryService.getPurchaseOrders(),
        inventoryService.getSuppliers(),
      ]);
      setPurchaseOrders(ordersResponse.purchaseOrders);
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

  const filteredPurchaseOrders = purchaseOrders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || !statusFilter || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this purchase order?")) {
      try {
        await inventoryService.deletePurchaseOrder(id);
        fetchData();
      } catch (error) {
        console.error("Error deleting purchase order:", error);
      }
    }
  };

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
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary", label: "Draft" },
      submitted: { variant: "default", label: "Submitted" },
      approved: { variant: "default", label: "Approved" },
      ordered: { variant: "default", label: "Ordered" },
      received: { variant: "default", label: "Received" },
      cancelled: { variant: "destructive", label: "Cancelled" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
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
              Purchase Orders
            </h1>
            <p className="text-muted-foreground">
              Manage purchase orders and supplier procurement
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create PO
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by PO number or supplier name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredPurchaseOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div className="font-medium">{order.orderNumber}</div>
                        {order.notes && (
                          <div className="text-sm text-muted-foreground truncate max-w-32">
                            {order.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {order.supplierName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(order.expectedDeliveryDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCurrency(order.totalAmount)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(order.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/inventory/purchase-orders/${order.id}`,
                              )
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/inventory/purchase-orders/${order.id}/edit`,
                              )
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  No purchase orders found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search terms or filters"
                    : "Get started by creating your first purchase order"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Purchase Order
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total POs</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                All purchase orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approval
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  purchaseOrders.filter((po) => po.status === "submitted")
                    .length
                }
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                All purchase orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  purchaseOrders.filter((po) => {
                    const created = new Date(po.createdAt);
                    const now = new Date();
                    return (
                      created.getMonth() === now.getMonth() &&
                      created.getFullYear() === now.getFullYear()
                    );
                  }).length
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Created this month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Create Purchase Order Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
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
                            <Trash2 className="h-4 w-4" />
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
                  setIsAddModalOpen(false);
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
