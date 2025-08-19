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
  Building2,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Globe,
  Phone,
  MapPin,
} from "lucide-react";
import CRMService from "@/src/services/CRMService";
import {
  Company,
  Industry,
  CompanySize,
  CRMCompanyFilters,
} from "@/src/models/crm";
import { DashboardLayout } from "../../../components/layout";

export default function CRMCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CRMCompanyFilters>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCompanies();
  }, [filters]);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await CRMService.getCompanies(filters, 1, 100);
      setCompanies(response.companies);
    } catch (err) {
      console.error("Companies load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev: CRMCompanyFilters) => ({ ...prev, search }));
  };

  const resetFilters = () => {
    setFilters({});
    setSearch("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-lg">Loading Companies...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">CRM Companies</h1>
          <p className="text-gray-600">
            Manage your company database and relationships
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Company
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
              <label className="text-sm font-medium">Search</label>
              <div className="flex space-x-2">
                <Input
                  placeholder="Search companies..."
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
              <label className="text-sm font-medium">Industry</label>
              <Select
                value={filters.industry}
                onValueChange={(value) =>
                  setFilters((prev: CRMCompanyFilters) => ({
                    ...prev,
                    industry: value as Industry,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Industries</SelectItem>
                  {Object.values(Industry).map((industry) => (
                    <SelectItem key={industry as string} value={industry as string}>
                      {(industry as string).charAt(0).toUpperCase() + (industry as string).slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Size</label>
              <Select
                value={filters.size}
                onValueChange={(value) =>
                  setFilters((prev: CRMCompanyFilters) => ({
                    ...prev,
                    size: value as CompanySize,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Sizes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sizes</SelectItem>
                  {Object.values(CompanySize).map((size) => (
                    <SelectItem key={size as string} value={size as string}>
                      {(size as string).charAt(0).toUpperCase() + (size as string).slice(1)}
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

      {/* Companies List */}
      <Card>
        <CardHeader>
          <CardTitle>Companies ({companies.length})</CardTitle>
          <CardDescription>
            Manage your company database and track business relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {companies.map((company) => (
              <div
                key={company.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-gray-500">
                          {company.industry && (
                            <span className="mr-2">{company.industry}</span>
                          )}
                          {company.size && <span>• {company.size}</span>}
                        </div>
                      </div>
                    </div>
                    {company.website && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Globe className="w-4 h-4" />
                        <span>{company.website}</span>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Phone className="w-4 h-4" />
                        <span>{company.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    {company.industry && (
                      <Badge variant="outline">
                        {company.industry.charAt(0).toUpperCase() +
                          company.industry.slice(1)}
                      </Badge>
                    )}
                    {company.size && (
                      <Badge variant="secondary">
                        {company.size.charAt(0).toUpperCase() +
                          company.size.slice(1)}
                      </Badge>
                    )}
                    <Badge variant={company.isActive ? "default" : "secondary"}>
                      {company.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {company.description && (
                    <div className="text-sm text-gray-600 mt-2">
                      {company.description}
                    </div>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>
                      Created: {CRMService.formatDate(company.createdAt)}
                    </span>
                    {company.city && company.state && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>
                          {company.city}, {company.state}
                        </span>
                      </div>
                    )}
                    {company.employeeCount && (
                      <span>{company.employeeCount} employees</span>
                    )}
                    {company.annualRevenue && (
                      <span>
                        Revenue:{" "}
                        {CRMService.formatCurrency(company.annualRevenue)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardLayout>
  );
}
