"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import {
  TrendingUp,
  DollarSign,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
} from "lucide-react";
import { InvoiceDashboard as InvoiceDashboardType } from "../../models/sales";
import InvoiceService from "../../services/InvoiceService";

interface InvoiceDashboardProps {
  dashboard: InvoiceDashboardType;
}

export function InvoiceDashboard({ dashboard }: InvoiceDashboardProps) {
  const {
    metrics,
    recentInvoices,
    overdueInvoices,
    topCustomers,
    monthlyRevenue,
  } = dashboard;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.totalInvoices}
                </p>
                <p className="text-sm text-gray-600">Total Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.paidInvoices}
                </p>
                <p className="text-sm text-gray-600">Paid Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.overdueInvoices}
                </p>
                <p className="text-sm text-gray-600">Overdue Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.draftInvoices}
                </p>
                <p className="text-sm text-gray-600">Draft Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {InvoiceService.formatCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              From {metrics.paidInvoices} paid invoices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Outstanding Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {InvoiceService.formatCurrency(metrics.outstandingAmount)}
            </p>
            <p className="text-sm text-gray-600 mt-2">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Overdue Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {InvoiceService.formatCurrency(metrics.overdueAmount)}
            </p>
            <p className="text-sm text-gray-600 mt-2">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Invoices
            </CardTitle>
            <CardDescription>
              Latest invoices created in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {invoice.invoiceNumber}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {invoice.customerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {InvoiceService.formatCurrency(
                        invoice.total,
                        invoice.currency,
                      )}
                    </p>
                    <Badge
                      className={InvoiceService.getStatusColor(invoice.status)}
                    >
                      {InvoiceService.getStatusLabel(invoice.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Customers
            </CardTitle>
            <CardDescription>
              Customers with highest invoice values
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCustomers.map((customer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {customer.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {customer.count} invoices
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {InvoiceService.formatCurrency(customer.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Revenue Trend
          </CardTitle>
          <CardDescription>
            Revenue performance over the last 6 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between gap-2">
            {monthlyRevenue.map((month, index) => (
              <div
                key={month.month}
                className="flex-1 flex flex-col items-center"
              >
                <div
                  className="w-full bg-blue-100 rounded-t-sm"
                  style={{
                    height: `${Math.max((month.revenue / Math.max(...monthlyRevenue.map((m) => m.revenue))) * 200, 20)}px`,
                  }}
                ></div>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  {month.month}
                </p>
                <p className="text-xs font-medium text-gray-900 mt-1">
                  {InvoiceService.formatCurrency(month.revenue)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Overdue Invoices Require Attention
            </CardTitle>
            <CardDescription>
              {overdueInvoices.length} invoice(s) are past their due date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueInvoices.slice(0, 3).map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200"
                >
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {invoice.invoiceNumber} - {invoice.customerName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Due: {InvoiceService.formatDate(invoice.dueDate)} •
                      {InvoiceService.getDaysOverdue(invoice.dueDate)} days
                      overdue
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      {InvoiceService.formatCurrency(
                        invoice.total,
                        invoice.currency,
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {overdueInvoices.length > 3 && (
                <p className="text-sm text-gray-600 text-center">
                  And {overdueInvoices.length - 3} more overdue invoices...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
