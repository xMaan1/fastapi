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
import { UserPlus, Search, Filter } from "lucide-react";
import HRMService from "@/src/services/HRMService";
import {
  Employee,
  Department,
  EmploymentStatus,
  EmployeeType,
} from "@/src/models/hrm";
import Link from "next/link";
import { DashboardLayout } from "@/src/components/layout";

export default function HRMEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department: "",
    status: "",
    employeeType: "",
    search: "",
  });

  useEffect(() => {
    loadEmployees();
  }, [filters]);

  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const response = await HRMService.getEmployees(filters);
      setEmployees(response.employees);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev: any) => ({
      ...prev,
      [key]: value === "all" ? undefined : value,
    }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading employees...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-6">
          <div className="text-center">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <Button onClick={loadEmployees}>Retry</Button>
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
            <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
            <p className="text-gray-600">Manage your workforce</p>
          </div>
          <Button asChild>
            <Link href="/hrm/employees/new">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Search employees..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Department
                </label>
                <Select
                  value={filters.department || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("department", value)
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
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => handleFilterChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.values(EmploymentStatus).map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select
                  value={filters.employeeType || "all"}
                  onValueChange={(value) =>
                    handleFilterChange("employeeType", value)
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
            </div>
          </CardContent>
        </Card>

        {/* Employees List */}
        <Card>
          <CardHeader>
            <CardTitle>Employee List</CardTitle>
            <CardDescription>
              {employees.length} employee{employees.length !== 1 ? "s" : ""}{" "}
              found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {employees.map((employee) => (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {employee.firstName[0]}
                      {employee.lastName[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-gray-600">{employee.position}</div>
                      <div className="text-sm text-gray-500">
                        {employee.email} • {employee.phone}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium">{employee.employeeId}</div>
                      <div className="text-sm text-gray-500">
                        {employee.department}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge
                        className={HRMService.getEmploymentStatusColor(
                          employee.employmentStatus,
                        )}
                      >
                        {employee.employmentStatus}
                      </Badge>
                      <Badge
                        className={HRMService.getEmployeeTypeColor(
                          employee.employeeType,
                        )}
                      >
                        {employee.employeeType.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
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
