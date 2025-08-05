'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/src/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // List of public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/client-portal'];

  useEffect(() => {
    console.log('AuthGuard Debug:', { user, loading, isAuthenticated, pathname });
    
    if (!loading) {
      const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
      
      if (!isAuthenticated && !isPublicRoute) {
        console.log('Redirecting to login - not authenticated');
        router.push('/login');
      } else if (isAuthenticated && pathname === '/login') {
        console.log('Redirecting to home - already authenticated');
        router.push('/');
      } else if (isAuthenticated && !isPublicRoute) {
        console.log('User is authenticated and on protected route - allowing access');
      }
    }
  }, [isAuthenticated, loading, pathname, router, user]);

  // Show loading spinner while checking authentication
  if (loading) {
    console.log('AuthGuard showing loading spinner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For public routes, render children without authentication check
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route));
  if (isPublicRoute) {
    console.log('AuthGuard rendering public route');
    return <>{children}</>;
  }

  // For protected routes, only render if authenticated
  if (!isAuthenticated) {
    console.log('AuthGuard not authenticated, showing null');
    return null; // Will redirect to login in useEffect
  }

  console.log('AuthGuard rendering protected route content');
  return <>{children}</>;
}