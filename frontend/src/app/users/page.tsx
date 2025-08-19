"use client";

import React from "react";
import Link from "next/link";
import { Button } from "../../components/ui/button";
import { Home } from "lucide-react";
import { UsersList } from "../../components/users";
import { DashboardLayout } from "../../components/layout";

export default function UsersPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="icon">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-gray-600">Manage system users and permissions</p>
          </div>
        </div>

        <UsersList />
      </div>
    </DashboardLayout>
  );
}
