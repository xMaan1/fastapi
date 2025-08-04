'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Building, Users, Loader2 } from 'lucide-react';
import { apiService } from '../../../services/ApiService';

interface Tenant {
  id: string;
  name: string;
  domain?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function TenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyTenants();
      setTenants(response || []);
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTenant = (tenantId: string) => {
    apiService.setTenantId(tenantId);
    router.push(`/workspace/${tenantId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-white rounded-full shadow-lg">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Select Organization
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Choose an organization to access your workspace
          </p>
        </div>

        {/* Tenants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tenants.map((tenant) => (
            <Card 
              key={tenant.id} 
              className="modern-card card-hover cursor-pointer"
              onClick={() => handleSelectTenant(tenant.id)}
            >
              <CardHeader className="text-center">
                <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
                  <Building className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  {tenant.name}
                </CardTitle>
                {tenant.domain && (
                  <p className="text-sm text-gray-600">
                    {tenant.domain}
                  </p>
                )}
              </CardHeader>

              <CardContent className="text-center space-y-4">
                {tenant.description && (
                  <p className="text-gray-600 text-sm">
                    {tenant.description}
                  </p>
                )}

                <div className="flex justify-center">
                  <Badge 
                    variant={tenant.isActive ? "default" : "secondary"}
                    className={tenant.isActive ? "bg-green-100 text-green-800" : ""}
                  >
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <Button 
                  className="w-full modern-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTenant(tenant.id);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Access Workspace
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {tenants.length === 0 && (
          <Card className="modern-card max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Organizations Found
              </h3>
              <p className="text-gray-600 mb-4">
                You don't have access to any organizations yet.
              </p>
              <Button variant="outline" onClick={() => router.push('/plans')}>
                Create Organization
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}