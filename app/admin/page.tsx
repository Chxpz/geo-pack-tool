import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { OperatorTask, Business, DataImport } from '@/lib/types';
import Link from 'next/link';

export default async function AdminPage() {
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

  // Fetch pending tasks
  const { data: pendingTasksData } = await supabase
    .from('operator_tasks')
    .select('*')
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(5);
  const pendingTasks = (pendingTasksData ?? []) as OperatorTask[];

  // Fetch recent imports
  const { data: recentImportsData } = await supabase
    .from('data_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  const recentImports = (recentImportsData ?? []) as DataImport[];

  // Get stats
  const { count: totalTasks } = await supabase
    .from('operator_tasks')
    .select('*', { count: 'exact', head: true });

  const { count: totalBusinesses } = await supabase
    .from('businesses')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);

  const { count: completedImports } = await supabase
    .from('data_imports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: overdueTasks } = await supabase
    .from('operator_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('due_date', new Date().toISOString());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage tasks, imports, and customer accounts</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Logged in as</div>
              <div className="font-semibold text-gray-900">{session.user.email}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Metrics Grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-blue-600">{totalTasks || 0}</div>
            <div className="mt-2 text-sm text-gray-600">Total Tasks</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-red-600">{overdueTasks || 0}</div>
            <div className="mt-2 text-sm text-gray-600">Overdue Tasks</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-green-600">{totalBusinesses || 0}</div>
            <div className="mt-2 text-sm text-gray-600">Managed Businesses</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="text-3xl font-bold text-purple-600">{completedImports || 0}</div>
            <div className="mt-2 text-sm text-gray-600">Completed Imports</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 lg:grid-cols-3">
          <Link
            href="/admin/tasks"
            className="rounded-xl border-2 border-blue-200 bg-white p-6 hover:border-blue-400 hover:bg-blue-50 transition"
          >
            <div className="text-lg font-semibold text-gray-900">Manage Tasks</div>
            <p className="mt-2 text-sm text-gray-600">
              View and assign operator tasks
            </p>
            <div className="mt-4 inline-block text-blue-600 font-semibold">View Tasks →</div>
          </Link>

          <Link
            href="/admin/import"
            className="rounded-xl border-2 border-green-200 bg-white p-6 hover:border-green-400 hover:bg-green-50 transition"
          >
            <div className="text-lg font-semibold text-gray-900">Import Data</div>
            <p className="mt-2 text-sm text-gray-600">
              Upload data files for import
            </p>
            <div className="mt-4 inline-block text-green-600 font-semibold">Import Now →</div>
          </Link>

          <Link
            href="/admin/imports"
            className="rounded-xl border-2 border-purple-200 bg-white p-6 hover:border-purple-400 hover:bg-purple-50 transition"
          >
            <div className="text-lg font-semibold text-gray-900">Import History</div>
            <p className="mt-2 text-sm text-gray-600">
              View all data imports
            </p>
            <div className="mt-4 inline-block text-purple-600 font-semibold">View History →</div>
          </Link>
        </div>

        {/* Pending Tasks Section */}
        {pendingTasks.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Pending Tasks</h2>
              <Link
                href="/admin/tasks"
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                View All →
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Task Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Assigned To
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingTasks.slice(0, 5).map((task: OperatorTask) => {
                    const dueDate = new Date(task.due_date || '');
                    const isOverdue = dueDate < new Date();

                    return (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          {task.task_type}
                        </td>
                        <td className="px-6 py-3 text-sm">
                          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">
                            {task.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                            {dueDate.toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">
                          {task.operator_id ? 'Assigned' : 'Unassigned'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Imports Section */}
        {recentImports.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Imports</h2>
              <Link
                href="/admin/import"
                className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
              >
                New Import →
              </Link>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Rows
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentImports.slice(0, 5).map((imp: DataImport) => (
                    <tr key={imp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">
                        {imp.file_name}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{imp.import_type}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{imp.row_count || '-'}</td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            imp.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : imp.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {imp.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {new Date(imp.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
