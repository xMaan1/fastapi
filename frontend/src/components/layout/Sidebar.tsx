'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  Users,
  Clock,
  BarChart3,
  UserCheck,
  Building,
  CreditCard,
  Calendar,
  X,
  Search
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// Menu items by role
const allMenuItems = [
  { 
    text: 'Dashboard', 
    icon: LayoutDashboard, 
    path: '/', 
    roles: ['super_admin', 'admin', 'project_manager', 'team_member', 'client', 'viewer'],
    gradient: 'from-blue-500 to-purple-600'
  },
  { 
    text: 'Projects', 
    icon: FolderOpen, 
    path: '/projects', 
    roles: ['admin', 'project_manager', 'team_member', 'client', 'viewer', 'super_admin'],
    gradient: 'from-green-500 to-teal-600'
  },
  { 
    text: 'Events', 
    icon: Calendar, 
    path: '/events', 
    roles: ['admin', 'project_manager', 'team_member', 'client', 'viewer', 'super_admin'],
    gradient: 'from-orange-500 to-red-600'
  },
  { 
    text: 'Team', 
    icon: Users, 
    path: '/team', 
    roles: ['admin', 'project_manager', 'team_member', 'client', 'viewer', 'super_admin'],
    gradient: 'from-purple-500 to-pink-600'
  },
  { 
    text: 'Users', 
    icon: Users, 
    path: '/users', 
    roles: ['super_admin'],
    gradient: 'from-indigo-500 to-blue-600'
  },
  { 
    text: 'Tenants', 
    icon: Building, 
    path: '/tenants', 
    roles: ['super_admin'],
    gradient: 'from-gray-500 to-gray-700'
  },
  { 
    text: 'Plans', 
    icon: CreditCard, 
    path: '/plans', 
    roles: ['super_admin'],
    gradient: 'from-yellow-500 to-orange-600'
  },
  { 
    text: 'Time Tracking', 
    icon: Clock, 
    path: '/time-tracking', 
    roles: ['admin', 'project_manager', 'team_member', 'client', 'viewer', 'super_admin'],
    gradient: 'from-cyan-500 to-blue-600'
  },
  { 
    text: 'Reports', 
    icon: BarChart3, 
    path: '/reports', 
    roles: ['admin', 'project_manager', 'team_member', 'client', 'viewer', 'super_admin'],
    gradient: 'from-emerald-500 to-green-600'
  },
  { 
    text: 'Client Portal', 
    icon: UserCheck, 
    path: '/client-portal', 
    roles: ['admin', 'project_manager', 'team_member', 'client', 'viewer', 'super_admin'],
    gradient: 'from-rose-500 to-pink-600'
  },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigation = (path: string) => {
    router.push(path);
    onClose();
  };

  // Filter menu items by user role and search query
  const menuItems = useMemo(() => {
    if (!user) return [];
    const role = user.userRole;
    const filteredByRole = allMenuItems.filter(item => item.roles.includes(role));
    
    if (!searchQuery.trim()) return filteredByRole;
    
    return filteredByRole.filter(item => 
      item.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [user, searchQuery]);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" 
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-72 transform bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-xl transition-transform duration-300 ease-in-out",
        open ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0 md:static md:z-auto"
      )}>
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            
            return (
              <button
                key={item.text}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group",
                  isActive
                    ? "bg-gradient-primary text-white shadow-lg transform scale-[1.02]"
                    : "text-gray-700 hover:bg-gray-100 hover:transform hover:scale-[1.01]"
                )}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-colors",
                  isActive 
                    ? "bg-white/20" 
                    : "bg-gray-100 group-hover:bg-gray-200"
                )}>
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-white" : "text-gray-600"
                  )} />
                </div>
                <span className={cn(
                  "font-medium transition-colors",
                  isActive ? "text-white" : "text-gray-700"
                )}>
                  {item.text}
                </span>
                {isActive && (
                  <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
          
          {menuItems.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No menu items found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Powered by</p>
            <p className="text-sm font-semibold bg-gradient-primary bg-clip-text text-transparent">
              SparkCo Technologies
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}