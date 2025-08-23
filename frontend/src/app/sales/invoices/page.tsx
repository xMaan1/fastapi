"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Textarea } from "../../../components/ui/textarea";
import {
  Plus,
  Search,
  Filter,
  Download,
  Mail,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  BarChart3,
} from "lucide-react";
import { DashboardLayout } from "../../../components/layout";
import InvoiceService from "../../../services/InvoiceService";
import {
  Invoice,
  InvoiceCreate,
  InvoiceStatus,
  InvoiceFilters,
  InvoiceDashboard,
  InvoiceItemCreate,
} from "../../../models/sales";
import { InvoiceDialog } from "../../../components/sales/InvoiceDialog";
import { InvoiceList } from "../../../components/sales/InvoiceList";
import { InvoiceDashboard as InvoiceDashboardComponent } from "../../../components/sales/InvoiceDashboard";

export default function InvoicesPage() {
  const [dashboard, setDashboard] = useState<InvoiceDashboard | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === "dashboard") {
        const dashboardData = await InvoiceService.getDashboard();
        setDashboard(dashboardData);
      } else {
        const response = await InvoiceService.getInvoices(
          { ...filters, search: searchTerm, status: statusFilter !== "all" ? statusFilter : undefined },
          currentPage,
          10
        );
        setInvoices(response.invoices);
        setTotalPages(response.pagination.pages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, searchTerm, statusFilter, currentPage]);

  const handleCreateInvoice = async (invoiceData: InvoiceCreate) => {
    try {
      await InvoiceService.createInvoice(invoiceData);
      setShowCreateDialog(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  const handleUpdateInvoice = async (invoiceId: string, invoiceData: Partial<InvoiceCreate>) => {
    try {
      await InvoiceService.updateInvoice(invoiceId, invoiceData);
      setShowEditDialog(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invoice");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await InvoiceService.deleteInvoice(invoiceId);
      setShowDeleteDialog(false);
      setSelectedInvoice(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invoice");
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await InvoiceService.sendInvoice(invoiceId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invoice");
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      await InvoiceService.markInvoiceAsPaid(invoiceId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark invoice as paid");
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowEditDialog(true);
  };

  const handleDelete = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteDialog(true);
  };

  const handleFilterChange = (newFilters: Partial<InvoiceFilters>) => {
    setFilters({ ...filters, ...newFilters });
    setCurrentPage(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadData();
  };

  if (loading && activeTab === "dashboard") {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading Invoice Dashboard...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error && activeTab === "dashboard") {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <Button onClick={loadData}>Retry</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600">
              Manage your invoices, track payments, and monitor revenue
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setShowCreateDialog(true)} className="modern-button">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="invoices">All Invoices</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {dashboard && <InvoiceDashboardComponent dashboard={dashboard} />}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search invoices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="viewed">Viewed</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateFrom">From Date</Label>
                    <Input
                      id="dateFrom"
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateTo">To Date</Label>
                    <Input
                      id="dateTo"
                      type="date"
                      value={filters.dateTo || ""}
                      onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSearch}>Apply Filters</Button>
                </div>
              </CardContent>
            </Card>

            {/* Invoices List */}
            <InvoiceList
              invoices={invoices}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSend={handleSendInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </TabsContent>

          {/* Overdue Tab */}
          <TabsContent value="overdue" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Overdue Invoices
                </CardTitle>
                <CardDescription>
                  Invoices that are past their due date and require immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.overdueInvoices && dashboard.overdueInvoices.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.overdueInvoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {invoice.invoiceNumber} - {invoice.customerName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Due: {InvoiceService.formatDate(invoice.dueDate)} • 
                            Amount: {InvoiceService.formatCurrency(invoice.total)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleMarkAsPaid(invoice.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(invoice)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No overdue invoices! All invoices are up to date.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Invoice Dialog */}
        <InvoiceDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={handleCreateInvoice}
          mode="create"
        />

        {/* Edit Invoice Dialog */}
        <InvoiceDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(data) => selectedInvoice && handleUpdateInvoice(selectedInvoice.id, data)}
          mode="edit"
          invoice={selectedInvoice}
        />

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Invoice</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Are you sure you want to delete invoice{" "}
                <strong>{selectedInvoice?.invoiceNumber}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedInvoice && handleDeleteInvoice(selectedInvoice.id)}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
