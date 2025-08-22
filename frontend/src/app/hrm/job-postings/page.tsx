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
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
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
import { Badge } from "@/src/components/ui/badge";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Building,
} from "lucide-react";
import HRMService from "@/src/services/HRMService";
import {
  JobPosting,
  JobPostingCreate,
  JobPostingUpdate,
  JobStatus,
  Department,
  EmployeeType,
  HRMJobFilters,
} from "@/src/models/hrm";
import { DashboardLayout } from "@/src/components/layout";
import { useCustomOptions } from "@/src/hooks/useCustomOptions";
import { CustomOptionDialog } from "@/src/components/common/CustomOptionDialog";

export default function HRMJobPostingsPage() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HRMJobFilters>({});
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJobPosting, setEditingJobPosting] = useState<JobPosting | null>(
    null,
  );
  const [viewingJobPosting, setViewingJobPosting] = useState<JobPosting | null>(
    null,
  );
  const [deletingJobPosting, setDeletingJobPosting] =
    useState<JobPosting | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomDepartmentDialog, setShowCustomDepartmentDialog] = useState(false);
  
  // Custom options hook
  const { customDepartments, createCustomDepartment, loading: customOptionsLoading } = useCustomOptions();
  const [formData, setFormData] = useState<JobPostingCreate>({
    title: "",
    department: Department.ENGINEERING,
    description: "",
    requirements: [] as string[],
    responsibilities: [] as string[],
    location: "",
    type: EmployeeType.FULL_TIME,
    salaryRange: "",
    benefits: [] as string[],
    status: JobStatus.DRAFT,
    openDate: new Date().toISOString().split("T")[0],
    closeDate: "",
    hiringManagerId: "",
    tags: [] as string[],
  });

  useEffect(() => {
    loadJobPostings();
  }, [filters]);

  const loadJobPostings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await HRMService.getJobPostings(filters, 1, 100);
      setJobPostings(response.jobPostings);
    } catch (err) {
      setError("Failed to load job postings");
      console.error("Job postings load error:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleSearch = () => {
    setFilters((prev: HRMJobFilters) => ({ ...prev, search }));
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
  };

  const handleCreateCustomDepartment = async (name: string, description: string) => {
    try {
      await createCustomDepartment(name, description);
    } catch (error) {
      console.error('Failed to create custom department:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      department: Department.ENGINEERING,
      description: "",
      requirements: [] as string[],
      responsibilities: [] as string[],
      location: "",
      type: EmployeeType.FULL_TIME,
      salaryRange: "",
      benefits: [] as string[],
      status: JobStatus.DRAFT,
      openDate: new Date().toISOString().split("T")[0],
      closeDate: "",
      hiringManagerId: "",
      tags: [] as string[],
    });
    setEditingJobPosting(null);
    setError(null);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (editingJobPosting) {
        await HRMService.updateJobPosting(editingJobPosting.id, formData);
        setSuccessMessage("Job posting updated successfully!");
      } else {
        await HRMService.createJobPosting(formData);
        setSuccessMessage("Job posting created successfully!");
      }

      setShowCreateDialog(false);
      resetForm();
      loadJobPostings();
    } catch (err) {
      setError("Failed to save job posting. Please try again.");
      console.error("Job posting save error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (jobPosting: JobPosting) => {
    setEditingJobPosting(jobPosting);
    setFormData({
      title: jobPosting.title,
      department: jobPosting.department,
      description: jobPosting.description,
      requirements: jobPosting.requirements,
      responsibilities: jobPosting.responsibilities,
      location: jobPosting.location,
      type: jobPosting.type,
      salaryRange: jobPosting.salaryRange || "",
      benefits: jobPosting.benefits,
      status: jobPosting.status,
      openDate: jobPosting.openDate.split("T")[0],
      closeDate: jobPosting.closeDate?.split("T")[0] || "",
      hiringManagerId: jobPosting.hiringManagerId || "",
      tags: jobPosting.tags,
    });
    setShowCreateDialog(true);
  };

  const handleView = (jobPosting: JobPosting) => {
    setViewingJobPosting(jobPosting);
  };

  const handleDelete = (jobPosting: JobPosting) => {
    setDeletingJobPosting(jobPosting);
  };

  const confirmDelete = async () => {
    if (!deletingJobPosting) return;

    try {
      setDeleting(true);
      await HRMService.deleteJobPosting(deletingJobPosting.id);
      setSuccessMessage("Job posting deleted successfully!");
      setDeletingJobPosting(null);
      loadJobPostings();
    } catch (err) {
      setError("Failed to delete job posting. Please try again.");
      console.error("Job posting delete error:", err);
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: JobStatus) => {
    const statusColors: { [key: string]: string } = {
      draft: "bg-gray-100 text-gray-800",
      published: "bg-green-100 text-green-800",
      closed: "bg-red-100 text-red-800",
      on_hold: "bg-yellow-100 text-yellow-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  const getDepartmentColor = (department: Department) => {
    const deptColors: { [key: string]: string } = {
      engineering: "bg-blue-100 text-blue-800",
      sales: "bg-green-100 text-green-800",
      marketing: "bg-purple-100 text-purple-800",
      hr: "bg-pink-100 text-pink-800",
      finance: "bg-yellow-100 text-yellow-800",
      operations: "bg-indigo-100 text-indigo-800",
      customer_support: "bg-orange-100 text-orange-800",
      legal: "bg-red-100 text-red-800",
      it: "bg-cyan-100 text-cyan-800",
      other: "bg-gray-100 text-gray-800",
    };
    return deptColors[department] || "bg-gray-100 text-gray-800";
  };

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading job postings...</div>
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
            <h1 className="text-3xl font-bold text-gray-900">Job Postings</h1>
            <p className="text-gray-600">
              Manage your job openings and recruitment
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCreateDialog(true);
              resetForm();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Job Posting
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

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Search</label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Search job postings..."
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
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={filters.department || "all"}
                  onValueChange={(value) =>
                    setFilters((prev: HRMJobFilters) => ({
                      ...prev,
                      department:
                        value === "all" ? undefined : (value as Department),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {Object.values(Department).map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) =>
                    setFilters((prev: HRMJobFilters) => ({
                      ...prev,
                      status:
                        value === "all" ? undefined : (value as JobStatus),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.values(JobStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) =>
                    setFilters((prev: HRMJobFilters) => ({
                      ...prev,
                      type:
                        value === "all" ? undefined : (value as EmployeeType),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.values(EmployeeType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ").toUpperCase()}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobPostings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Published</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  jobPostings.filter(
                    (job) => job.status === JobStatus.PUBLISHED,
                  ).length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  jobPostings.filter((job) => job.status === JobStatus.DRAFT)
                    .length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  jobPostings.filter((job) => job.status === JobStatus.CLOSED)
                    .length
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Postings List */}
        <Card>
          <CardHeader>
            <CardTitle>Job Postings ({jobPostings.length})</CardTitle>
            <CardDescription>
              Manage your job openings and recruitment process
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {jobPostings.map((jobPosting) => (
                <div
                  key={jobPosting.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="font-medium text-lg">
                            {jobPosting.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {jobPosting.description &&
                            jobPosting.description.length > 100
                              ? `${jobPosting.description.substring(0, 100)}...`
                              : jobPosting.description}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge
                        className={getDepartmentColor(jobPosting.department)}
                      >
                        {jobPosting.department.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(jobPosting.status)}>
                        {jobPosting.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <Badge variant="outline">
                        {jobPosting.type.replace("_", " ").toUpperCase()}
                      </Badge>
                      {jobPosting.salaryRange && (
                        <Badge variant="outline">
                          <DollarSign className="w-3 h-3 mr-1" />
                          {jobPosting.salaryRange}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{jobPosting.location}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          Opens:{" "}
                          {new Date(jobPosting.openDate).toLocaleDateString()}
                        </span>
                      </div>
                      {jobPosting.closeDate && (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>
                            Closes:{" "}
                            {new Date(
                              jobPosting.closeDate,
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Building className="w-3 h-3" />
                        <span>
                          Created:{" "}
                          {new Date(jobPosting.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(jobPosting)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(jobPosting)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(jobPosting)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {jobPostings.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No job postings found. Create your first job posting to get
                  started.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Job Posting Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingJobPosting ? "Edit Job Posting" : "New Job Posting"}
              </DialogTitle>
              <DialogDescription>
                {editingJobPosting
                  ? "Update job posting information"
                  : "Create a new job posting for recruitment"}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g., Senior Software Engineer"
                />
              </div>
              <div>
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => {
                    if (value === "create_new") {
                      setShowCustomDepartmentDialog(true);
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        department: value as Department,
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(Department).map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                    
                    {/* Custom Departments */}
                    {customDepartments && customDepartments.length > 0 && customDepartments.map((customDept) => (
                      <SelectItem key={customDept.id} value={customDept.id}>
                        {customDept.name}
                      </SelectItem>
                    ))}
                    
                    <SelectItem value="create_new" className="font-semibold text-blue-600">
                      + Create New Department
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="type">Employment Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: value as EmployeeType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(EmployeeType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  placeholder="e.g., New York, NY"
                />
              </div>
              <div>
                <Label htmlFor="salaryRange">Salary Range</Label>
                <Input
                  id="salaryRange"
                  value={formData.salaryRange}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      salaryRange: e.target.value,
                    }))
                  }
                  placeholder="e.g., $80,000 - $120,000"
                />
              </div>
              <div>
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: value as JobStatus,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(JobStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace("_", " ").toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="openDate">Open Date *</Label>
                <Input
                  id="openDate"
                  type="date"
                  value={formData.openDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      openDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="closeDate">Close Date</Label>
                <Input
                  id="closeDate"
                  type="date"
                  value={formData.closeDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      closeDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Detailed job description..."
                  rows={4}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="requirements">
                  Requirements (one per line)
                </Label>
                <Textarea
                  id="requirements"
                  value={(formData.requirements || []).join("\n")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requirements: e.target.value
                        .split("\n")
                        .filter((line) => line.trim()),
                    }))
                  }
                  placeholder="Enter requirements, one per line..."
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="responsibilities">
                  Responsibilities (one per line)
                </Label>
                <Textarea
                  id="responsibilities"
                  value={(formData.responsibilities || []).join("\n")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      responsibilities: e.target.value
                        .split("\n")
                        .filter((line) => line.trim()),
                    }))
                  }
                  placeholder="Enter responsibilities, one per line..."
                  rows={3}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="benefits">Benefits (one per line)</Label>
                <Textarea
                  id="benefits"
                  value={(formData.benefits || []).join("\n")}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      benefits: e.target.value
                        .split("\n")
                        .filter((line) => line.trim()),
                    }))
                  }
                  placeholder="Enter benefits, one per line..."
                  rows={3}
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
                {submitting
                  ? "Saving..."
                  : editingJobPosting
                    ? "Update Job Posting"
                    : "Create Job Posting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Job Posting Dialog */}
        <Dialog
          open={!!viewingJobPosting}
          onOpenChange={() => setViewingJobPosting(null)}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Job Posting</DialogTitle>
              <DialogDescription>Job posting details</DialogDescription>
            </DialogHeader>

            {viewingJobPosting && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Job Title
                  </Label>
                  <p className="text-lg font-medium">
                    {viewingJobPosting.title}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Department
                    </Label>
                    <Badge
                      className={getDepartmentColor(
                        viewingJobPosting.department,
                      )}
                    >
                      {viewingJobPosting.department
                        .replace("_", " ")
                        .toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Employment Type
                    </Label>
                    <Badge variant="outline">
                      {viewingJobPosting.type.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Status
                    </Label>
                    <Badge className={getStatusColor(viewingJobPosting.status)}>
                      {viewingJobPosting.status.replace("_", " ").toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Location
                    </Label>
                    <p className="text-gray-900">
                      {viewingJobPosting.location}
                    </p>
                  </div>
                </div>
                {viewingJobPosting.salaryRange && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Salary Range
                    </Label>
                    <p className="text-gray-900 font-medium">
                      {viewingJobPosting.salaryRange}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-gray-600">
                    Job Description
                  </Label>
                  <p className="text-gray-900">
                    {viewingJobPosting.description}
                  </p>
                </div>
                {viewingJobPosting.requirements.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Requirements
                    </Label>
                    <ul className="list-disc list-inside space-y-1">
                      {viewingJobPosting.requirements.map((req, index) => (
                        <li key={index} className="text-gray-900">
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {viewingJobPosting.responsibilities.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Responsibilities
                    </Label>
                    <ul className="list-disc list-inside space-y-1">
                      {viewingJobPosting.responsibilities.map((resp, index) => (
                        <li key={index} className="text-gray-900">
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {viewingJobPosting.benefits.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Benefits
                    </Label>
                    <ul className="list-disc list-inside space-y-1">
                      {viewingJobPosting.benefits.map((benefit, index) => (
                        <li key={index} className="text-gray-900">
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Open Date
                    </Label>
                    <p>
                      {new Date(
                        viewingJobPosting.openDate,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {viewingJobPosting.closeDate && (
                    <div>
                      <Label className="text-sm font-medium text-gray-600">
                        Close Date
                      </Label>
                      <p>
                        {new Date(
                          viewingJobPosting.closeDate,
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Created
                    </Label>
                    <p>
                      {new Date(
                        viewingJobPosting.createdAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">
                      Updated
                    </Label>
                    <p>
                      {new Date(
                        viewingJobPosting.updatedAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setViewingJobPosting(null)}
              >
                Close
              </Button>
              {viewingJobPosting && (
                <Button
                  onClick={() => {
                    setViewingJobPosting(null);
                    handleEdit(viewingJobPosting);
                  }}
                >
                  Edit Job Posting
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deletingJobPosting}
          onOpenChange={() => setDeletingJobPosting(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Job Posting</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;
                {deletingJobPosting?.title}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeletingJobPosting(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Job Posting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Department Dialog */}
        <CustomOptionDialog
          open={showCustomDepartmentDialog}
          onOpenChange={setShowCustomDepartmentDialog}
          title="Create New Department"
          description="Create a custom department that will be available for your tenant."
          optionName="Department"
          placeholder="e.g., Data Science, DevOps"
          onSubmit={handleCreateCustomDepartment}
          loading={customOptionsLoading.department}
        />
      </div>
    </DashboardLayout>
  );
}
