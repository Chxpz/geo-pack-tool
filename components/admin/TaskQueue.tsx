'use client';

import { useState } from 'react';
import { OperatorTask, Business } from '@/lib/types';
import { getOperatorSlaHours } from '@/lib/plan-limits';

interface TaskQueueProps {
  tasks: OperatorTask[];
  businesses: Record<string, Business>;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  onAssignOperator?: (taskId: string, operatorId: string) => void;
}

export default function TaskQueue({
  tasks,
  businesses,
  onStatusChange,
  onAssignOperator,
}: TaskQueueProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = due.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setEditingTaskId(null);
        if (onStatusChange) onStatusChange(taskId, newStatus);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleAssignOperator = async (taskId: string, operatorId: string) => {
    try {
      const response = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_id: operatorId }),
      });

      if (response.ok) {
        if (onAssignOperator) onAssignOperator(taskId, operatorId);
      }
    } catch (error) {
      console.error('Error assigning operator:', error);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Customer
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Task Type
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Status
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Assigned To
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Due Date
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              SLA
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {tasks.map((task) => {
            const business = businesses[task.business_id];
            const daysUntilDue = getDaysUntilDue(task.due_date);
            const isTaskOverdue = isOverdue(task.due_date);

            return (
              <tr key={task.id} className={isTaskOverdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                  {business?.business_name || 'Unknown Business'}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{task.task_type}</td>
                <td className="px-6 py-3 text-sm">
                  {editingTaskId === task.id ? (
                    <select
                      value={selectedStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        handleStatusChange(task.id, newStatus);
                      }}
                      className="rounded border border-gray-300 px-2 py-1 text-xs"
                      onBlur={() => setEditingTaskId(null)}
                      autoFocus
                    >
                      <option value="">Select status</option>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="failed">Failed</option>
                    </select>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingTaskId(task.id);
                        setSelectedStatus(task.status);
                      }}
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold cursor-pointer hover:opacity-80 ${getStatusColor(task.status)}`}
                    >
                      {task.status}
                    </button>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  {task.operator_id ? (
                    <span className="text-gray-900 font-medium">
                      Assigned
                    </span>
                  ) : (
                    <span className="text-gray-400">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  {task.due_date ? (
                    <div className={isTaskOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                      {new Date(task.due_date).toLocaleDateString()}
                      {daysUntilDue !== null && (
                        <div className="text-xs text-gray-500">
                          {daysUntilDue < 0
                            ? `${Math.abs(daysUntilDue)} days overdue`
                            : `${daysUntilDue} days left`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">No due date</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm">
                  <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                    isTaskOverdue
                      ? 'bg-red-100 text-red-800'
                      : daysUntilDue !== null && daysUntilDue <= 1
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-green-100 text-green-800'
                  }`}>
                    {isTaskOverdue ? 'OVERDUE' : daysUntilDue !== null && daysUntilDue <= 1 ? 'DUE SOON' : 'OK'}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm">
                  <button
                    onClick={() => {
                      setEditingTaskId(editingTaskId === task.id ? null : task.id);
                      setSelectedOperator(task.operator_id || '');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-semibold text-xs"
                  >
                    {editingTaskId === task.id ? 'Done' : 'Edit'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div className="px-6 py-8 text-center text-gray-500">
          No tasks found
        </div>
      )}
    </div>
  );
}
