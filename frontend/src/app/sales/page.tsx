"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import {
  Plus,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Building,
  FileText,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useApiService } from "../../hooks/useApiService";
import { DashboardLayout } from "../../components/layout";
import {
  Lead,
  Opportunity,
  SalesDashboard,
  LeadStatus,
  OpportunityStage,
  LeadSource,
} from "../../models/sales";
import { useCustomOptions } from "../../hooks/useCustomOptions";
import { CustomOptionDialog } from "../../components/common/CustomOptionDialog";

export default function SalesPage() {
  const apiService = useApiService();
  const [dashboard, setDashboard] = useState<SalesDashboard | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateLeadDialog, setShowCreateLeadDialog] = useState(false);
  const [showCreateOpportunityDialog, setShowCreateOpportunityDialog] =
    useState(false);
  const [showCustomLeadSourceDialog, setShowCustomLeadSourceDialog] =
    useState(false);

  // Custom options hook
  const {
    customLeadSources,
    createCustomLeadSource,
    loading: customOptionsLoading,
  } = useCustomOptions();
  const [leadFormData, setLeadFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    leadSource: LeadSource.WEBSITE,
    status: LeadStatus.NEW,
    notes: "",
    estimatedValue: "",
    expectedCloseDate: "",
  });
  const [opportunityFormData, setOpportunityFormData] = useState({
    title: "",
    description: "",
    amount: "",
    stage: OpportunityStage.PROSPECTING,
    probability: "",
    expectedCloseDate: "",
    notes: "",
  });

  const loadSalesData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, leadsData, opportunitiesData] = await Promise.all([
        apiService.getSalesDashboard(),
        apiService.getLeads({ limit: 10 }),
        apiService.getOpportunities({ limit: 10 }),
      ]);

      setDashboard(dashboardData);
      setLeads(leadsData.leads || []);
      setOpportunities(opportunitiesData.opportunities || []);
    } catch (error) {
      console.error("Error loading sales data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  const handleCreateCustomLeadSource = async (
    name: string,
    description: string,
  ) => {
    try {
      await createCustomLeadSource(name, description);
    } catch (error) {
      console.error("Failed to create custom lead source:", error);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createLead({
        ...leadFormData,
        estimatedValue: leadFormData.estimatedValue
          ? parseFloat(leadFormData.estimatedValue)
          : undefined,
        expectedCloseDate: leadFormData.expectedCloseDate || undefined,
        tags: [],
      });
      setShowCreateLeadDialog(false);
      setLeadFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
        leadSource: LeadSource.WEBSITE,
        status: LeadStatus.NEW,
        notes: "",
        estimatedValue: "",
        expectedCloseDate: "",
      });
      loadSalesData();
    } catch (error) {
      console.error("Error creating lead:", error);
    }
  };

  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createOpportunity({
        ...opportunityFormData,
        name: opportunityFormData.title,
        amount: parseFloat(opportunityFormData.amount) || 0,
        probability: parseFloat(opportunityFormData.probability) || 0,
        expectedCloseDate:
          opportunityFormData.expectedCloseDate || new Date().toISOString(),
        leadSource: LeadSource.WEBSITE,
        tags: [],
      });
      setShowCreateOpportunityDialog(false);
      setOpportunityFormData({
        title: "",
        description: "",
        amount: "",
        stage: OpportunityStage.PROSPECTING,
        probability: "",
        expectedCloseDate: "",
        notes: "",
      });
      loadSalesData();
    } catch (error) {
      console.error("Error creating opportunity:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-100 text-blue-800",
      contacted: "bg-yellow-100 text-yellow-800",
      qualified: "bg-green-100 text-green-800",
      proposal: "bg-purple-100 text-purple-800",
      negotiation: "bg-orange-100 text-orange-800",
      won: "bg-green-100 text-green-800",
      lost: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      prospecting: "bg-blue-100 text-blue-800",
      qualification: "bg-yellow-100 text-yellow-800",
      proposal: "bg-purple-100 text-purple-800",
      negotiation: "bg-orange-100 text-orange-800",
      closed_won: "bg-green-100 text-green-800",
      closed_lost: "bg-red-100 text-red-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Sales Dashboard
            </h1>
            <p className="text-gray-600">
              Manage your sales pipeline and track performance
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={() => setShowCreateLeadDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCreateOpportunityDialog(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Opportunity
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        {dashboard && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Leads
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard.metrics.totalLeads}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.metrics.activeLeads} active leads
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Opportunities
                </CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard.metrics.totalOpportunities}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.metrics.openOpportunities} open opportunities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboard.metrics.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.metrics.conversionRate}% conversion rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Projected Revenue
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboard.metrics.projectedRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg deal: {formatCurrency(dashboard.metrics.averageDealSize)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pipeline and Content Tabs */}
        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pipeline">Sales Pipeline</TabsTrigger>
            <TabsTrigger value="leads">Recent Leads</TabsTrigger>
            <TabsTrigger value="opportunities">
              Active Opportunities
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="space-y-4">
            {dashboard && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboard.pipeline.map((stage: any) => (
                  <Card key={stage.stage}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium capitalize">
                        {stage.stage.replace("_", " ")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stage.count}</div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(stage.value)} • {stage.probability}%
                        probability
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Leads</CardTitle>
                <CardDescription>
                  Latest leads added to your pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {leads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No leads found. Create your first lead to get started.
                    </div>
                  ) : (
                    leads.map((lead) => (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {lead.firstName} {lead.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lead.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {lead.company}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                          <Badge variant="outline">{lead.leadSource}</Badge>
                          {lead.estimatedValue && (
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(lead.estimatedValue)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="opportunities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Opportunities</CardTitle>
                <CardDescription>
                  Opportunities currently in your pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {opportunities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No opportunities found. Create your first opportunity to
                      get started.
                    </div>
                  ) : (
                    opportunities.map((opportunity) => (
                      <div
                        key={opportunity.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Target className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {opportunity.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {opportunity.description}
                            </div>
                            <div className="text-sm text-gray-500">
                              Expected close:{" "}
                              {new Date(
                                opportunity.expectedCloseDate,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStageColor(opportunity.stage)}>
                            {opportunity.stage.replace("_", " ")}
                          </Badge>
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(opportunity.amount)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {opportunity.probability}%
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common sales tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col">
                <Phone className="w-6 h-6 mb-2" />
                <span className="text-sm">Log Call</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Mail className="w-6 h-6 mb-2" />
                <span className="text-sm">Send Email</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Calendar className="w-6 h-6 mb-2" />
                <span className="text-sm">Schedule Meeting</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <FileText className="w-6 h-6 mb-2" />
                <span className="text-sm">Create Quote</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Lead Dialog */}
      <Dialog
        open={showCreateLeadDialog}
        onOpenChange={setShowCreateLeadDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={leadFormData.firstName}
                  onChange={(e) =>
                    setLeadFormData({
                      ...leadFormData,
                      firstName: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={leadFormData.lastName}
                  onChange={(e) =>
                    setLeadFormData({
                      ...leadFormData,
                      lastName: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={leadFormData.email}
                  onChange={(e) =>
                    setLeadFormData({ ...leadFormData, email: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={leadFormData.phone}
                  onChange={(e) =>
                    setLeadFormData({ ...leadFormData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={leadFormData.company}
                  onChange={(e) =>
                    setLeadFormData({
                      ...leadFormData,
                      company: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={leadFormData.jobTitle}
                  onChange={(e) =>
                    setLeadFormData({
                      ...leadFormData,
                      jobTitle: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="leadSource">Lead Source</Label>
                <Select
                  value={leadFormData.leadSource}
                  onValueChange={(value) => {
                    if (value === "create_new") {
                      setShowCustomLeadSourceDialog(true);
                    } else {
                      setLeadFormData({
                        ...leadFormData,
                        leadSource: value as LeadSource,
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeadSource).map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.replace("_", " ")}
                      </SelectItem>
                    ))}

                    {/* Custom Lead Sources */}
                    {customLeadSources &&
                      customLeadSources.length > 0 &&
                      customLeadSources.map((customSource) => (
                        <SelectItem
                          key={customSource.id}
                          value={customSource.id}
                        >
                          {customSource.name}
                        </SelectItem>
                      ))}

                    <SelectItem
                      value="create_new"
                      className="font-semibold text-blue-600"
                    >
                      + Create New Lead Source
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={leadFormData.status}
                  onValueChange={(value) =>
                    setLeadFormData({
                      ...leadFormData,
                      status: value as LeadStatus,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeadStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimatedValue">Estimated Value</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  value={leadFormData.estimatedValue}
                  onChange={(e) =>
                    setLeadFormData({
                      ...leadFormData,
                      estimatedValue: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={leadFormData.expectedCloseDate}
                  onChange={(e) =>
                    setLeadFormData({
                      ...leadFormData,
                      expectedCloseDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={leadFormData.notes}
                onChange={(e) =>
                  setLeadFormData({ ...leadFormData, notes: e.target.value })
                }
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateLeadDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Lead</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Opportunity Dialog */}
      <Dialog
        open={showCreateOpportunityDialog}
        onOpenChange={setShowCreateOpportunityDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Opportunity</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateOpportunity} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="oppTitle">Title *</Label>
                <Input
                  id="oppTitle"
                  value={opportunityFormData.title}
                  onChange={(e) =>
                    setOpportunityFormData({
                      ...opportunityFormData,
                      title: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="oppAmount">Amount</Label>
                <Input
                  id="oppAmount"
                  type="number"
                  value={opportunityFormData.amount}
                  onChange={(e) =>
                    setOpportunityFormData({
                      ...opportunityFormData,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="oppDescription">Description</Label>
              <Textarea
                id="oppDescription"
                value={opportunityFormData.description}
                onChange={(e) =>
                  setOpportunityFormData({
                    ...opportunityFormData,
                    description: e.target.value,
                  })
                }
                rows={3}
                placeholder="Opportunity description..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="oppStage">Stage *</Label>
                <Select
                  value={opportunityFormData.stage}
                  onValueChange={(value) =>
                    setOpportunityFormData({
                      ...opportunityFormData,
                      stage: value as OpportunityStage,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(OpportunityStage).map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="oppProbability">Probability (%)</Label>
                <Input
                  id="oppProbability"
                  type="number"
                  min="0"
                  max="100"
                  value={opportunityFormData.probability}
                  onChange={(e) =>
                    setOpportunityFormData({
                      ...opportunityFormData,
                      probability: e.target.value,
                    })
                  }
                  placeholder="50"
                />
              </div>

              <div>
                <Label htmlFor="oppCloseDate">Expected Close Date</Label>
                <Input
                  id="oppCloseDate"
                  type="date"
                  value={opportunityFormData.expectedCloseDate}
                  onChange={(e) =>
                    setOpportunityFormData({
                      ...opportunityFormData,
                      expectedCloseDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="oppNotes">Notes</Label>
              <Textarea
                id="oppNotes"
                value={opportunityFormData.notes}
                onChange={(e) =>
                  setOpportunityFormData({
                    ...opportunityFormData,
                    notes: e.target.value,
                  })
                }
                rows={3}
                placeholder="Additional notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateOpportunityDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Opportunity</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Custom Lead Source Dialog */}
      <CustomOptionDialog
        open={showCustomLeadSourceDialog}
        onOpenChange={setShowCustomLeadSourceDialog}
        title="Create New Lead Source"
        description="Create a custom lead source that will be available for your tenant."
        optionName="Lead Source"
        placeholder="e.g., LinkedIn Campaign, Webinar"
        onSubmit={handleCreateCustomLeadSource}
        loading={customOptionsLoading.leadSource}
      />
    </DashboardLayout>
  );
}
