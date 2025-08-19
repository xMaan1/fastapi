"use client";
import React, { useState, useEffect } from "react";
import { apiService } from "../../services/ApiService";
import { useRouter } from "next/navigation";

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
        router.push("/dashboard");
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Create New Workspace
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Choose a plan and set up your new workspace
                </p>
              </div>
              <button
                onClick={() => router.push("/tenants")}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to Workspaces
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Plans Selection */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Choose Your Plan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedPlan === plan.id
                      ? getPlanColor(plan.planType)
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.planType.toLowerCase() === "professional" && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {plan.name}
                      </h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">
                          ${plan.price}
                        </span>
                        <span className="text-gray-500">
                          /{plan.billingCycle}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {plan.description}
                      </p>
                    </div>

                    <div className="mt-6">
                      <ul className="space-y-3">
                        {plan.maxProjects && (
                          <li className="flex items-center text-sm text-gray-600">
                            <svg
                              className="h-4 w-4 text-green-500 mr-3 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {plan.maxProjects === null
                              ? "Unlimited projects"
                              : `Up to ${plan.maxProjects} projects`}
                          </li>
                        )}
                        {plan.maxUsers && (
                          <li className="flex items-center text-sm text-gray-600">
                            <svg
                              className="h-4 w-4 text-green-500 mr-3 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {plan.maxUsers === null
                              ? "Unlimited users"
                              : `Up to ${plan.maxUsers} users`}
                          </li>
                        )}
                        {plan.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center text-sm text-gray-600"
                          >
                            <svg
                              className="h-4 w-4 text-green-500 mr-3 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {formatFeature(feature)}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {selectedPlan === plan.id && (
                      <div className="mt-4 p-2 bg-blue-100 rounded-lg text-center">
                        <span className="text-sm font-medium text-blue-800">
                          Selected
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Workspace Setup Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Workspace Details
              </h2>

              <form onSubmit={handleSubscribe} className="space-y-4">
                <div>
                  <label
                    htmlFor="tenantName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    id="tenantName"
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="My Company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="domain"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Domain (Optional)
                  </label>
                  <input
                    type="text"
                    id="domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="my-company"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to auto-generate
                  </p>
                </div>

                {selectedPlan && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">
                      Selected Plan
                    </h3>
                    {(() => {
                      const plan = plans.find((p) => p.id === selectedPlan);
                      return plan ? (
                        <div>
                          <p className="text-sm text-gray-600">{plan.name}</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ${plan.price}/{plan.billingCycle}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            14-day free trial included
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!selectedPlan || !tenantName.trim() || subscribing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                >
                  {subscribing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Workspace...
                    </div>
                  ) : (
                    "Create Workspace"
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  Start your 14-day free trial. No credit card required.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribePage;
