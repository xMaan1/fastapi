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
} from "@/src/models/crm";

export default function CRMOpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CRMOpportunityFilters>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadOpportunities();
  }, [filters]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      const response = await CRMService.getOpportunities(filters, 1, 100);
      setOpportunities(response.opportunities);
    } catch (err) {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-lg">Loading Opportunities...</p>
        </div>
      </div>
    );
  }

  return (
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
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Opportunity
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                value={filters.stage}
                onValueChange={(value) =>
                  setFilters((prev: CRMOpportunityFilters) => ({
                    ...prev,
                    stage: value as OpportunityStage,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Stages</SelectItem>
                  {Object.values(OpportunityStage).map((stage) => (
                    <SelectItem key={stage as string} value={stage as string}>
                      {(stage as string).replace("_", " ").charAt(0).toUpperCase() +
                        (stage as string).replace("_", " ").slice(1)}
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
    </div>
  );
}
