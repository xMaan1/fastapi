"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // List of public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/client-portal"];

  useEffect(() => {
    if (!loading) {
      const isPublicRoute = publicRoutes.some((route) =>
        pathname?.startsWith(route),
      );

      if (!isAuthenticated && !isPublicRoute) {
        router.push("/login");
      } else if (isAuthenticated && pathname === "/login") {
        router.push("/");
      }
    }
  }, [isAuthenticated, loading, pathname, router, user]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Initializing...</p>
          <p className="text-sm text-gray-500">
            Please wait while we verify your session
          </p>
        </div>
      </div>
    );
  }

  // For public routes, render children without authentication check
  const isPublicRoute = publicRoutes.some((route) =>
    pathname?.startsWith(route),
  );
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For protected routes, only render if authenticated
  if (!isAuthenticated) {
    // Show a brief loading state before redirect to prevent flash
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
