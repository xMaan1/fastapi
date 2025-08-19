"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users, Clock, BarChart3, UserCheck, Building, Calendar, X, Search, TrendingUp, Target, FileText, DollarSign, Briefcase, Award, GraduationCap, Clock3, ChevronDown, PieChart, FileCheck, Banknote, BookOpen,
} from "lucide-react";

interface SubMenuItem {
  text: string;
  icon: React.ElementType;
  path: string;
  roles: string[];
}

interface MenuItem {
  text: string;
  icon: React.ElementType;
  path?: string;
  roles: string[];
  subItems?: SubMenuItem[];
  gradient: string;
}

const allMenuItems: MenuItem[] = [
  {
    text: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
    roles: ["*"],
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    text: "CRM",
    icon: Users,
    roles: ["*"],
    gradient: "from-blue-500 to-indigo-500",
    subItems: [
      {
        text: "Dashboard",
        icon: LayoutDashboard,
        path: "/crm",
        roles: ["*"],
      },
      {
        text: "Companies",
        icon: Building,
        path: "/crm/companies",
        roles: ["*"],
      },
      {
        text: "Contacts",
        icon: Users,
        path: "/crm/contacts",
        roles: ["*"],
      },
      {
        text: "Leads",
        icon: Target,
        path: "/crm/leads",
        roles: ["*"],
      },
      {
        text: "Opportunities",
        icon: TrendingUp,
        path: "/crm/opportunities",
        roles: ["*"],
      },
    ],
  },
  {
    text: "Sales",
    icon: DollarSign,
    roles: ["*"],
    gradient: "from-green-500 to-emerald-500",
    subItems: [
      {
        text: "Quotes",
        icon: FileText,
        path: "/sales/quotes",
        roles: ["*"],
      },
      {
        text: "Contracts",
        icon: FileCheck,
        path: "/sales/contracts",
        roles: ["*"],
      },
      {
        text: "Analytics",
        icon: BarChart3,
        path: "/sales/analytics",
        roles: ["*"],
      },
    ],
  },
  {
    text: "HRM",
    icon: UserCheck,
    roles: ["*"],
    gradient: "from-purple-500 to-pink-500",
    subItems: [
      {
        text: "Employees",
        icon: Users,
        path: "/hrm/employees",
        roles: ["*"],
      },
      {
        text: "Job Postings",
        icon: Briefcase,
        path: "/hrm/job-postings",
        roles: ["*"],
      },
      {
        text: "Performance Reviews",
        icon: Award,
        path: "/hrm/performance-reviews",
        roles: ["*"],
      },
      {
        text: "Time Tracking",
        icon: Clock3,
        path: "/time-tracking",
        roles: ["*"],
      },
      {
        text: "Leave Management",
        icon: Calendar,
        path: "/hrm/leave-management",
        roles: ["*"],
      },
      {
        text: "Training",
        icon: GraduationCap,
        path: "/hrm/training",
        roles: ["*"],
      },
      {
        text: "Payroll",
        icon: Banknote,
        path: "/hrm/payroll",
        roles: ["*"],
      },
    ],
  },
  {
    text: "Project Management",
    icon: FolderOpen,
    roles: ["*"],
    gradient: "from-orange-500 to-red-500",
    subItems: [
      {
        text: "Projects",
        icon: FolderOpen,
        path: "/projects",
        roles: ["*"],
      },
      {
        text: "Tasks",
        icon: CheckSquare,
        path: "/tasks",
        roles: ["*"],
      },
      {
        text: "Team Members",
        icon: Users,
        path: "/team",
        roles: ["*"],
      },
      {
        text: "Time Tracking",
        icon: Clock,
        path: "/time-tracking",
        roles: ["*"],
      },
      {
        text: "Reports",
        icon: PieChart,
        path: "/reports",
        roles: ["*"],
      },
    ],
  },
  {
    text: "Events",
    icon: Calendar,
    path: "/events",
    roles: ["*"],
    gradient: "from-indigo-500 to-blue-500",
  },
];

export default function Sidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const pathname = usePathname();

  const toggleExpanded = (itemText: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemText)) {
      newExpanded.delete(itemText);
    } else {
      newExpanded.add(itemText);
    }
    setExpandedItems(newExpanded);
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return allMenuItems;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allMenuItems.filter((item) => {
      // Check if main item matches
      if (item.text.toLowerCase().includes(query)) {
        return true;
      }
      // Check if any sub-item matches
      if (item.subItems) {
        return item.subItems.some((subItem) =>
          subItem.text.toLowerCase().includes(query)
        );
      }
      return false;
    });

    // Auto-expand items that have matching sub-items
    const newExpanded = new Set(expandedItems);
    filtered.forEach((item) => {
      if (item.subItems && item.subItems.some((subItem) =>
        subItem.text.toLowerCase().includes(query)
      )) {
        newExpanded.add(item.text);
      }
    });
    setExpandedItems(newExpanded);

    return filtered;
  }, [searchQuery, expandedItems]);

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border-r border-gray-200 shadow-xl w-64 h-screen flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-center">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TestApi
          </h2>
        </div>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search modules and pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-500">
            Searching modules and pages...
          </div>
        )}
      </div>

      <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isExpanded = expandedItems.has(item.text);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isMainItemActive = item.path && isActive(item.path);
          const hasActiveSubItem = hasSubItems && item.subItems!.some((subItem) => isActive(subItem.path));

          return (
            <div key={item.text} className="space-y-1">
              {item.path ? (
                <Link
                  href={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                    isMainItemActive
                      ? "bg-gradient-to-r " + item.gradient + " text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isMainItemActive
                        ? "bg-white/20"
                        : "bg-gray-100 group-hover:bg-gray-200"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-colors",
                        isMainItemActive ? "text-white" : "text-gray-600"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "font-medium transition-colors flex-1",
                      isMainItemActive ? "text-white" : "text-gray-700"
                    )}
                  >
                    {item.text}
                  </span>
                  {isMainItemActive && !hasSubItems && (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </Link>
              ) : (
                <button
                  onClick={() => toggleExpanded(item.text)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                    hasActiveSubItem
                      ? "bg-gradient-to-r " + item.gradient + " text-white shadow-lg"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        hasActiveSubItem
                          ? "bg-white/20"
                          : "bg-gray-100 group-hover:bg-gray-200"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 transition-colors",
                          hasActiveSubItem ? "text-white" : "text-gray-600"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-medium transition-colors flex-1",
                        hasActiveSubItem ? "text-white" : "text-gray-700"
                      )}
                    >
                      {item.text}
                    </span>
                  </div>
                  {hasSubItems && (
                    <div
                      className={cn(
                        "p-1 rounded transition-transform duration-200",
                        isExpanded ? "rotate-180" : "rotate-0"
                      )}
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-colors",
                          hasActiveSubItem ? "text-white" : "text-gray-500"
                        )}
                      />
                    </div>
                  )}
                </button>
              )}

              {hasSubItems && isExpanded && (
                <div className="ml-4 space-y-1 border-l-2 border-gray-200 pl-4">
                  {item.subItems!.map((subItem) => {
                    const isSubItemActive = isActive(subItem.path);
                    return (
                      <Link
                        key={subItem.text}
                        href={subItem.path}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 group",
                          isSubItemActive
                            ? "bg-blue-50 text-blue-700 border-l-2 border-blue-500"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                        )}
                      >
                        <div
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            isSubItemActive
                              ? "bg-blue-100"
                              : "bg-gray-100 group-hover:bg-gray-200"
                          )}
                        >
                          <subItem.icon
                            className={cn(
                              "h-4 w-4 transition-colors",
                              isSubItemActive ? "text-blue-600" : "text-gray-500"
                            )}
                          />
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium transition-colors",
                            isSubItemActive ? "text-blue-700" : "text-gray-600"
                          )}
                        >
                          {subItem.text}
                        </span>
                        {isSubItemActive && (
                          <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && searchQuery && (
          <div className="text-center py-8 text-gray-500">
            <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium">No matches found</p>
            <p className="text-xs mt-1">
              Try searching for module names or page titles
            </p>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-1">Powered by</p>
          <p className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            SparkCo Technologies
          </p>
        </div>
      </div>
    </div>
  );
}
