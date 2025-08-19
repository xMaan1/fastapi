"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import {
  Target,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Calendar,
  TrendingUp,
} from "lucide-react";
import CRMService from "@/src/services/CRMService";
import {
  Opportunity,
  OpportunityStage,
  CRMOpportunityFilters,
  OpportunityCreate,
  OpportunityUpdate,
} from "@/src/models/crm";
import { DashboardLayout } from "../../../components/layout";

export default function CRMOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CRMOpportunityFilters>({});
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [viewingOpportunity, setViewingOpportunity] = useState<Opportunity | null>(null);
  const [deletingOpportunity, setDeletingOpportunity] = useState<Opportunity | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<OpportunityCreate>({
    title: "",
    description: "",
    stage: OpportunityStage.PROSPECTING,
    amount: undefined,
    probability: 50,
    expectedCloseDate: "",
    leadId: "",
    contactId: "",
    companyId: "",
    assignedTo: "",
    notes: "",
    tags: [],
  });

  useEffect(() => {
    loadOpportunities();
  }, [filters]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const response = await CRMService.getOpportunities(filters, 1, 100);
      setOpportunities(response.opportunities);
    } catch (err) {
      setErrorMessage("Failed to load opportunities");
      console.error("Opportunities load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev: CRMOpportunityFilters) => ({ ...prev, search }));
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      stage: OpportunityStage.PROSPECTING,
      amount: undefined,
      probability: 50,
      expectedCloseDate: "",
      leadId: "",
      contactId: "",
      companyId: "",
      assignedTo: "",
      notes: "",
      tags: [],
    });
    setEditingOpportunity(null);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      if (editingOpportunity) {
        await CRMService.updateOpportunity(editingOpportunity.id, formData);
        setSuccessMessage("Opportunity updated successfully!");
      } else {
        await CRMService.createOpportunity(formData);
        setSuccessMessage("Opportunity created successfully!");
      }

      setShowCreateDialog(false);
      resetForm();
      loadOpportunities();
    } catch (err) {
      setErrorMessage("Failed to save opportunity. Please try again.");
      console.error("Opportunity save error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setFormData({
      title: opportunity.title,
      description: opportunity.description || "",
      stage: opportunity.stage,
      amount: opportunity.amount,
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate || "",
      leadId: opportunity.leadId || "",
      contactId: opportunity.contactId || "",
      companyId: opportunity.companyId || "",
      assignedTo: opportunity.assignedTo || "",
      notes: opportunity.notes || "",
      tags: opportunity.tags || [],
    });
    setShowCreateDialog(true);
  };

  const handleView = (opportunity: Opportunity) => {
    setViewingOpportunity(opportunity);
  };

  const handleDelete = (opportunity: Opportunity) => {
    setDeletingOpportunity(opportunity);
  };

  const confirmDelete = async () => {
    if (!deletingOpportunity) return;

    try {
      setDeleting(true);
      await CRMService.deleteOpportunity(deletingOpportunity.id);
      setSuccessMessage("Opportunity deleted successfully!");
      setDeletingOpportunity(null);
      loadOpportunities();
    } catch (err) {
      setErrorMessage("Failed to delete opportunity. Please try again.");
      console.error("Opportunity delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-lg">Loading Opportunities...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">
              CRM Opportunities
            </h1>
            <p className="text-gray-600">
              Manage your sales opportunities and pipeline
            </p>
          </div>
          <Button onClick={() => {
            setShowCreateDialog(true);
            resetForm();
          }}>
            <Plus className="w-4 h-4 mr-2" />
            New Opportunity
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">
              {successMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Search</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search opportunities..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Stage</label>
                <Select
                  value={filters.stage || "all"}
                  onValueChange={(value) =>
                    setFilters((prev: CRMOpportunityFilters) => ({
                      ...prev,
                      stage: value === "all" ? undefined : value as OpportunityStage,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    {Object.values(OpportunityStage).map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage.replace("_", " ").charAt(0).toUpperCase() +
                          stage.replace("_", " ").slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={resetFilters}>
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities List */}
        <Card>
          <CardHeader>
            <CardTitle>Opportunities ({opportunities.length})</CardTitle>
            <CardDescription>
              Manage your sales opportunities and track progress through the
              pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Target className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="font-medium">{opportunity.title}</div>
                          <div className="text-sm text-gray-500">
                            {opportunity.description &&
                            opportunity.description.length > 100
                              ? `${opportunity.description.substring(0, 100)}...`
                              : opportunity.description}
                          </div>
                        </div>
                      </div>
                      {opportunity.amount && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-medium">
                            {CRMService.formatCurrency(opportunity.amount)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge
                        className={CRMService.getOpportunityStageColor(
                          opportunity.stage,
                        )}
                      >
                        {opportunity.stage
                          .replace("_", " ")
                          .charAt(0)
                          .toUpperCase() +
                          opportunity.stage.replace("_", " ").slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {opportunity.probability}% probability
                      </Badge>
                      {opportunity.expectedCloseDate && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Closes:{" "}
                            {CRMService.formatDate(opportunity.expectedCloseDate)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>
                        Created: {CRMService.formatDate(opportunity.createdAt)}
                      </span>
                      {opportunity.leadId && (
                        <span>Lead ID: {opportunity.leadId}</span>
                      )}
                      {opportunity.contactId && (
                        <span>Contact ID: {opportunity.contactId}</span>
                      )}
                      {opportunity.companyId && (
                        <span>Company ID: {opportunity.companyId}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleView(opportunity)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(opportunity)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(opportunity)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
            <CardDescription>Overview of opportunities by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              {Object.values(OpportunityStage).map((stage) => {
                const stageOpportunities = opportunities.filter(
                  (o) => o.stage === stage,
                );
                const totalValue = stageOpportunities.reduce(
                  (sum, o) => sum + (o.amount || 0),
                  0,
                );

                return (
                  <div key={stage} className="text-center p-3 border rounded-lg">
                    <div className="text-sm font-medium text-gray-600 capitalize">
                      {stage.replace("_", " ")}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {stageOpportunities.length}
                    </div>
                    <div className="text-xs text-gray-500">
                      {CRMService.formatCurrency(totalValue)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Opportunity Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOpportunity ? "Edit Opportunity" : "New Opportunity"}
              </DialogTitle>
              <DialogDescription>
                {editingOpportunity 
                  ? "Update opportunity information" 
                  : "Create a new sales opportunity"
                }
              </DialogDescription>
            </DialogHeader>
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Opportunity title"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Opportunity description"
                />
              </div>
              <div>
                <Label htmlFor="stage">Stage *</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      stage: value as OpportunityStage,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(OpportunityStage).map((stage) => (
                      <SelectItem key={stage} value={stage}>
                        {stage.replace("_", " ").charAt(0).toUpperCase() +
                          stage.replace("_", " ").slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      amount: e.target.value ? parseFloat(e.target.value) : undefined,
                    }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="probability">Probability (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      probability: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                <Input
                  id="expectedCloseDate"
                  type="date"
                  value={formData.expectedCloseDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      expectedCloseDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="leadId">Lead ID</Label>
                <Input
                  id="leadId"
                  value={formData.leadId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, leadId: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="contactId">Contact ID</Label>
                <Input
                  id="contactId"
                  value={formData.contactId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactId: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="companyId">Company ID</Label>
                <Input
                  id="companyId"
                  value={formData.companyId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, companyId: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={formData.assignedTo}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, assignedTo: e.target.value }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving..." : editingOpportunity ? "Update Opportunity" : "Create Opportunity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Opportunity Dialog */}
        <Dialog open={!!viewingOpportunity} onOpenChange={() => setViewingOpportunity(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>View Opportunity</DialogTitle>
              <DialogDescription>Opportunity details</DialogDescription>
            </DialogHeader>
            
            {viewingOpportunity && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Title</Label>
                  <p className="text-lg font-medium">{viewingOpportunity.title}</p>
                </div>
                {viewingOpportunity.description && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Description</Label>
                    <p className="text-gray-900">{viewingOpportunity.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Stage</Label>
                    <Badge className={CRMService.getOpportunityStageColor(viewingOpportunity.stage)}>
                      {viewingOpportunity.stage.replace("_", " ").charAt(0).toUpperCase() +
                        viewingOpportunity.stage.replace("_", " ").slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Probability</Label>
                    <p className="text-gray-900">{viewingOpportunity.probability}%</p>
                  </div>
                  {viewingOpportunity.amount && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Amount</Label>
                      <p className="text-gray-900 font-medium">
                        {CRMService.formatCurrency(viewingOpportunity.amount)}
                      </p>
                    </div>
                  )}
                  {viewingOpportunity.expectedCloseDate && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">Expected Close Date</Label>
                      <p className="text-gray-900">
                        {CRMService.formatDate(viewingOpportunity.expectedCloseDate)}
                      </p>
                    </div>
                  )}
                </div>
                {viewingOpportunity.notes && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Notes</Label>
                    <p className="text-gray-900">{viewingOpportunity.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Created</Label>
                    <p>{CRMService.formatDate(viewingOpportunity.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">Updated</Label>
                    <p>{CRMService.formatDate(viewingOpportunity.updatedAt)}</p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingOpportunity(null)}>
                Close
              </Button>
              {viewingOpportunity && (
                <Button onClick={() => {
                  setViewingOpportunity(null);
                  handleEdit(viewingOpportunity);
                }}>
                  Edit Opportunity
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletingOpportunity} onOpenChange={() => setDeletingOpportunity(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Opportunity</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{deletingOpportunity?.title}"? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingOpportunity(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Opportunity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
