'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { Button } from '../../../components/ui/button';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Badge } from '../../../components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '../../../components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Separator } from '../../../components/ui/separator';
import {
  Menu as MenuIcon,
  Building2,
  LogOut,
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings
} from 'lucide-react';

interface TenantLayoutProps {
  children: React.ReactNode;
}

interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  user_role: string;
}

const TenantLayout: React.FC<TenantLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.tenantId ? (params.tenantId as string) : '';

  useEffect(() => {
    fetchTenantInfo();
    loadUserInfo();
  }, [tenantId]);

  const fetchTenantInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(`http://localhost:8000/api/tenants/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setTenantInfo(response.data);
    } catch (error) {
      console.error('Error fetching tenant info:', error);
      router.push('/');
    }
  };

  const loadUserInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      setUser(JSON.parse(userStr));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedTenant');
    router.push('/login');
  };

  const handleSwitchWorkspace = () => {
    router.push('/');
  };

  const sidebarContent = (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 bg-gradient-primary">
            <AvatarFallback className="bg-gradient-primary text-white font-semibold">
              {tenantInfo?.name?.charAt(0).toUpperCase() || 'W'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate">
              {tenantInfo?.name || 'Workspace'}
            </h3>
            <Badge variant="secondary" className="mt-1 text-xs">
              {tenantInfo?.user_role || 'member'}
            </Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link href={`/workspace/${tenantId}`} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        <Link href={`/projects`} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
          <FolderOpen className="h-5 w-5" />
          <span className="text-sm font-medium">Projects</span>
        </Link>
        <Link href={`/team`} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">Team</span>
        </Link>

        {/* Only show these for super_admin */}
        {user?.userRole === 'super_admin' && (
          <>
            <Separator className="my-4" />
            <Link href={`/users`} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Users</span>
            </Link>
            <Link href={`/pages/tenants`} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
              <Building2 className="h-5 w-5" />
              <span className="text-sm font-medium">Tenants</span>
            </Link>
          </>
        )}

        <Separator className="my-4" />
        <Link href={`/workspace/${tenantId}/settings`} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
          <Settings className="h-5 w-5" />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </nav>
    </div>
  );

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Desktop Sidebar - Static part of layout, not fixed */}
      <div className="hidden lg:block w-64 flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-64">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon className="h-5 w-5" />
              </Button>

              <h1 className="text-xl font-semibold text-gray-900">
                {tenantInfo?.name || 'Workspace'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleSwitchWorkspace}
                className="hidden sm:flex items-center space-x-2"
              >
                <Building2 className="h-4 w-4" />
                <span>Switch Workspace</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gradient-primary text-white text-sm">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium text-gray-700">
                      {user?.username || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content - Scrollable */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TenantLayout;