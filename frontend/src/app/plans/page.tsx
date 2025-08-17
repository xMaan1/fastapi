'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Check,
  Star,
  Building,
  Loader2,
  Crown,
  Zap
} from 'lucide-react';
import { apiService } from '../../services/ApiService';
import { DashboardLayout } from '../../components/layout';

interface Plan {
  id: string;
  name: string;
  description: string;
  planType: string;
  price: number;
  billingCycle: string;
  maxProjects?: number;
  maxUsers?: number;
  features: string[];
  isActive: boolean;
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPlans();
      setPlans(response.plans || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      // Navigate to subscription page
      router.push(`/pages/subscribe?planId=${planId}`);
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  const getPlanIcon = (planType: string) => {
    switch (planType.toLowerCase()) {
      case 'starter':
        return <Building className="h-6 w-6" />;
      case 'professional':
        return <Star className="h-6 w-6" />;
      case 'enterprise':
        return <Crown className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType.toLowerCase()) {
      case 'starter':
        return 'bg-blue-100 text-blue-600';
      case 'professional':
        return 'bg-purple-100 text-purple-600';
      case 'enterprise':
        return 'bg-gold-100 text-gold-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            Select the perfect plan for your organization&apos;s needs
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`modern-card card-hover relative ${
                plan.planType === 'professional' ? 'ring-2 ring-purple-500 ring-opacity-50' : ''
              }`}
            >
              {plan.planType === 'professional' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-purple-600 text-white px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className={`inline-flex p-3 rounded-full ${getPlanColor(plan.planType)} mb-4`}>
                  {getPlanIcon(plan.planType)}
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  {plan.name}
                </CardTitle>
                <p className="text-gray-600 mt-2">
                  {plan.description}
                </p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600">
                    /{plan.billingCycle}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Plan Limits */}
                <div className="space-y-2">
                  {plan.maxProjects && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.maxProjects === -1 ? 'Unlimited' : plan.maxProjects} Projects
                      </span>
                    </div>
                  )}
                  {plan.maxUsers && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>
                        {plan.maxUsers === -1 ? 'Unlimited' : plan.maxUsers} Users
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span>{feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Button */}
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  className={`w-full ${
                    plan.planType === 'professional' 
                      ? 'modern-button' 
                      : 'bg-gray-900 hover:bg-gray-800 text-white'
                  }`}
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {plans.length === 0 && !loading && (
          <Card className="modern-card">
            <CardContent className="p-8 text-center">
              <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No plans available
              </h3>
              <p className="text-gray-600 mb-4">
                Plans are currently being configured. Please check back later.
              </p>
              <Button variant="outline" onClick={fetchPlans}>
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contact Section */}
        <Card className="modern-card">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Need a Custom Solution?
            </h3>
            <p className="text-gray-600 mb-4">
              Contact our sales team for enterprise pricing and custom features.
            </p>
            <Button variant="outline">
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}