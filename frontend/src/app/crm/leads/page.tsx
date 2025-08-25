"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Phone,
  Mail,
  Building2,
  Calendar,
  Target,
} from "lucide-react";
import CRMService from "@/src/services/CRMService";
import {
  Lead,
  LeadCreate,
  LeadUpdate,
  LeadStatus,
  LeadSource,
  CRMLeadFilters,
} from "@/src/models/crm";
import { DashboardLayout } from "../../../components/layout";
import { useCustomOptions } from "../../../hooks/useCustomOptions";
import { CustomOptionDialog } from "../../../components/common/CustomOptionDialog";

export default function CRMLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CRMLeadFilters>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [showCustomLeadSourceDialog, setShowCustomLeadSourceDialog] =
    useState(false);

  // Custom options hook
  const {
    customLeadSources,
    createCustomLeadSource,
    loading: customOptionsLoading,
  } = useCustomOptions();

  const [formData, setFormData] = useState<LeadCreate>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    status: LeadStatus.NEW,
    source: LeadSource.WEBSITE,
    notes: "",
    tags: [],
    score: 0,
    budget: undefined,
    timeline: "",
  });

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const response = await CRMService.getLeads(filters, page, 10);
      setLeads(response.leads);
      setTotalPages(response.pagination.pages);
    } catch (err) {
      setError("Failed to load leads");
      console.error("Leads load error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

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

  const handleCreateLead = async () => {
    try {
      await CRMService.createLead(formData);
      setIsCreateDialogOpen(false);
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        company: "",
        jobTitle: "",
        status: LeadStatus.NEW,
        source: LeadSource.WEBSITE,
        notes: "",
        tags: [],
        score: 0,
        budget: undefined,
        timeline: "",
      });
      loadLeads();
    } catch (err) {
      console.error("Create lead error:", err);
    }
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;
    try {
      await CRMService.updateLead(selectedLead.id, formData);
      setIsEditDialogOpen(false);
      loadLeads();
    } catch (err) {
      console.error("Update lead error:", err);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      try {
        await CRMService.deleteLead(id);
        loadLeads();
      } catch (err) {
        console.error("Delete lead error:", err);
      }
    }
  };

  const handleSearch = () => {
    setFilters((prev: CRMLeadFilters) => ({ ...prev, search }));
    setPage(1);
  };

  const handleFilterChange = (key: keyof CRMLeadFilters, value: string) => {
    setFilters((prev: CRMLeadFilters) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
    setPage(1);
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-lg">Loading Leads...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CRM Leads</h1>
            <p className="text-gray-600">Manage and track your sales leads</p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Lead
          </Button>
        </div>

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
                <Label htmlFor="search">Search</Label>
                <div className="flex space-x-2">
                  <Input
                    id="search"
                    placeholder="Search leads..."
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
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {Object.values(LeadStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  value={filters.source || "all"}
                  onValueChange={(value) => handleFilterChange("source", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {Object.values(LeadSource).map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.replace("_", " ").charAt(0).toUpperCase() +
                          source.replace("_", " ").slice(1)}
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

        {/* Leads List */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
            <CardDescription>
              Manage your sales leads and track their progress
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="font-medium">
                            {lead.firstName} {lead.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lead.email}
                          </div>
                        </div>
                      </div>
                      {lead.company && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Building2 className="w-4 h-4" />
                          <span>{lead.company}</span>
                        </div>
                      )}
                      {lead.jobTitle && (
                        <span className="text-sm text-gray-500">
                          {lead.jobTitle}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge
                        className={CRMService.getLeadStatusColor(lead.status)}
                      >
                        {lead.status.charAt(0).toUpperCase() +
                          lead.status.slice(1)}
                      </Badge>
                      <Badge variant="outline">
                        {lead.source.replace("_", " ").charAt(0).toUpperCase() +
                          lead.source.replace("_", " ").slice(1)}
                      </Badge>
                      {lead.score > 0 && (
                        <Badge variant="secondary">Score: {lead.score}</Badge>
                      )}
                      {lead.budget && (
                        <Badge variant="outline">
                          Budget: {CRMService.formatCurrency(lead.budget)}
                        </Badge>
                      )}
                    </div>
                    {lead.notes && (
                      <div className="text-sm text-gray-600 mt-2">
                        {lead.notes}
                      </div>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>
                        Created: {CRMService.formatDate(lead.createdAt)}
                      </span>
                      {lead.lastContactDate && (
                        <span>
                          Last Contact:{" "}
                          {CRMService.formatDate(lead.lastContactDate)}
                        </span>
                      )}
                      {lead.nextFollowUpDate && (
                        <span>
                          Next Follow-up:{" "}
                          {CRMService.formatDate(lead.nextFollowUpDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLead(lead);
                        setIsViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLead(lead);
                        setFormData({
                          firstName: lead.firstName,
                          lastName: lead.lastName,
                          email: lead.email,
                          phone: lead.phone || "",
                          company: lead.company || "",
                          jobTitle: lead.jobTitle || "",
                          status: lead.status,
                          source: lead.source,
                          notes: lead.notes || "",
                          tags: lead.tags,
                          score: lead.score,
                          budget: lead.budget,
                          timeline: lead.timeline || "",
                        });
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLead(lead.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Lead Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Lead</DialogTitle>
              <DialogDescription>
                Add a new lead to your CRM system
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev: LeadCreate) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      jobTitle: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as LeadStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeadStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => {
                    if (value === "create_new") {
                      setShowCustomLeadSourceDialog(true);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        source: value as LeadSource,
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeadSource).map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.replace("_", " ").charAt(0).toUpperCase() +
                          source.replace("_", " ").slice(1)}
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
                <Label htmlFor="score">Score</Label>
                <Input
                  id="score"
                  type="number"
                  value={formData.score}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      score: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
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
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateLead}>Create Lead</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Lead Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>Update lead information</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="editFirstName">First Name *</Label>
                <Input
                  id="editFirstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editLastName">Last Name *</Label>
                <Input
                  id="editLastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email *</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editPhone">Phone</Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editCompany">Company</Label>
                <Input
                  id="editCompany"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editJobTitle">Job Title</Label>
                <Input
                  id="editJobTitle"
                  value={formData.jobTitle}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      jobTitle: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editStatus">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as LeadStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeadStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editSource">Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      source: value as LeadSource,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LeadSource).map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.replace("_", " ").charAt(0).toUpperCase() +
                          source.replace("_", " ").slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="editScore">Score</Label>
                <Input
                  id="editScore"
                  type="number"
                  value={formData.score}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      score: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="editBudget">Budget</Label>
                <Input
                  id="editBudget"
                  type="number"
                  value={formData.budget || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      budget: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateLead}>Update Lead</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Lead Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View complete lead information
              </DialogDescription>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Name</Label>
                    <p>
                      {selectedLead.firstName} {selectedLead.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="font-medium">Email</Label>
                    <p>{selectedLead.email}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Phone</Label>
                    <p>{selectedLead.phone || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Company</Label>
                    <p>{selectedLead.company || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Job Title</Label>
                    <p>{selectedLead.jobTitle || "N/A"}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Status</Label>
                    <Badge
                      className={CRMService.getLeadStatusColor(
                        selectedLead.status,
                      )}
                    >
                      {selectedLead.status.charAt(0).toUpperCase() +
                        selectedLead.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-medium">Source</Label>
                    <Badge variant="outline">
                      {selectedLead.source
                        .replace("_", " ")
                        .charAt(0)
                        .toUpperCase() +
                        selectedLead.source.replace("_", " ").slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <Label className="font-medium">Score</Label>
                    <p>{selectedLead.score}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Budget</Label>
                    <p>
                      {selectedLead.budget
                        ? CRMService.formatCurrency(selectedLead.budget)
                        : "N/A"}
                    </p>
                  </div>
                </div>
                {selectedLead.notes && (
                  <div>
                    <Label className="font-medium">Notes</Label>
                    <p className="text-gray-600">{selectedLead.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">Created</Label>
                    <p>{CRMService.formatDateTime(selectedLead.createdAt)}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Last Updated</Label>
                    <p>{CRMService.formatDateTime(selectedLead.updatedAt)}</p>
                  </div>
                  {selectedLead.lastContactDate && (
                    <div>
                      <Label className="font-medium">Last Contact</Label>
                      <p>
                        {CRMService.formatDate(selectedLead.lastContactDate)}
                      </p>
                    </div>
                  )}
                  {selectedLead.nextFollowUpDate && (
                    <div>
                      <Label className="font-medium">Next Follow-up</Label>
                      <p>
                        {CRMService.formatDate(selectedLead.nextFollowUpDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setIsViewDialogOpen(false)}
              >
                Close
              </Button>
            </div>
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
      </div>
    </DashboardLayout>
  );
}
