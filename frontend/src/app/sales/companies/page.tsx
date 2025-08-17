'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Textarea } from '../../../components/ui/textarea';
import { useApiService } from '../../../hooks/useApiService';
import { DashboardLayout } from '../../../components/layout';
import { Company, CompanyType, CompanyIndustry } from '../../../models/sales';
import { Contact } from '../../../models/sales';
import { Opportunity } from '../../../models/sales';
import { Plus, Search, Building, Users, DollarSign, MapPin, Globe, Phone, Mail } from 'lucide-react';

export default function CompaniesPage() {
  const apiService = useApiService();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: CompanyType.CUSTOMER,
    industry: CompanyIndustry.TECHNOLOGY,
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    description: '',
    annualRevenue: '',
    employeeCount: '',
    notes: '',
    tags: ''
  });

  useEffect(() => {
    loadCompanies();
    loadContacts();
    loadOpportunities();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCompanies();
      setCompanies(response.companies || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await apiService.getContacts();
      setContacts(response.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadOpportunities = async () => {
    try {
      const response = await apiService.getOpportunities();
      setOpportunities(response.opportunities || []);
    } catch (error) {
      console.error('Error loading opportunities:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name.trim()) {
      alert('Company name is required');
      return;
    }

    try {
      if (editingCompany) {
        await apiService.updateCompany(editingCompany.id, {
          ...formData,
          annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : null,
          employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
        });
      } else {
        await apiService.createCompany({
          ...formData,
          annualRevenue: formData.annualRevenue ? parseFloat(formData.annualRevenue) : null,
          employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null,
          tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
        });
      }
      
      setShowCreateDialog(false);
      setEditingCompany(null);
      resetForm();
      loadCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Error saving company. Please try again.');
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      type: company.type,
      industry: company.industry || CompanyIndustry.OTHER,
      website: company.website || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zipCode: company.zipCode || '',
      country: company.country || '',
      description: company.description || '',
      annualRevenue: company.annualRevenue?.toString() || '',
      employeeCount: company.employeeCount?.toString() || '',
      notes: company.notes || '',
      tags: company.tags ? company.tags.join(', ') : ''
    });
    setShowCreateDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      try {
        await apiService.deleteCompany(id);
        loadCompanies();
      } catch (error) {
        console.error('Error deleting company:', error);
        alert('Error deleting company. Please try again.');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: CompanyType.CUSTOMER,
      industry: CompanyIndustry.TECHNOLOGY,
      website: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      description: '',
      annualRevenue: '',
      employeeCount: '',
      notes: '',
      tags: ''
    });
  };

  const getTypeColor = (type: CompanyType) => {
    const colors = {
      [CompanyType.CUSTOMER]: 'bg-green-100 text-green-800',
      [CompanyType.PROSPECT]: 'bg-blue-100 text-blue-800',
      [CompanyType.PARTNER]: 'bg-purple-100 text-purple-800',
      [CompanyType.VENDOR]: 'bg-orange-100 text-orange-800',
      [CompanyType.COMPETITOR]: 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getIndustryColor = (industry: CompanyIndustry) => {
    const colors: Record<CompanyIndustry, string> = {
      [CompanyIndustry.TECHNOLOGY]: 'bg-blue-100 text-blue-800',
      [CompanyIndustry.HEALTHCARE]: 'bg-green-100 text-green-800',
      [CompanyIndustry.FINANCE]: 'bg-purple-100 text-purple-800',
      [CompanyIndustry.MANUFACTURING]: 'bg-orange-100 text-orange-800',
      [CompanyIndustry.RETAIL]: 'bg-red-100 text-red-800',
      [CompanyIndustry.EDUCATION]: 'bg-indigo-100 text-indigo-800',
      [CompanyIndustry.REAL_ESTATE]: 'bg-yellow-100 text-yellow-800',
      [CompanyIndustry.CONSULTING]: 'bg-cyan-100 text-cyan-800',
      [CompanyIndustry.OTHER]: 'bg-gray-100 text-gray-800'
    };
    return colors[industry] || 'bg-gray-100 text-gray-800';
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || company.type === typeFilter;
    const matchesIndustry = industryFilter === 'all' || company.industry === typeFilter;
    
    return matchesSearch && matchesType && matchesIndustry;
  });

  const totalCompanies = filteredCompanies.length;
  const customerCompanies = filteredCompanies.filter(c => c.type === CompanyType.CUSTOMER).length;
  const prospectCompanies = filteredCompanies.filter(c => c.type === CompanyType.PROSPECT).length;

  const getCompanyStats = (companyId: string) => {
    const companyContacts = contacts.filter(c => c.companyId === companyId).length;
    const companyOpportunities = opportunities.filter(o => o.companyId === companyId);
    const totalValue = companyOpportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
    
    return { contacts: companyContacts, opportunities: companyOpportunities.length, totalValue };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading companies...</div>
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
            <h1 className="text-3xl font-bold">Sales Companies</h1>
            <p className="text-gray-600">Manage your company accounts and relationships</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Company
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCompanies}</div>
              <p className="text-xs text-muted-foreground">
                All companies in system
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerCompanies}</div>
              <p className="text-xs text-muted-foreground">
                Current customers
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prospects</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prospectCompanies}</div>
              <p className="text-xs text-muted-foreground">
                Potential customers
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
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {Object.values(CompanyType).map(type => (
                      <SelectItem key={type as string} value={type as string}>
                        {(type as string).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="industry">Industry</Label>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All industries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All industries</SelectItem>
                    {Object.values(CompanyIndustry).map(industry => (
                      <SelectItem key={industry as string} value={industry as string}>
                        {(industry as string).replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Companies List */}
        <Card>
          <CardHeader>
            <CardTitle>Companies</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCompanies.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No companies found. Create your first company to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredCompanies.map((company) => {
                  const stats = getCompanyStats(company.id);
                  return (
                    <div key={company.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{company.name}</h3>
                            <Badge className={getTypeColor(company.type)}>
                              {company.type.replace('_', ' ')}
                            </Badge>
                            <Badge className={getIndustryColor(company.industry || CompanyIndustry.OTHER)}>
                              {(company.industry || CompanyIndustry.OTHER).replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          {company.description && (
                            <p className="text-gray-600 mb-3">{company.description}</p>
                          )}
                          
                          <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                            {company.website && (
                              <div className="flex items-center gap-1">
                                <Globe className="w-4 h-4" />
                                {company.website}
                              </div>
                            )}
                            {company.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {company.phone}
                              </div>
                            )}
                            {company.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {company.email}
                              </div>
                            )}
                          </div>
                          
                          {(company.address || company.city || company.state) && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                              <MapPin className="w-4 h-4" />
                              {[company.address, company.city, company.state, company.zipCode, company.country]
                                .filter(Boolean).join(', ')}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {stats.contacts} contacts
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {stats.opportunities} opportunities
                            </div>
                            {stats.totalValue > 0 && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${stats.totalValue.toLocaleString()} pipeline
                              </div>
                            )}
                            {company.annualRevenue && (
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${company.annualRevenue.toLocaleString()} revenue
                              </div>
                            )}
                            {company.employeeCount && (
                              <div className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {company.employeeCount} employees
                              </div>
                            )}
                          </div>
                          
                          {company.tags && company.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {company.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {company.notes && (
                            <p className="text-sm text-gray-600">{company.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(company)}>
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(company.id)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCompany ? 'Edit Company' : 'Create New Company'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Company Type</Label>
                  <Select value={formData.type} onValueChange={(value: string) => setFormData({ ...formData, type: value as CompanyType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CompanyType).map((type) => (
                        <SelectItem key={type as string} value={type as string}>
                          {(type as string).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value: string) => setFormData({ ...formData, industry: value as CompanyIndustry })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CompanyIndustry).map((industry) => (
                        <SelectItem key={industry as string} value={industry as string}>
                          {(industry as string).replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="annualRevenue">Annual Revenue</Label>
                  <Input
                    id="annualRevenue"
                    type="number"
                    value={formData.annualRevenue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, annualRevenue: e.target.value })}
                    placeholder="1000000"
                  />
                </div>
                
                <div>
                  <Label htmlFor="employeeCount">Employee Count</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, employeeCount: e.target.value })}
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  placeholder="Company description..."
                />
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3 (comma separated)"
                />
              </div>
              
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setShowCreateDialog(false);
                  setEditingCompany(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingCompany ? 'Update' : 'Create'} Company
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}


