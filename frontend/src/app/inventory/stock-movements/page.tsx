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
  Package,
  MapPin,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { inventoryService } from "../../../services/InventoryService";
import {
  StockMovement,
  StockMovementCreate,
  StockMovementType,
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

export default function StockMovementsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMovement, setNewMovement] = useState<StockMovementCreate>({
    productId: "",
    warehouseId: "",
    locationId: "",
    movementType: StockMovementType.INBOUND,
    quantity: 0,
    unitCost: 0,
    referenceNumber: "",
    referenceType: "",
    notes: "",
    batchNumber: "",
    serialNumber: "",
    expiryDate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [stockMovementsResponse, warehousesResponse] = await Promise.all([
        inventoryService.getStockMovements(),
        inventoryService.getWarehouses(),
      ]);
      setStockMovements(stockMovementsResponse.stockMovements);
      setWarehouses(warehousesResponse.warehouses);

      // Set default warehouse if available
      if (
        warehousesResponse.warehouses.length > 0 &&
        !newMovement.warehouseId
      ) {
        setNewMovement((prev) => ({
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

  const filteredMovements = stockMovements.filter((movement) => {
    const matchesSearch =
      movement.referenceNumber
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      typeFilter === "all" ||
      !typeFilter ||
      movement.movementType === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to cancel this stock movement?")) {
      try {
        await inventoryService.updateStockMovement(id, {
          movementType: StockMovementType.ADJUSTMENT,
          notes: "Cancelled by user",
        });
        fetchData();
      } catch (error) {
        console.error("Error cancelling stock movement:", error);
      }
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm("Are you sure you want to cancel this stock movement?")) {
      try {
        await inventoryService.updateStockMovement(id, {
          movementType: StockMovementType.ADJUSTMENT,
          notes: "Cancelled by user",
        });
        fetchData();
      } catch (error) {
        console.error("Error cancelling stock movement:", error);
      }
    }
  };

  const handleAddMovement = async () => {
    if (
      !newMovement.productId ||
      !newMovement.warehouseId ||
      newMovement.quantity <= 0
    ) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await inventoryService.createStockMovement(newMovement);
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error("Error creating stock movement:", error);
      alert("Failed to create stock movement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewMovement({
      productId: "",
      warehouseId: warehouses.length > 0 ? warehouses[0].id : "",
      locationId: "",
      movementType: StockMovementType.INBOUND,
      quantity: 0,
      unitCost: 0,
      referenceNumber: "",
      referenceType: "",
      notes: "",
      batchNumber: "",
      serialNumber: "",
      expiryDate: "",
    });
  };

  const getTypeBadge = (type: StockMovementType) => {
    const typeConfig = {
      [StockMovementType.INBOUND]: { variant: "default", label: "Inbound" },
      [StockMovementType.OUTBOUND]: {
        variant: "destructive",
        label: "Outbound",
      },
      [StockMovementType.TRANSFER]: { variant: "secondary", label: "Transfer" },
      [StockMovementType.ADJUSTMENT]: {
        variant: "outline",
        label: "Adjustment",
      },
      [StockMovementType.RETURN]: { variant: "default", label: "Return" },
      [StockMovementType.DAMAGE]: { variant: "destructive", label: "Damage" },
      [StockMovementType.EXPIRY]: { variant: "destructive", label: "Expiry" },
      [StockMovementType.CYCLE_COUNT]: {
        variant: "secondary",
        label: "Cycle Count",
      },
    };

    const config = typeConfig[type] || typeConfig[StockMovementType.INBOUND];
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
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
            <h1 className="text-3xl font-bold tracking-tight">
              Stock Movements
            </h1>
            <p className="text-muted-foreground">
              Track and manage inventory movements across warehouses
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Record Movement
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
                  placeholder="Search by reference number or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value={StockMovementType.INBOUND}>
                    Inbound
                  </SelectItem>
                  <SelectItem value={StockMovementType.OUTBOUND}>
                    Outbound
                  </SelectItem>
                  <SelectItem value={StockMovementType.TRANSFER}>
                    Transfer
                  </SelectItem>
                  <SelectItem value={StockMovementType.ADJUSTMENT}>
                    Adjustment
                  </SelectItem>
                  <SelectItem value={StockMovementType.RETURN}>
                    Return
                  </SelectItem>
                  <SelectItem value={StockMovementType.DAMAGE}>
                    Damage
                  </SelectItem>
                  <SelectItem value={StockMovementType.EXPIRY}>
                    Expiry
                  </SelectItem>
                  <SelectItem value={StockMovementType.CYCLE_COUNT}>
                    Cycle Count
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stock Movements Table */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Movements List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredMovements.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Product ID</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {getTypeBadge(movement.movementType)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.productId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>Warehouse ID: {movement.warehouseId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{movement.locationId || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.quantity}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          ${movement.unitCost}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-32 truncate">
                          {movement.referenceNumber || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(movement.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(movement.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/inventory/stock-movements/${movement.id}`,
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
                                `/inventory/stock-movements/${movement.id}/edit`,
                              )
                            }
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCancel(movement.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(movement.id)}
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
                  No stock movements found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your search terms or filters"
                    : "Get started by recording your first stock movement"}
                </p>
                {!searchTerm && typeFilter === "all" && (
                  <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Movement
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
                Total Movements
              </CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockMovements.length}</div>
              <p className="text-xs text-muted-foreground">All movements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inbound</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  stockMovements.filter(
                    (m) => m.movementType === StockMovementType.INBOUND,
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">Stock received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outbound</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  stockMovements.filter(
                    (m) => m.movementType === StockMovementType.OUTBOUND,
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">Stock shipped</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transfers</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  stockMovements.filter(
                    (m) => m.movementType === StockMovementType.TRANSFER,
                  ).length
                }
              </div>
              <p className="text-xs text-muted-foreground">Internal moves</p>
            </CardContent>
          </Card>
        </div>

        {/* Add Stock Movement Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record Stock Movement</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movementType">Movement Type *</Label>
                  <Select
                    value={newMovement.movementType}
                    onValueChange={(value) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        movementType: value as StockMovementType,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select movement type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={StockMovementType.INBOUND}>
                        Inbound
                      </SelectItem>
                      <SelectItem value={StockMovementType.OUTBOUND}>
                        Outbound
                      </SelectItem>
                      <SelectItem value={StockMovementType.TRANSFER}>
                        Transfer
                      </SelectItem>
                      <SelectItem value={StockMovementType.ADJUSTMENT}>
                        Adjustment
                      </SelectItem>
                      <SelectItem value={StockMovementType.RETURN}>
                        Return
                      </SelectItem>
                      <SelectItem value={StockMovementType.DAMAGE}>
                        Damage
                      </SelectItem>
                      <SelectItem value={StockMovementType.EXPIRY}>
                        Expiry
                      </SelectItem>
                      <SelectItem value={StockMovementType.CYCLE_COUNT}>
                        Cycle Count
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouseId">Warehouse *</Label>
                  <Select
                    value={newMovement.warehouseId}
                    onValueChange={(value) =>
                      setNewMovement((prev) => ({
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product ID *</Label>
                  <Input
                    id="productId"
                    value={newMovement.productId}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        productId: e.target.value,
                      }))
                    }
                    placeholder="Enter product ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationId">Location ID</Label>
                  <Input
                    id="locationId"
                    value={newMovement.locationId}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        locationId: e.target.value,
                      }))
                    }
                    placeholder="Enter location ID (optional)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={newMovement.quantity}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        quantity: parseInt(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={newMovement.unitCost}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        unitCost: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Enter unit cost"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={newMovement.referenceNumber}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        referenceNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter reference number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceType">Reference Type</Label>
                  <Input
                    id="referenceType"
                    value={newMovement.referenceType}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        referenceType: e.target.value,
                      }))
                    }
                    placeholder="Enter reference type"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input
                    id="batchNumber"
                    value={newMovement.batchNumber}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        batchNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter batch number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  <Input
                    id="serialNumber"
                    value={newMovement.serialNumber}
                    onChange={(e) =>
                      setNewMovement((prev) => ({
                        ...prev,
                        serialNumber: e.target.value,
                      }))
                    }
                    placeholder="Enter serial number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={newMovement.expiryDate}
                  onChange={(e) =>
                    setNewMovement((prev) => ({
                      ...prev,
                      expiryDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newMovement.notes}
                  onChange={(e) =>
                    setNewMovement((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  placeholder="Enter movement notes"
                  rows={3}
                />
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
                onClick={handleAddMovement}
                disabled={
                  isSubmitting ||
                  !newMovement.productId ||
                  !newMovement.warehouseId ||
                  newMovement.quantity <= 0
                }
              >
                {isSubmitting ? "Recording..." : "Record Movement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
