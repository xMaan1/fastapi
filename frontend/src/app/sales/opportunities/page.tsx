"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Textarea } from "../../../components/ui/textarea";
import { useApiService } from "../../../hooks/useApiService";
import { DashboardLayout } from "../../../components/layout";
import {
  Opportunity,
  OpportunityStage,
  OpportunityPriority,
} from "../../../models/sales";
import { Contact } from "../../../models/sales";
import { Company } from "../../../models/sales";
import {
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  User,
  Building,
} from "lucide-react";

export default function OpportunitiesPage() {
  const apiService = useApiService();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOpportunity, setEditingOpportunity] =
    useState<Opportunity | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    stage: OpportunityStage.PROSPECTING,
    priority: OpportunityPriority.MEDIUM,
    closeDate: "",
    probability: "",
    contactId: "",
    companyId: "",
    notes: "",
  });

  useEffect(() => {
    loadOpportunities();
    loadContacts();
    loadCompanies();
  }, []);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const response = await apiService.getOpportunities();
      setOpportunities(response.opportunities || []);
    } catch (error) {
      console.error("Error loading opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await apiService.getContacts();
      setContacts(response.contacts || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const loadCompanies = async () => {
    try {
      const response = await apiService.getCompanies();
      setCompanies(response.companies || []);
    } catch (error) {
      console.error("Error loading companies:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!formData.title.trim()) {
      alert("Title is required");
      return;
    }

    if (!formData.closeDate) {
      alert("Close date is required");
      return;
    }

    if (
      !formData.probability ||
      parseFloat(formData.probability) < 0 ||
      parseFloat(formData.probability) > 100
    ) {
      alert("Probability must be between 0 and 100");
      return;
    }

    try {
      if (editingOpportunity) {
        await apiService.updateOpportunity(editingOpportunity.id, {
          ...formData,
          name: formData.title,
          amount: parseFloat(formData.amount) || 0,
          probability: parseFloat(formData.probability) || 0,
          expectedCloseDate: formData.closeDate,
          closeDate: formData.closeDate
            ? new Date(formData.closeDate).toISOString()
            : null,
        });
      } else {
        await apiService.createOpportunity({
          ...formData,
          name: formData.title,
          amount: parseFloat(formData.amount) || 0,
          probability: parseFloat(formData.probability) || 0,
          expectedCloseDate: formData.closeDate,
          closeDate: formData.closeDate
            ? new Date(formData.closeDate).toISOString()
            : null,
          leadSource: "website",
          tags: [],
        });
      }

      setShowCreateDialog(false);
      setEditingOpportunity(null);
      resetForm();
      loadOpportunities();
    } catch (error) {
      console.error("Error saving opportunity:", error);
      alert("Error saving opportunity. Please try again.");
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.name || opportunity.title || "",
      description: opportunity.description || "",
      amount: opportunity.amount?.toString() || "",
      stage: opportunity.stage,
      priority: opportunity.priority,
      closeDate: opportunity.expectedCloseDate
        ? new Date(opportunity.expectedCloseDate).toISOString().split("T")[0]
        : "",
      probability: opportunity.probability?.toString() || "",
      contactId: opportunity.contactId || "",
      companyId: opportunity.companyId || "",
      notes: opportunity.notes || "",
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this opportunity?")) {
      try {
        await apiService.deleteOpportunity(id);
        loadOpportunities();
      } catch (error) {
        console.error("Error deleting opportunity:", error);
        alert("Error deleting opportunity. Please try again.");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      amount: "",
      stage: OpportunityStage.PROSPECTING,
      priority: OpportunityPriority.MEDIUM,
      closeDate: "",
      probability: "",
      contactId: "",
      companyId: "",
      notes: "",
    });
  };

  const getStageColor = (stage: OpportunityStage) => {
    const colors: Record<OpportunityStage, string> = {
      [OpportunityStage.PROSPECTING]: "bg-blue-100 text-blue-800",
      [OpportunityStage.QUALIFICATION]: "bg-cyan-100 text-cyan-800",
      [OpportunityStage.QUALIFIED]: "bg-yellow-100 text-yellow-800",
      [OpportunityStage.PROPOSAL]: "bg-purple-100 text-purple-800",
      [OpportunityStage.NEGOTIATION]: "bg-orange-100 text-orange-800",
      [OpportunityStage.CLOSED_WON]: "bg-green-100 text-green-800",
      [OpportunityStage.CLOSED_LOST]: "bg-red-100 text-red-800",
    };
    return colors[stage] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: OpportunityPriority) => {
    const colors: Record<OpportunityPriority, string> = {
      [OpportunityPriority.LOW]: "bg-gray-100 text-gray-800",
      [OpportunityPriority.MEDIUM]: "bg-yellow-100 text-yellow-800",
      [OpportunityPriority.HIGH]: "bg-red-100 text-red-800",
      [OpportunityPriority.CRITICAL]: "bg-red-200 text-red-900",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const filteredOpportunities = opportunities.filter((opportunity) => {
    const matchesSearch =
      opportunity.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage =
      stageFilter === "all" || opportunity.stage === stageFilter;
    const matchesPriority =
      priorityFilter === "all" || opportunity.priority === priorityFilter;

    return matchesSearch && matchesStage && matchesPriority;
  });

  const totalValue = filteredOpportunities.reduce(
    (sum, opp) => sum + (opp.amount || 0),
    0,
  );
  const weightedValue = filteredOpportunities.reduce(
    (sum, opp) => sum + ((opp.amount || 0) * (opp.probability || 0)) / 100,
    0,
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading opportunities...</div>
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
            <h1 className="text-3xl font-bold">Sales Opportunities</h1>
            <p className="text-gray-600">
              Manage your sales pipeline and deals
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Opportunity
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pipeline
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredOpportunities.length} opportunities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Weighted Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${weightedValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Probability-adjusted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredOpportunities.length > 0
                  ? Math.round(
                      (filteredOpportunities.filter(
                        (o) => o.stage === OpportunityStage.CLOSED_WON,
                      ).length /
                        filteredOpportunities.length) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Closed won opportunities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search opportunities..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchTerm(e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All stages</SelectItem>
                    {Object.values(OpportunityStage).map((stage) => (
                      <SelectItem key={stage as string} value={stage as string}>
                        {(stage as string).replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {Object.values(OpportunityPriority).map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities List */}
        <Card>
          <CardHeader>
            <CardTitle>Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOpportunities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No opportunities found. Create your first opportunity to get
                started.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOpportunities.map((opportunity) => (
                  <div
                    key={opportunity.id}
                    className="border rounded-lg p-4 hover:bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {opportunity.name || opportunity.title}
                          </h3>
                          <Badge className={getStageColor(opportunity.stage)}>
                            {opportunity.stage.replace("_", " ")}
                          </Badge>
                          <Badge
                            className={getPriorityColor(opportunity.priority)}
                          >
                            {opportunity.priority}
                          </Badge>
                        </div>

                        {opportunity.description && (
                          <p className="text-gray-600 mb-3">
                            {opportunity.description}
                          </p>
                        )}

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />$
                            {opportunity.amount?.toLocaleString() || "0"}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {opportunity.expectedCloseDate
                              ? new Date(
                                  opportunity.expectedCloseDate,
                                ).toLocaleDateString()
                              : "No close date"}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {opportunity.probability || 0}% probability
                          </div>
                          {opportunity.contactId && (
                            <div className="flex items-center gap-1">
                              <User className="w-4 h-4" />
                              {
                                contacts.find(
                                  (c) => c.id === opportunity.contactId,
                                )?.firstName
                              }{" "}
                              {
                                contacts.find(
                                  (c) => c.id === opportunity.contactId,
                                )?.lastName
                              }
                            </div>
                          )}
                          {opportunity.companyId && (
                            <div className="flex items-center gap-1">
                              <Building className="w-4 h-4" />
                              {
                                companies.find(
                                  (c) => c.id === opportunity.companyId,
                                )?.name
                              }
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(opportunity)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(opportunity.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunity
                  ? "Edit Opportunity"
                  : "Create New Opportunity"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(
                      e: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(
                      e: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(
                    e: React.ChangeEvent<
                      HTMLInputElement | HTMLTextAreaElement
                    >,
                  ) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="stage">Stage *</Label>
                  <Select
                    value={formData.stage}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
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
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: string) =>
                      setFormData({
                        ...formData,
                        priority: value as OpportunityPriority,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(OpportunityPriority).map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="probability">Probability (%) *</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(
                      e: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) =>
                      setFormData({ ...formData, probability: e.target.value })
                    }
                    placeholder="50"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="closeDate">Close Date *</Label>
                  <Input
                    id="closeDate"
                    type="date"
                    value={formData.closeDate}
                    onChange={(
                      e: React.ChangeEvent<
                        HTMLInputElement | HTMLTextAreaElement
                      >,
                    ) =>
                      setFormData({ ...formData, closeDate: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contactId">Contact</Label>
                  <Select
                    value={formData.contactId}
                    onValueChange={(value: string) =>
                      setFormData({ ...formData, contactId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No contact</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.firstName} {contact.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="companyId">Company</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value: string) =>
                    setFormData({ ...formData, companyId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No company</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(
                    e: React.ChangeEvent<
                      HTMLInputElement | HTMLTextAreaElement
                    >,
                  ) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setEditingOpportunity(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingOpportunity ? "Update" : "Create"} Opportunity
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
