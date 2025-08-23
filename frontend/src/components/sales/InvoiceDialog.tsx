"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Plus,
  Trash2,
  Calculator,
  User,
  Building,
  Calendar,
  DollarSign,
  FileText,
} from "lucide-react";
import {
  Invoice,
  InvoiceCreate,
  InvoiceItemCreate,
  InvoiceStatus,
} from "../../models/sales";
import InvoiceService from "../../services/InvoiceService";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InvoiceCreate) => void;
  mode: "create" | "edit";
  invoice?: Invoice | null;
}

export function InvoiceDialog({
  open,
  onOpenChange,
  onSubmit,
  mode,
  invoice,
}: InvoiceDialogProps) {
  const [formData, setFormData] = useState<InvoiceCreate>({
    customerId: "",
    customerName: "",
    customerEmail: "",
    billingAddress: "",
    shippingAddress: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    paymentTerms: "Net 30",
    currency: "USD",
    taxRate: 0,
    discount: 0,
    notes: "",
    terms: "",
    items: [],
    opportunityId: "",
    quoteId: "",
    projectId: "",
  });

  const [items, setItems] = useState<InvoiceItemCreate[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (invoice && mode === "edit") {
      setFormData({
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerEmail: invoice.customerEmail,
        billingAddress: invoice.billingAddress,
        shippingAddress: invoice.shippingAddress || "",
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paymentTerms: invoice.paymentTerms,
        currency: invoice.currency,
        taxRate: invoice.taxRate,
        discount: invoice.discount,
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        items: [],
        opportunityId: invoice.opportunityId || "",
        quoteId: invoice.quoteId || "",
        projectId: invoice.projectId || "",
      });
      setItems(invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        productId: item.productId,
        projectId: item.projectId,
        taskId: item.taskId,
      })));
    } else {
      // Reset form for create mode
      setFormData({
        customerId: "",
        customerName: "",
        customerEmail: "",
        billingAddress: "",
        shippingAddress: "",
        issueDate: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        paymentTerms: "Net 30",
        currency: "USD",
        taxRate: 0,
        discount: 0,
        notes: "",
        terms: "",
        items: [],
        opportunityId: "",
        quoteId: "",
        projectId: "",
      });
      setItems([]);
    }
    setErrors({});
  }, [invoice, mode, open]);

  const handleInputChange = (field: keyof InvoiceCreate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const addItem = () => {
    const newItem: InvoiceItemCreate = {
      description: "",
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const updateItem = (index: number, field: keyof InvoiceItemCreate, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = subtotal * (formData.discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (formData.taxRate / 100);
    const total = taxableAmount + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Customer name is required";
    }
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = "Customer email is required";
    }
    if (!formData.billingAddress.trim()) {
      newErrors.billingAddress = "Billing address is required";
    }
    if (!formData.issueDate) {
      newErrors.issueDate = "Issue date is required";
    }
    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }
    if (items.length === 0) {
      newErrors.items = "At least one item is required";
    }

    // Validate items
    items.forEach((item, index) => {
      if (!item.description.trim()) {
        newErrors[`item_${index}_description`] = "Item description is required";
      }
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = "Quantity must be greater than 0";
      }
      if (item.unitPrice < 0) {
        newErrors[`item_${index}_unitPrice`] = "Unit price cannot be negative";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const totals = calculateTotals();
      const submitData: InvoiceCreate = {
        ...formData,
        items: items,
      };
      
      await onSubmit(submitData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting invoice:", error);
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {mode === "create" ? "Create New Invoice" : "Edit Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) => handleInputChange("customerName", e.target.value)}
                  placeholder="Enter customer name"
                  className={errors.customerName ? "border-red-500" : ""}
                />
                {errors.customerName && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customerEmail">Customer Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => handleInputChange("customerEmail", e.target.value)}
                  placeholder="Enter customer email"
                  className={errors.customerEmail ? "border-red-500" : ""}
                />
                {errors.customerEmail && (
                  <p className="text-red-500 text-sm mt-1">{errors.customerEmail}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="billingAddress">Billing Address *</Label>
                <Textarea
                  id="billingAddress"
                  value={formData.billingAddress}
                  onChange={(e) => handleInputChange("billingAddress", e.target.value)}
                  placeholder="Enter billing address"
                  className={errors.billingAddress ? "border-red-500" : ""}
                />
                {errors.billingAddress && (
                  <p className="text-red-500 text-sm mt-1">{errors.billingAddress}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="shippingAddress">Shipping Address (Optional)</Label>
                <Textarea
                  id="shippingAddress"
                  value={formData.shippingAddress}
                  onChange={(e) => handleInputChange("shippingAddress", e.target.value)}
                  placeholder="Enter shipping address (leave blank if same as billing)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => handleInputChange("issueDate", e.target.value)}
                  className={errors.issueDate ? "border-red-500" : ""}
                />
                {errors.issueDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.issueDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange("dueDate", e.target.value)}
                  className={errors.dueDate ? "border-red-500" : ""}
                />
                {errors.dueDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>
                )}
              </div>

              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(value) => handleInputChange("paymentTerms", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Net 15">Net 15</SelectItem>
                    <SelectItem value="Net 30">Net 30</SelectItem>
                    <SelectItem value="Net 45">Net 45</SelectItem>
                    <SelectItem value="Net 60">Net 60</SelectItem>
                    <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(value) => handleInputChange("currency", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.taxRate}
                  onChange={(e) => handleInputChange("taxRate", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discount}
                  onChange={(e) => handleInputChange("discount", parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoice Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Invoice Items
              </CardTitle>
              {errors.items && (
                <p className="text-red-500 text-sm">{errors.items}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-lg">
                  <div className="col-span-4">
                    <Label htmlFor={`item_${index}_description`}>Description *</Label>
                    <Input
                      id={`item_${index}_description`}
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      className={errors[`item_${index}_description`] ? "border-red-500" : ""}
                    />
                    {errors[`item_${index}_description`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_description`]}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`item_${index}_quantity`}>Qty *</Label>
                    <Input
                      id={`item_${index}_quantity`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      className={errors[`item_${index}_quantity`] ? "border-red-500" : ""}
                    />
                    {errors[`item_${index}_quantity`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_quantity`]}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`item_${index}_unitPrice`}>Unit Price *</Label>
                    <Input
                      id={`item_${index}_unitPrice`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className={errors[`item_${index}_unitPrice`] ? "border-red-500" : ""}
                    />
                    {errors[`item_${index}_unitPrice`] && (
                      <p className="text-red-500 text-sm mt-1">{errors[`item_${index}_unitPrice`]}</p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <Label htmlFor={`item_${index}_discount`}>Discount (%)</Label>
                    <Input
                      id={`item_${index}_discount`}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="col-span-1">
                    <Label>Total</Label>
                    <div className="text-sm font-medium p-2 bg-gray-50 rounded">
                      {InvoiceService.formatCurrency(item.quantity * item.unitPrice * (1 - item.discount / 100))}
                    </div>
                  </div>

                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{InvoiceService.formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Discount ({formData.discount}%):</span>
                    <span>-{InvoiceService.formatCurrency(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({formData.taxRate}%):</span>
                    <span>{InvoiceService.formatCurrency(totals.taxAmount)}</span>
                  </div>
                  <div className="border-t pt-2 font-bold text-lg">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span>{InvoiceService.formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes and Terms */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Add any additional notes for the customer"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="terms">Terms & Conditions (Optional)</Label>
                <Textarea
                  id="terms"
                  value={formData.terms}
                  onChange={(e) => handleInputChange("terms", e.target.value)}
                  placeholder="Add terms and conditions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="modern-button"
            >
              {loading ? "Saving..." : mode === "create" ? "Create Invoice" : "Update Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
