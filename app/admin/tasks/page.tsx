import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { OperatorTask, Business } from '@/lib/types';
import TaskQueue from '@/components/admin/TaskQueue';

interface TasksPageProps {
  searchParams: Promise<{
    status?: string;
    operator_id?: string;
    show_overdue?: string;
  }>;
}

export default async function AdminTasksPage({ searchParams }: TasksPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const supabase = supabaseAdmin;
  if (!supabase) {
    return <div className="p-8 text-red-600">Database connection failed</div>;
  }

  // Check user role
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!user || (user.role !== 'operator' && user.role !== 'admin')) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const statusFilter = params.status;
  const operatorFilter = params.operator_id;
  const showOverdue = params.show_overdue === 'true';

  // Build query
  let query = supabase
    .from('operator_tasks')
    .select('*');

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  if (operatorFilter) {
    query = query.eq('operator_id', operatorFilter);
  }

  const { data: tasks = [] } = await query
    .order('due_date', { ascending: true });

  // Filter overdue if requested
  let filteredTasks = tasks as OperatorTask[];
  if (showOverdue) {
    const now = new Date();
    filteredTasks = filteredTasks.filter((t) => {
      if (!t.due_date) return false;
      return new Date(t.due_date) < now && t.status === 'pending';
    });
  }

  // Fetch all businesses for mapping
  const { data: businessesData } = await supabase
    .from('businesses')
    .select('*')
    .is('deleted_at', null);
  const businesses = (businessesData ?? []) as Business[];

  const businessMap = businesses.reduce(
    (acc, b) => {
      acc[b.id] = b;
      return acc;
    },
    {} as Record<string, Business>
  );

  // Count stats
  const pendingCount = filteredTasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = filteredTasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = filteredTasks.filter((t) => t.status === 'completed').length;
  const overdueCount = filteredTasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(t.due_date) < new Date() && t.status === 'pending';
  }).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Operator Tasks</h1>
          <p className="mt-2 text-gray-600">
            Manage and track tasks for customer onboarding and audits
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Metrics Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-blue-600">{pendingCount}</div>
            <div className="mt-2 text-sm text-gray-600">Pending Tasks</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-purple-600">{inProgressCount}</div>
            <div className="mt-2 text-sm text-gray-600">In Progress</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-green-600">{completedCount}</div>
            <div className="mt-2 text-sm text-gray-600">Completed</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-red-600">{overdueCount}</div>
            <div className="mt-2 text-sm text-gray-600">Overdue</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <a
            href="/admin/tasks"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              !statusFilter && !showOverdue
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            All Tasks
          </a>
          <a
            href="/admin/tasks?status=pending"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              statusFilter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            Pending
          </a>
          <a
            href="/admin/tasks?status=in_progress"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              statusFilter === 'in_progress'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            In Progress
          </a>
          <a
            href="/admin/tasks?status=completed"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              statusFilter === 'completed'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            Completed
          </a>
          <a
            href="/admin/tasks?show_overdue=true"
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              showOverdue
                ? 'bg-red-600 text-white'
                : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            Overdue Only
          </a>
        </div>

        {/* Tasks Table */}
        {filteredTasks.length > 0 ? (
          <TaskQueue tasks={filteredTasks} businesses={businessMap} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            No tasks found matching the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}
