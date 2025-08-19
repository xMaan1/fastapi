"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Progress } from "../../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Separator } from "../../components/ui/separator";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Filter,
  Star,
  Clock,
  Flag,
  CheckCircle2,
  Users,
  FolderOpen,
  Calendar,
  DollarSign,
  Loader2,
  RefreshCw,
  CheckSquare,
} from "lucide-react";
import { Project } from "../../models/project/Project";
import { apiService } from "../../services/ApiService";
import { useAuth } from "../../hooks/useAuth";
import { DashboardLayout } from "../../components/layout";
import { ProjectDialog } from "../../components/projects";
import {
  cn,
  getStatusColor,
  getPriorityColor,
  getInitials,
  formatDate,
} from "../../lib/utils";

export default function ProjectsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [starredProjects, setStarredProjects] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [activeTab, setActiveTab] = useState("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      fetchProjects();
    }
  }, [mounted]);

  // Filter projects based on search term, status, priority, and other filters
  useEffect(() => {
    if (!projects) return;

    let filtered = [...projects];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (project) =>
          project.name.toLowerCase().includes(search) ||
          project.description.toLowerCase().includes(search) ||
          project.projectManager.name.toLowerCase().includes(search),
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((project) => project.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(
        (project) => project.priority === priorityFilter,
      );
    }

    // Filter by tab
    if (activeTab === "my") {
      filtered = filtered.filter(
        (project) => project.projectManager.id === user?.userId,
      );
    } else if (activeTab === "starred") {
      filtered = filtered.filter((project) =>
        starredProjects.includes(project.id),
      );
    }

    // Sort projects
    switch (sortBy) {
      case "newest":
        filtered = [...filtered].sort(
          (a, b) =>
            new Date(b.createdAt || b.endDate).getTime() -
            new Date(a.createdAt || a.endDate).getTime(),
        );
        break;
      case "oldest":
        filtered = [...filtered].sort(
          (a, b) =>
            new Date(a.createdAt || a.endDate).getTime() -
            new Date(b.createdAt || b.endDate).getTime(),
        );
        break;
      case "name_asc":
        filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name_desc":
        filtered = [...filtered].sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "due_soon":
        filtered = [...filtered].sort(
          (a, b) =>
            new Date(a.endDate).getTime() - new Date(b.endDate).getTime(),
        );
        break;
      case "completion":
        filtered = [...filtered].sort(
          (a, b) => b.completionPercent - a.completionPercent,
        );
        break;
      default:
        break;
    }

    setFilteredProjects(filtered);
  }, [
    projects,
    searchTerm,
    statusFilter,
    priorityFilter,
    activeTab,
    starredProjects,
    sortBy,
    user,
  ]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await apiService.getProjects();
      setProjects(response.projects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setSelectedProject(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await apiService.deleteProject(projectToDelete.id);
        setProjects(projects.filter((p) => p.id !== projectToDelete.id));
        setDeleteDialogOpen(false);
        setProjectToDelete(null);
      } catch (error) {
        console.error("Failed to delete project:", error);
      }
    }
  };

  const handleProjectSave = (savedProject: Project) => {
    if (dialogMode === "create") {
      setProjects([...projects, savedProject]);
    } else {
      setProjects(
        projects.map((p) => (p.id === savedProject.id ? savedProject : p)),
      );
    }
  };

  const toggleStarred = (projectId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setStarredProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const canEditProject = (project: Project) => {
    return (
      user?.userRole === "super_admin" ||
      (user?.userRole === "project_manager" &&
        project.projectManager.id === user.userId)
    );
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Projects
            </h1>
            <p className="text-gray-600 mt-2">Manage and track your projects</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={fetchProjects}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            {(user?.userRole === "super_admin" ||
              user?.userRole === "project_manager") && (
              <Button onClick={handleCreateProject} className="modern-button">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="all">All Projects</TabsTrigger>
            <TabsTrigger value="my">My Projects</TabsTrigger>
            <TabsTrigger value="starred">Starred</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <Card className="modern-card mt-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search projects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Select
                    value={priorityFilter}
                    onValueChange={setPriorityFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                      setPriorityFilter("all");
                    }}
                    className="w-full"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <TabsContent value={activeTab} className="space-y-6">
            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            )}

            {/* Projects Grid */}
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="modern-card card-hover group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg font-semibold text-gray-900 flex-1 pr-2 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {project.name}
                        </CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => toggleStarred(project.id, e)}
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Star
                              className={cn(
                                "h-4 w-4",
                                starredProjects.includes(project.id)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-400",
                              )}
                            />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/projects/${project.id}`)
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/projects/${project.id}/tasks`)
                                }
                              >
                                <FolderOpen className="h-4 w-4 mr-2" />
                                Manage Tasks
                              </DropdownMenuItem>
                              {canEditProject(project) && (
                                <DropdownMenuItem
                                  onClick={() => handleEditProject(project)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Project
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canEditProject(project) && (
                                <DropdownMenuItem
                                  onClick={() => handleDeleteProject(project)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Project
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                        {project.description}
                      </p>
                    </CardHeader>

                    <CardContent className="pt-0">
                      {/* Status and Priority Badges */}
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            getStatusColor(project.status),
                          )}
                        >
                          {project.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium",
                            getPriorityColor(project.priority),
                          )}
                        >
                          {project.priority.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Progress
                          </span>
                          <span className="text-sm font-bold text-gray-900">
                            {project.completionPercent}%
                          </span>
                        </div>
                        <Progress
                          value={project.completionPercent}
                          className="h-2"
                        />
                      </div>

                      <Separator className="my-4" />

                      {/* Project Manager */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={project.projectManager.name} />
                            <AvatarFallback className="text-xs bg-gradient-primary text-white">
                              {getInitials(project.projectManager.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-600">
                            PM: {project.projectManager.name}
                          </span>
                        </div>

                        {/* Team Members */}
                        <div className="flex -space-x-2">
                          {project.teamMembers.slice(0, 3).map((member) => (
                            <Avatar
                              key={member.id}
                              className="h-6 w-6 border-2 border-white"
                            >
                              <AvatarImage src={member.name} />
                              <AvatarFallback className="text-xs bg-gradient-secondary text-white">
                                {getInitials(member.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {project.teamMembers.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">
                                +{project.teamMembers.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Project Details */}
                      <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Due: {formatDate(project.endDate)}</span>
                        </div>
                        {project.budget && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>${project.budget.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${project.id}`);
                          }}
                          className="flex-1"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${project.id}/tasks`);
                          }}
                          className="flex-1 modern-button"
                        >
                          <CheckSquare className="h-3 w-3 mr-1" />
                          View Tasks
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredProjects.length === 0 && (
              <Card className="modern-card">
                <CardContent className="p-8 text-center">
                  <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No projects found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ||
                    statusFilter !== "all" ||
                    priorityFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first project to get started"}
                  </p>
                  {(user?.userRole === "super_admin" ||
                    user?.userRole === "project_manager") && (
                    <Button
                      onClick={handleCreateProject}
                      className="modern-button"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Project
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Project Dialog */}
        <ProjectDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSave={handleProjectSave}
          project={selectedProject}
          mode={dialogMode}
        />

        {/* Delete Confirmation Dialog */}
        {deleteDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Delete Project</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Are you sure you want to delete &quot;{projectToDelete?.name}
                  &quot;? This action cannot be undone.
                </p>
              </CardContent>
              <CardContent className="flex justify-end gap-2 pt-0">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDeleteProject}>
                  Delete
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
