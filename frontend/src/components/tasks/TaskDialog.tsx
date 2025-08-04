'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Calendar, X, Plus, Loader2, AlertCircle } from 'lucide-react';
import { Task, TaskCreate, TaskUpdate, TaskStatus, TaskPriority, TaskUser } from '../../models/task';
import { Project } from '../../models/project/Project';

interface TaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskCreate | TaskUpdate) => void;
  task?: Task;
  projects: Project[];
  users: TaskUser[];
  parentTask?: Task;
  loading?: boolean;
  error?: string;
}

const statusOptions = [
  { value: TaskStatus.TODO, label: 'To Do' },
  { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
  { value: TaskStatus.COMPLETED, label: 'Completed' },
  { value: TaskStatus.CANCELLED, label: 'Cancelled' }
];

const priorityOptions = [
  { value: TaskPriority.LOW, label: 'Low' },
  { value: TaskPriority.MEDIUM, label: 'Medium' },
  { value: TaskPriority.HIGH, label: 'High' },
  { value: TaskPriority.CRITICAL, label: 'Critical' }
];

export const TaskDialog: React.FC<TaskDialogProps> = ({
  open,
  onClose,
  onSubmit,
  task,
  projects,
  users,
  parentTask,
  loading = false,
  error
}) => {
  // Only include 'project' when creating a task
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    project: '',
    assignedTo: '',
    dueDate: '',
    estimatedHours: 0,
    actualHours: 0,
    tags: []
  });

  const [tagInput, setTagInput] = useState('');

  const isEditing = Boolean(task);
  const isSubtask = Boolean(parentTask);

  useEffect(() => {
    if (task) {
      // Editing: do not include 'project' in formData
      setFormData({
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo?.id || '',
        dueDate: task.dueDate || '',
        estimatedHours: task.estimatedHours || 0,
        actualHours: task.actualHours || 0,
        tags: task.tags || []
      });
    } else {
      // Creating: include 'project'
      setFormData({
        title: '',
        description: '',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        project: parentTask?.project || '',
        parentTaskId: parentTask?.id,
        assignedTo: '',
        dueDate: '',
        estimatedHours: 0,
        actualHours: 0,
        tags: []
      });
    }
  }, [task, parentTask]);

  const handleInputChange = (field: string, value: unknown) => {
    setFormData((prev: typeof formData) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = (): void => {
    const tag = tagInput.trim();
    if (tag && !(formData.tags as string[] | undefined)?.includes(tag)) {
      const newTags: string[] = [...((formData.tags as string[]) || []), tag];
      handleInputChange('tags', newTags);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string): void => {
    const newTags: string[] = (formData.tags as string[] | undefined)?.filter((tag: string) => tag !== tagToRemove) || [];
    handleInputChange('tags', newTags);
  };

  const handleSubmit = () => {
    const submitData = { ...formData };
    
    // Clean up empty values
    if (!submitData.description?.trim()) delete submitData.description;
    if (!submitData.assignedTo) delete submitData.assignedTo;
    if (!submitData.dueDate) delete submitData.dueDate;
    if (!submitData.estimatedHours) delete submitData.estimatedHours;
    if (!submitData.actualHours) delete submitData.actualHours;
    if (!submitData.tags?.length) delete submitData.tags;

    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold bg-gradient-primary bg-clip-text text-transparent">
            {isEditing 
              ? `Edit ${isSubtask ? 'Subtask' : 'Task'}` 
              : `Create ${isSubtask ? 'Subtask' : 'Task'}`
            }
          </DialogTitle>
          {parentTask && (
            <p className="text-sm text-gray-600 mt-1">
              Parent Task: {parentTask.title}
            </p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter task title"
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter task description"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange('priority', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!isSubtask && (
              <div>
                <Label htmlFor="project">Project *</Label>
                <Select
                  value={
                    task
                      ? (typeof task.project === 'object' && task.project && 'id' in task.project
                          ? (task.project as { id: string }).id
                          : typeof task.project === 'string'
                            ? task.project
                            : '')
                      : formData.project
                  }
                  onValueChange={(value) => handleInputChange('project', value)}
                  disabled={!!task}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
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
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                value={formData.assignedTo}
                onValueChange={(value) => handleInputChange('assignedTo', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <div className="relative mt-1">
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              </div>
            </div>

            <div>
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                value={formData.estimatedHours}
                onChange={(e) => handleInputChange('estimatedHours', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.5"
                className="mt-1"
              />
            </div>

            {isEditing && (
              <div>
                <Label htmlFor="actualHours">Actual Hours</Label>
                <Input
                  id="actualHours"
                  type="number"
                  value={formData.actualHours}
                  onChange={(e) => handleInputChange('actualHours', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.5"
                  className="mt-1"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <Label>Tags</Label>
              <div className="mt-1">
                <div className="flex flex-wrap gap-2 mb-2">
                  {(formData.tags as string[] | undefined)?.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddTag}
                    variant="outline"
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              loading ||
              !formData.title.trim() ||
              (!isSubtask && (!task && !formData.project))
            }
            className="modern-button"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Saving...' : (isEditing ? 'Update' : 'Create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};