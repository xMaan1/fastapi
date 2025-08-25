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
  Truck,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Building2,
  ClipboardList,
  Package,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { inventoryService } from "../../../services/InventoryService";
import {
  Receiving,
  ReceivingCreate,
  ReceivingItemCreate,
  PurchaseOrder,
  Warehouse,
} from "../../../models/inventory";
import { DashboardLayout } from "../../../components/layout";
import { formatDate } from "../../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Textarea } from "../../../components/ui/textarea";

export default function ReceivingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [receivings, setReceivings] = useState<Receiving[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newReceiving, setNewReceiving] = useState<ReceivingCreate>({
    receivingNumber: "",
    purchaseOrderId: "",
    warehouseId: "",
    receivedDate: "",
    notes: "",
    items: [],
  });
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [receivingsResponse, purchaseOrdersResponse, warehousesResponse] =
        await Promise.all([
          inventoryService.getReceivings(),
          inventoryService.getPurchaseOrders(),
          inventoryService.getWarehouses(),
        ]);
      setReceivings(receivingsResponse.receivings);
      setPurchaseOrders(purchaseOrdersResponse.purchaseOrders);
      setWarehouses(warehousesResponse.warehouses);

      // Set default warehouse if available
      if (
        warehousesResponse.warehouses.length > 0 &&
        !newReceiving.warehouseId
      ) {
        setNewReceiving((prev) => ({
          ...prev,
          warehouseId: warehousesResponse.warehouses[0].id,
        }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReceivings = receivings.filter((receiving) => {
    const matchesSearch =
      receiving.receivingNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      receiving.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      !statusFilter ||
      receiving.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this receiving?")) {
      try {
        await inventoryService.deleteReceiving(id);
        fetchData();
      } catch (error) {
        console.error("Error deleting receiving:", error);
      }
    }
  };

  const handlePurchaseOrderChange = (poId: string) => {
    const po = purchaseOrders.find((order) => order.id === poId);
    setSelectedPO(po || null);
    setNewReceiving((prev) => ({
      ...prev,
      purchaseOrderId: poId,
      items: po
        ? po.items.map(
            (item): ReceivingItemCreate => ({
              purchaseOrderId: poId,
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitCost: item.unitCost,
              totalCost: item.quantity * item.unitCost,
              receivedQuantity: item.quantity, // Default to ordered quantity
              notes: "",
            }),
          )
        : [],
    }));
  };

  const handleReceivedQuantityChange = (index: number, quantity: number) => {
    setNewReceiving((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, receivedQuantity: quantity } : item,
      ),
    }));
  };

  const handleProcessReceiving = async () => {
    if (
      !newReceiving.purchaseOrderId ||
      !newReceiving.warehouseId ||
      newReceiving.items.length === 0
    ) {
      alert("Please fill in all required fields and ensure items are selected");
      return;
    }

    // Validate that received quantities don't exceed ordered quantities
    const invalidItems = newReceiving.items.filter(
      (item) => item.receivedQuantity > item.quantity,
    );

    if (invalidItems.length > 0) {
      alert("Received quantities cannot exceed ordered quantities");
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.createReceiving(newReceiving);
      setIsProcessModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error processing receiving:", error);
      alert("Failed to process receiving. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewReceiving({
      receivingNumber: "",
      warehouseId: warehouses.length > 0 ? warehouses[0].id : "",
      receivedDate: new Date().toISOString().split("T")[0], // Today's date
      purchaseOrderId: "",
      notes: "",
      items: [],
    });
    setSelectedPO(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary", label: "Pending" },
      in_progress: { variant: "default", label: "In Progress" },
      completed: { variant: "default", label: "Completed" },
      cancelled: { variant: "destructive", label: "Cancelled" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
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
            <h1 className="text-3xl font-bold tracking-tight">Receiving</h1>
            <p className="text-muted-foreground">
              Manage incoming shipments and process received goods
            </p>
          </div>
          <Button onClick={() => setIsProcessModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Process Receiving
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
                  placeholder="Search by receiving number or notes..."
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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Receivings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Receiving List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReceivings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receiving #</TableHead>
                    <TableHead>Purchase Order</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Received Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivings.map((receiving) => (
                    <TableRow key={receiving.id}>
                      <TableCell>
                        <div className="font-medium">
                          {receiving.receivingNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            PO: {receiving.purchaseOrderId}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>Warehouse ID: {receiving.warehouseId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(receiving.receivedDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(receiving.status)}</TableCell>
                      <TableCell>
                        <div className="max-w-48 truncate">
                          {receiving.notes || "No notes"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(receiving.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/inventory/receiving/${receiving.id}`,
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
                                `/inventory/receiving/${receiving.id}/edit`,
                              )
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(receiving.id)}
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
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">
                  No receivings found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== "all"
                    ? "Try adjusting your search terms or filters"
                    : "Get started by processing your first receiving"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button onClick={() => setIsProcessModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Process Receiving
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
              <CardTitle className="text-sm font-medium">
                Total Receivings
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{receivings.length}</div>
              <p className="text-xs text-muted-foreground">All receivings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {receivings.filter((r) => r.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {receivings.filter((r) => r.status === "in_progress").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {receivings.filter((r) => r.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully received
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Process Receiving Modal */}
        <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Incoming Receiving</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseOrderId">Purchase Order *</Label>
                  <Select
                    value={newReceiving.purchaseOrderId}
                    onValueChange={handlePurchaseOrderChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purchase order" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders
                        .filter(
                          (po) =>
                            po.status === "ordered" || po.status === "approved",
                        )
                        .map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            {po.orderNumber} - {po.supplierName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouseId">Warehouse *</Label>
                  <Select
                    value={newReceiving.warehouseId}
                    onValueChange={(value) =>
                      setNewReceiving((prev) => ({
                        ...prev,
                        warehouseId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receivedDate">Received Date *</Label>
                <Input
                  id="receivedDate"
                  type="date"
                  value={newReceiving.receivedDate}
                  onChange={(e) =>
                    setNewReceiving((prev) => ({
                      ...prev,
                      receivedDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newReceiving.notes}
                  onChange={(e) =>
                    setNewReceiving((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Enter receiving notes"
                  rows={3}
                />
              </div>

              {/* Purchase Order Items */}
              {selectedPO && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lg font-medium">
                      Receiving Items from PO: {selectedPO.orderNumber}
                    </Label>
                    <div className="text-sm text-muted-foreground">
                      Supplier: {selectedPO.supplierName}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {newReceiving.items.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">
                              {item.productName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              SKU: {item.sku}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Unit Cost: ${item.unitCost}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm">Ordered Quantity</Label>
                            <div className="text-sm font-medium">
                              {item.quantity}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">
                              Received Quantity *
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={item.receivedQuantity}
                              onChange={(e) =>
                                handleReceivedQuantityChange(
                                  index,
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              placeholder="Qty received"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm">Total Value</Label>
                            <div className="text-sm font-medium">
                              $
                              {(item.receivedQuantity * item.unitCost).toFixed(
                                2,
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-right font-medium text-lg">
                    Total Received Value: $
                    {newReceiving.items
                      .reduce(
                        (sum, item) =>
                          sum + item.receivedQuantity * item.unitCost,
                        0,
                      )
                      .toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsProcessModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessReceiving}
                disabled={
                  isSubmitting ||
                  !newReceiving.purchaseOrderId ||
                  newReceiving.items.length === 0
                }
              >
                {isSubmitting ? "Processing..." : "Process Receiving"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
