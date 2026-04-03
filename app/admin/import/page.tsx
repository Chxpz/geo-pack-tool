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

  // Check user role
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
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CSV Import</h1>
              <p className="mt-2 text-gray-600">
                Upload Otterly data exports to import business metrics
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
          {/* Import Form */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-8">
              <h2 className="mb-6 text-xl font-semibold text-gray-900">Upload CSV</h2>
              <ImportForm businesses={businesses} />

              {/* Help Text */}
              <div className="mt-8 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
                <h3 className="font-semibold mb-2">Supported file types:</h3>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Search Prompts: otterly_prompts.csv</li>
                  <li>Citation Links Full: otterly_citations_full.csv</li>
                  <li>Citation Links Summary: otterly_citations_summary.csv</li>
                  <li>Visibility Report: otterly_visibility.csv</li>
                  <li>GEO Audit: otterly_geo_audit.json</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Imports Stats */}
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

            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Import Types</h3>
              <div className="space-y-2 text-sm">
                {['otterly_prompts', 'otterly_citations', 'otterly_visibility', 'otterly_geo_audit'].map(
                  (type) => {
                    const count = recentImports.filter((i) => i.import_type === type).length;
                    return (
                      <div key={type} className="flex justify-between">
                        <span className="text-gray-600">{type}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Imports Table */}
        {recentImports.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Imports</h2>
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
