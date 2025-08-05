'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import {
  TrendingUp,
  FolderOpen,
  Users,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Star,
  BarChart3,
  Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/ApiService';
import { Project } from '../models/project/Project';
import { DashboardLayout } from '../components/layout';

import { cn, getStatusColor, getInitials, formatDate } from '../lib/utils';

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTeamMembers: number;
  averageProgress: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTeamMembers: 0,
    averageProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [starredProjects, setStarredProjects] = useState<string[]>([]);

  useEffect(() => {
    // AuthGuard ensures user is authenticated, so we can directly fetch data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projectsResponse, usersResponse] = await Promise.all([
        apiService.getProjects(),
        apiService.getUsers().catch(() => ({ users: [] }))
      ]);

      const projectsData = projectsResponse.projects || [];
      const usersData = usersResponse.users || [];

      setProjects(projectsData);

      // Calculate stats
      const totalProjects = projectsData.length;
      const activeProjects = projectsData.filter((p: Project) => p.status === 'in_progress').length;
      const completedProjects = projectsData.filter((p: Project) => p.status === 'completed').length;
      const totalTeamMembers = usersData.length;
      const averageProgress = totalProjects > 0
        ? Math.round(projectsData.reduce((sum: number, p: Project) => sum + p.completionPercent, 0) / totalProjects)
        : 0;

      setStats({
        totalProjects,
        activeProjects,
        completedProjects,
        totalTeamMembers,
        averageProgress,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStarred = (projectId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setStarredProjects(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const recentProjects = projects
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 6);

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
        {/* Welcome Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome back, {user?.firstName || user?.userName}!
            </h1>
            <p className="text-gray-600 mt-2">
              Here's what's happening with your projects today.
            </p>
          </div>
          <Button
            onClick={() => router.push('/projects')}
            className="modern-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProjects}</p>
                  <p className="text-sm text-gray-600">Total Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProjects}</p>
                  <p className="text-sm text-gray-600">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTeamMembers}</p>
                  <p className="text-sm text-gray-600">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="modern-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.averageProgress}%</p>
                  <p className="text-sm text-gray-600">Avg Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card className="modern-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Recent Projects
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/projects')}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </h3>
                        <Badge variant="outline" className={cn("text-xs", getStatusColor(project.status))}>
                          {project.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => toggleStarred(project.id, e)}
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Star className={cn(
                          "h-4 w-4",
                          starredProjects.includes(project.id)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-400"
                        )} />
                      </Button>
                    </div>

                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {project.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <Avatar className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={project.projectManager.name} />
                            <AvatarFallback className="text-xs bg-gradient-primary text-white">
                              {getInitials(project.projectManager.name)}
                            </AvatarFallback>
                          </Avatar>
                          {project.teamMembers.slice(0, 2).map((member) => (
                            <Avatar key={member.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={member.name} />
                              <AvatarFallback className="text-xs bg-gradient-secondary text-white">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {project.teamMembers.length > 2 && (
                            <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{project.teamMembers.length - 2}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          Due: {formatDate(project.endDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600">{project.completionPercent}%</span>
                        <Progress value={project.completionPercent} className="w-16 h-2" />
                      </div>
                    </div>
                  </div>
                ))}

                {recentProjects.length === 0 && (
                  <div className="text-center py-8">
                    <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No projects yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Create your first project to get started
                    </p>
                    <Button
                      onClick={() => router.push('/projects')}
                      className="modern-button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


        </div>

        {/* Quick Actions */}
        <Card className="modern-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/projects')}
              >
                <FolderOpen className="h-6 w-6" />
                <span>Manage Projects</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => router.push('/team')}
              >
                <Users className="h-6 w-6" />
                <span>Team Management</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}