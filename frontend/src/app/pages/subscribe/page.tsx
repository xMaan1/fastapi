"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "@/src/services/ApiService";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { Loader2, Check, ArrowLeft, Star } from "lucide-react";

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

const SubscribePage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("");
  const [domain, setDomain] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadPlans();
    // Pre-select plan from query parameter (app directory: use URLSearchParams)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const plan = params.get("plan");
      if (plan) setSelectedPlan(plan);
    }
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getPlans();
      setPlans(response.plans || []);
    } catch (err: any) {
      console.error("Failed to load plans:", err);
      setError(err.message || "Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlan || !tenantName.trim()) {
      setError("Please select a plan and enter a workspace name");
      return;
    }

    try {
      setSubscribing(true);
      setError(null);

      const subscriptionData = {
        planId: selectedPlan,
        tenantName: tenantName.trim(),
        domain: domain.trim() || undefined,
      };

      const response = await apiService.subscribeToPlan(subscriptionData);

      if (response.success) {
        // Set the new tenant as active
        apiService.setTenantId(response.tenant.id);

        // Redirect to dashboard
        router.push("/");
      } else {
        setError(response.message || "Failed to create workspace");
      }
    } catch (err: any) {
      console.error("Subscription failed:", err);
      setError(err.message || "Failed to create workspace");
    } finally {
      setSubscribing(false);
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType.toLowerCase()) {
      case "starter":
        return "border-green-200 bg-green-50";
      case "professional":
        return "border-blue-200 bg-blue-50 ring-2 ring-blue-500";
      case "enterprise":
        return "border-purple-200 bg-purple-50";
      default:
        return "border-gray-200 bg-white";
    }
  };

  const formatFeature = (feature: string) => {
    return feature
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Create New Workspace
            </h1>
            <p className="text-gray-600 mt-1">
              Choose a plan and set up your new workspace
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push("/tenants")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Workspaces</span>
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {Array.isArray(error)
                ? error.map((e, i) => (
                    <div key={i}>{e.msg || JSON.stringify(e)}</div>
                  ))
                : typeof error === "object"
                  ? JSON.stringify(error)
                  : error}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Plans Selection */}
          <div className="lg:col-span-3">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Choose Your Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedPlan === plan.id
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : "hover:shadow-md"
                  } ${plan.planType.toLowerCase() === "professional" ? "border-blue-200" : ""}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.planType.toLowerCase() === "professional" && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-primary text-white px-3 py-1 flex items-center space-x-1">
                        <Star className="h-3 w-3" />
                        <span>Most Popular</span>
                      </Badge>
                    </div>
                  )}

                  <CardContent className="p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline justify-center mb-2">
                      <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 ml-1">
                        /{plan.billingCycle}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      {plan.description}
                    </p>

                    <div className="space-y-2 text-left">
                      {plan.maxProjects && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{plan.maxProjects} projects</span>
                        </div>
                      )}
                      {plan.maxUsers && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{plan.maxUsers} users</span>
                        </div>
                      )}
                      {plan.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-2 text-sm text-gray-600"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                          <span>{formatFeature(feature)}</span>
                        </div>
                      ))}
                    </div>

                    {selectedPlan === plan.id && (
                      <div className="mt-4 p-2 bg-blue-50 rounded-lg">
                        <span className="text-blue-600 text-sm font-medium">
                          ✓ Selected
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Workspace Setup Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 modern-card">
              <CardHeader>
                <CardTitle>Workspace Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tenantName">Workspace Name *</Label>
                    <Input
                      id="tenantName"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="My Company"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="domain">Domain (Optional)</Label>
                    <Input
                      id="domain"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="my-company"
                    />
                    <p className="text-xs text-gray-500">
                      Leave empty to auto-generate
                    </p>
                  </div>

                  {selectedPlan && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <h4 className="font-semibold text-gray-900">
                        Selected Plan
                      </h4>
                      {(() => {
                        const plan = plans.find((p) => p.id === selectedPlan);
                        return plan ? (
                          <>
                            <p className="text-sm text-gray-600">{plan.name}</p>
                            <p className="text-lg font-bold text-gray-900">
                              ${plan.price}/{plan.billingCycle}
                            </p>
                            <p className="text-xs text-gray-500">
                              14-day free trial included
                            </p>
                          </>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={
                      !selectedPlan || !tenantName.trim() || subscribing
                    }
                    className="w-full modern-button"
                  >
                    {subscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Workspace...
                      </>
                    ) : (
                      "Create Workspace"
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Start your 14-day free trial. No credit card required.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribePage;
