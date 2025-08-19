"use client";

import React, { useState } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import { Progress } from "../../components/ui/progress";
import {
  MoreVertical,
  User,
  Calendar,
  Timer,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
// Add more imports for your UI components as needed
import { Task, TaskStatus, TaskPriority, SubTask } from "../../models/task";

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
  onAddSubtask?: (parentTaskId: string) => void;
  onEditSubtask?: (subtask: SubTask) => void;
  onDeleteSubtask?: (subtaskId: string) => void;
  onSubtaskStatusChange?: (subtaskId: string, status: TaskStatus) => void;
}

const getPriorityBadge = (priority: TaskPriority) => {
  switch (priority) {
    case TaskPriority.CRITICAL:
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Critical
        </Badge>
      );
    case TaskPriority.HIGH:
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200">
          High
        </Badge>
      );
    case TaskPriority.MEDIUM:
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          Medium
        </Badge>
      );
    case TaskPriority.LOW:
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Low
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

const getStatusBadge = (status: TaskStatus) => {
  switch (status) {
    case TaskStatus.TODO:
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          To Do
        </Badge>
      );
    case TaskStatus.IN_PROGRESS:
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          In Progress
        </Badge>
      );
    case TaskStatus.COMPLETED:
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          Completed
        </Badge>
      );
    case TaskStatus.CANCELLED:
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onAddSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onSubtaskStatusChange,
}) => {
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [subtaskMenuOpenId, setSubtaskMenuOpenId] = useState<string | null>(
    null,
  );

  const completionPercentage =
    task.subtaskCount > 0
      ? Math.round((task.completedSubtaskCount / task.subtaskCount) * 100)
      : task.status === TaskStatus.COMPLETED
        ? 100
        : 0;

  return (
    <Card className="modern-card relative">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 pr-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {task.title}
            </h3>
          </div>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="ml-2">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(task)}>
                <Edit className="mr-2 h-4 w-4" /> Edit Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onStatusChange?.(task.id, TaskStatus.TODO)}
              >
                To Do
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onStatusChange?.(task.id, TaskStatus.IN_PROGRESS)
                }
              >
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onStatusChange?.(task.id, TaskStatus.COMPLETED)}
              >
                Completed
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(task.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-gray-600 mb-2 text-sm">{task.description}</p>
        )}

        <div className="flex gap-2 mb-2 flex-wrap">
          {getStatusBadge(task.status)}
          {getPriorityBadge(task.priority)}
          {task.tags.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs border-gray-300 text-gray-600"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-2 flex-wrap">
          {task.assignedTo && task.assignedTo.name && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-gray-400" />
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-gradient-primary text-white">
                  {task.assignedTo.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-700">
                {task.assignedTo.name}
              </span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-700">
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {task.estimatedHours && (
            <div className="flex items-center gap-1">
              <Timer className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-700">
                {task.actualHours}h / {task.estimatedHours}h
              </span>
            </div>
          )}
        </div>

        {task.subtaskCount > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">
                Subtasks ({task.completedSubtaskCount}/{task.subtaskCount})
              </span>
              <span className="text-xs text-gray-500">
                {completionPercentage}%
              </span>
            </div>
            <Progress
              value={completionPercentage}
              className="h-2 rounded bg-gray-200"
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-1">
            {onAddSubtask && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddSubtask(task.id)}
                title="Add Subtask"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {task.subtaskCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSubtasks(!showSubtasks)}
                title={showSubtasks ? "Hide Subtasks" : "Show Subtasks"}
              >
                {showSubtasks ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
          <span className="text-xs text-gray-400">
            Created {new Date(task.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Subtasks */}
        {showSubtasks && (
          <div className="mt-3 border-t pt-2 space-y-2">
            {(task.subtasks || []).map((subtask) => (
              <div
                key={subtask.id}
                className="flex items-center gap-2 pl-4 group"
              >
                <button
                  className="flex items-center justify-center h-5 w-5 rounded-full border border-gray-300 bg-white text-gray-400 hover:bg-gray-100 focus:outline-none"
                  aria-label="Toggle subtask status"
                  onClick={() =>
                    onSubtaskStatusChange?.(
                      subtask.id,
                      subtask.status === TaskStatus.COMPLETED
                        ? TaskStatus.TODO
                        : TaskStatus.COMPLETED,
                    )
                  }
                >
                  {subtask.status === TaskStatus.COMPLETED ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <span
                    className={
                      subtask.status === TaskStatus.COMPLETED
                        ? "line-through opacity-70 text-gray-500"
                        : ""
                    }
                  >
                    {subtask.title}
                  </span>
                  <div className="flex gap-2 items-center text-xs mt-1">
                    {getPriorityBadge(subtask.priority)}
                    {subtask.assignedTo && subtask.assignedTo.name && (
                      <span className="text-gray-500">
                        @{subtask.assignedTo.name}
                      </span>
                    )}
                    {subtask.dueDate && (
                      <span className="text-gray-400">
                        Due: {new Date(subtask.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <DropdownMenu
                  open={subtaskMenuOpenId === subtask.id}
                  onOpenChange={(open) =>
                    setSubtaskMenuOpenId(open ? subtask.id : null)
                  }
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditSubtask?.(subtask)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit Subtask
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDeleteSubtask?.(subtask.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Subtask
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
