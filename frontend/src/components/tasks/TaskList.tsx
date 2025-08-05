'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { TaskCard } from './TaskCard';
import { TaskDialog } from './TaskDialog';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Filter,
  Loader2,
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { Task, TaskCreate, TaskUpdate, TaskStatus, TaskPriority, SubTask } from '../../models/task';
import { Project } from '../../models/project/Project';
import { User } from '../../models/auth';
import { apiService } from '../../services/ApiService';
import { cn } from '../../lib/utils';

interface TaskListProps {
  projectId?: string;
  showProjectFilter?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  projectId,
  showProjectFilter = true
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    project: projectId || '',
    status: '',
    assignedTo: '',
    search: '',
    mainTasksOnly: false
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const limit = 10;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [filters, page]);

  const loadInitialData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        apiService.getProjects(),
        apiService.getUsers()
      ]);
      
      setProjects(projectsRes.projects || []);
      setUsers(usersRes.users || []);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError('Failed to load projects and users');
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        includeSubtasks: true,
        mainTasksOnly: filters.mainTasksOnly,
        ...(filters.project && { project: filters.project }),
        ...(filters.status && { status: filters.status }),
        ...(filters.assignedTo && { assignedTo: filters.assignedTo })
      };

      const response = await apiService.getTasks(params);
      
      // Handle different response structures
      let filteredTasks = [];
      if (Array.isArray(response)) {
        // If response is directly an array
        filteredTasks = response;
      } else if (response.tasks && Array.isArray(response.tasks)) {
        // If response has tasks property
        filteredTasks = response.tasks;
      } else if (response.data && Array.isArray(response.data)) {
        // If response has data property
        filteredTasks = response.data;
      } else {
        console.warn('Unexpected response structure:', response);
        filteredTasks = [];
      }
      
      // Apply search filter on frontend
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTasks = filteredTasks.filter((task: Task) =>
          (task.title && task.title.toLowerCase().includes(searchLower)) ||
          (task.description && task.description.toLowerCase().includes(searchLower)) ||
          (Array.isArray(task.tags) && task.tags.some((tag: string) => tag && tag.toLowerCase().includes(searchLower)))
        );
      }

      setTasks(filteredTasks);
      setTotalPages(response.pagination?.pages || 1);
      setTotalTasks(response.pagination?.total || filteredTasks.length);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setParentTask(null);
    setDialogError(null);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setParentTask(null);
    setDialogError(null);
    setTaskDialogOpen(true);
  };

  const handleAddSubtask = (parentTaskId: string) => {
    const parent = tasks.find(t => t.id === parentTaskId);
    if (parent) {
      setEditingTask(null);
      setParentTask(parent);
      setDialogError(null);
      setTaskDialogOpen(true);
    }
  };

  const handleEditSubtask = (subtask: SubTask) => {
    // Convert subtask to task format for editing
    const taskForEdit: Task = {
      ...subtask,
      project: tasks.find(t => t.subtasks.some(s => s.id === subtask.id))?.project || '',
      subtasks: [],
      subtaskCount: 0,
      completedSubtaskCount: 0
    };
    setEditingTask(taskForEdit);
    setParentTask(null);
    setDialogError(null);
    setTaskDialogOpen(true);
  };

  const handleTaskSubmit = async (data: TaskCreate | TaskUpdate) => {
    try {
      setDialogLoading(true);
      setDialogError(null);

      if (editingTask) {
        // Update existing task or subtask
        await apiService.updateTask(editingTask.id, data);
      } else if (parentTask) {
        // Create subtask
        await apiService.createSubtask(parentTask.id, data);
      } else {
        // Create new task
        await apiService.createTask(data);
      }

      setTaskDialogOpen(false);
      setEditingTask(null);
      setParentTask(null);
      await loadTasks();
    } catch (err: any) {
      console.error('Failed to save task:', err);
      setDialogError(err.response?.data?.detail || 'Failed to save task');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await apiService.deleteTask(taskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task');
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      await apiService.deleteTask(subtaskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete subtask:', err);
      setError('Failed to delete subtask');
    }
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    try {
      await apiService.updateTask(taskId, { status });
      await loadTasks();
    } catch (err) {
      console.error('Failed to update task status:', err);
      setError('Failed to update task status');
    }
  };

  const handleFilterChange = (field: string, value: string | boolean) => {
    // Convert "all" values to empty strings for filtering
    const filterValue = value === 'all' ? '' : value;
    setFilters(prev => ({ ...prev, [field]: filterValue }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      project: projectId || '',
      status: '',
      assignedTo: '',
      search: '',
      mainTasksOnly: false
    });
    setPage(1);
  };

  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const inProgressTasks = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const todoTasks = tasks.filter(t => t.status === TaskStatus.TODO).length;
    
    return { totalTasks, completedTasks, inProgressTasks, todoTasks };
  };

  const taskStats = getTaskStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Tasks
          </h1>
          {totalTasks > 0 && (
            <p className="text-gray-600 mt-1">
              {totalTasks} tasks total
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={loadTasks}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            onClick={handleCreateTask}
            className="modern-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.totalTasks}</p>
                <p className="text-sm text-gray-600">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.completedTasks}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <PlayCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.inProgressTasks}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{taskStats.todoTasks}</p>
                <p className="text-sm text-gray-600">To Do</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="modern-card">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {showProjectFilter && (
              <div>
                <Select
                  value={filters.project || 'all'}
                  onValueChange={(value) => handleFilterChange('project', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.COMPLETED}>Completed</SelectItem>
                  <SelectItem value={TaskStatus.CANCELLED}>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.assignedTo || 'all'}
                onValueChange={(value) => handleFilterChange('assignedTo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id || user.userId || ''} value={user.id || user.userId || ''}>
                      {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.mainTasksOnly ? 'main' : 'all'}
                onValueChange={(value) => handleFilterChange('mainTasksOnly', value === 'main')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="main">Main Tasks Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <XCircle className="h-4 w-4" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Task List */}
      {!loading && (
        <>
          {tasks.length === 0 ? (
            <Card className="modern-card">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No tasks found
                </h3>
                <p className="text-gray-600 mb-4">
                  {Object.values(filters).some(v => v) 
                    ? 'Try adjusting your filters or create a new task.'
                    : 'Get started by creating your first task.'
                  }
                </p>
                <Button
                  onClick={handleCreateTask}
                  className="modern-button"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {tasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEditTask}
                  onDelete={handleDeleteTask}
                  onStatusChange={handleStatusChange}
                  onAddSubtask={handleAddSubtask}
                  onEditSubtask={handleEditSubtask}
                  onDeleteSubtask={handleDeleteSubtask}
                  onSubtaskStatusChange={handleStatusChange}
                />
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Task Dialog */}
      <TaskDialog
        open={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        onSubmit={handleTaskSubmit}
        task={editingTask ?? undefined}
        parentTask={parentTask ?? undefined}
        projects={projects}
        users={users.map(u => ({
          id: u.id || u.userId || '',
          name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.userName,
          email: u.email
        }))}
        loading={dialogLoading}
        error={dialogError ?? undefined}
        defaultProjectId={projectId}
      />
    </div>
  );
};