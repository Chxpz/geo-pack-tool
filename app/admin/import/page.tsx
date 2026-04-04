import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase';
import { Business, DataImport } from '@/lib/types';
import ImportForm from '@/components/admin/ImportForm';

export default async function AdminImportPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const supabase = supabaseAdmin;
  if (!supabase) {
    return <div className="p-8 text-red-600">Database connection failed</div>;
  }

  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();

  if (!user || (user.role !== 'operator' && user.role !== 'admin')) {
    redirect('/dashboard');
  }

  // Fetch all businesses for dropdown
  const { data: businessesData } = await supabase
    .from('businesses')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  const businesses = (businessesData ?? []) as Business[];

  // Fetch recent imports
  const { data: recentImportsData } = await supabase
    .from('data_imports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  const recentImports = (recentImportsData ?? []) as DataImport[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
              <p className="mt-2 text-gray-600">
                Upload data files for manual import
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{businesses.length}</div>
              <div className="text-sm text-gray-600">Managed Businesses</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-8">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">Upload File</h2>
              <ImportForm businesses={businesses} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Import Stats</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {recentImports.filter((i) => i.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Successful Imports</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {recentImports.filter((i) => i.status === 'processing').length}
                  </div>
                  <div className="text-sm text-gray-600">Processing</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-600">
                    {recentImports.filter((i) => i.status === 'failed').length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {recentImports.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Imports</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">File Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rows</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentImports.slice(0, 10).map((imp: DataImport) => (
                    <tr key={imp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-900">{imp.file_name}</td>
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
