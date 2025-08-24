import { apiService } from './ApiService';
import {
  Invoice,
  InvoiceCreate,
  InvoiceUpdate,
  InvoiceFilters,
  Payment,
  PaymentCreate,
  PaymentUpdate,
  PaymentFilters,
  InvoiceDashboard
} from '../models/sales';

class InvoiceService {
  private baseUrl = '/invoices';

  // Invoice CRUD operations
  async createInvoice(invoiceData: InvoiceCreate): Promise<Invoice> {
    const response = await apiService.post(`${this.baseUrl}/`, invoiceData);
    return response.invoice;
  }

  async getInvoices(
    filters: InvoiceFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ invoices: Invoice[]; pagination: any }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    // Add filters, filtering out undefined values and converting to strings
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiService.get(`${this.baseUrl}/?${params}`);
    return response;
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const response = await apiService.get(`${this.baseUrl}/${invoiceId}`);
    return response.invoice;
  }

  async updateInvoice(invoiceId: string, invoiceData: InvoiceUpdate): Promise<Invoice> {
    const response = await apiService.put(`${this.baseUrl}/${invoiceId}`, invoiceData);
    return response.invoice;
  }

  async deleteInvoice(invoiceId: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${invoiceId}`);
  }

  // Invoice actions
  async sendInvoice(invoiceId: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${invoiceId}/send`);
  }

  async markInvoiceAsPaid(invoiceId: string): Promise<void> {
    await apiService.post(`${this.baseUrl}/${invoiceId}/mark-as-paid`);
  }

  // Dashboard
  async getDashboard(): Promise<InvoiceDashboard> {
    const response = await apiService.get(`${this.baseUrl}/dashboard/overview`);
    return response;
  }

  // Payment operations
  async createPayment(invoiceId: string, paymentData: PaymentCreate): Promise<Payment> {
    const response = await apiService.post(`${this.baseUrl}/${invoiceId}/payments`, paymentData);
    return response.payment;
  }

  async getInvoicePayments(
    invoiceId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{ payments: Payment[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    const response = await apiService.get(`${this.baseUrl}/${invoiceId}/payments?${params}`);
    return response;
  }

  async getAllPayments(
    filters: PaymentFilters = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ payments: Payment[]; pagination: any }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    // Add filters, filtering out undefined values and converting to strings
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
    
    const response = await apiService.get(`${this.baseUrl}/payments/?${params}`);
    return response;
  }

  // Helper methods
  calculateInvoiceTotals(items: any[], taxRate: number, discount: number) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = subtotal * (discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discountAmount * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  }

  getStatusColor(status: string): string {
    const statusColors: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      partially_paid: 'bg-orange-100 text-orange-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-red-100 text-red-800',
      void: 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      paid: 'Paid',
      partially_paid: 'Partially Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled',
      void: 'Void'
    };
    return statusLabels[status] || status;
  }

  getPaymentMethodLabel(method: string): string {
    const methodLabels: { [key: string]: string } = {
      credit_card: 'Credit Card',
      bank_transfer: 'Bank Transfer',
      cash: 'Cash',
      check: 'Check',
      paypal: 'PayPal',
      stripe: 'Stripe',
      other: 'Other'
    };
    return methodLabels[method] || method;
  }

  formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  isOverdue(dueDate: string): boolean {
    return new Date(dueDate) < new Date();
  }

  getDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }
}

export default new InvoiceService();
