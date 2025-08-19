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
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Building2,
} from "lucide-react";
import CRMService from "@/src/services/CRMService";
import {
  Contact,
  ContactType,
  CRMContactFilters,
} from "@/src/models/crm";

export default function CRMContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CRMContactFilters>({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadContacts();
  }, [filters]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const response = await CRMService.getContacts(filters, 1, 100);
      setContacts(response.contacts);
    } catch (err) {
      console.error("Contacts load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters((prev: CRMContactFilters) => ({ ...prev, search }));
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
          <p className="mt-4 text-lg">Loading Contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">CRM Contacts</h1>
          <p className="text-gray-600">
            Manage your customer contacts and relationships
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Contact
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
                  placeholder="Search contacts..."
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
              <label className="text-sm font-medium">Type</label>
              <Select
                value={filters.type}
                onValueChange={(value) =>
                  setFilters((prev: CRMContactFilters) => ({
                    ...prev,
                    type: value as ContactType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {Object.values(ContactType).map((type) => (
                    <SelectItem key={type as string} value={type as string}>
                      {(type as string).charAt(0).toUpperCase() + (type as string).slice(1)}
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

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
          <CardDescription>
            Manage your customer contacts and track interactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-gray-500" />
                      <div>
                        <div className="font-medium">
                          {contact.firstName} {contact.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {contact.email}
                        </div>
                      </div>
                    </div>
                    {contact.companyId && (
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <Building2 className="w-4 h-4" />
                        <span>Company ID: {contact.companyId}</span>
                      </div>
                    )}
                    {contact.jobTitle && (
                      <span className="text-sm text-gray-500">
                        {contact.jobTitle}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline">
                      {contact.type.charAt(0).toUpperCase() +
                        contact.type.slice(1)}
                    </Badge>
                    <Badge variant={contact.isActive ? "default" : "secondary"}>
                      {contact.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {contact.notes && (
                    <div className="text-sm text-gray-600 mt-2">
                      {contact.notes}
                    </div>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span>
                      Created: {CRMService.formatDate(contact.createdAt)}
                    </span>
                    {contact.lastContactDate && (
                      <span>
                        Last Contact:{" "}
                        {CRMService.formatDate(contact.lastContactDate)}
                      </span>
                    )}
                    {contact.nextFollowUpDate && (
                      <span>
                        Next Follow-up:{" "}
                        {CRMService.formatDate(contact.nextFollowUpDate)}
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
  );
}
