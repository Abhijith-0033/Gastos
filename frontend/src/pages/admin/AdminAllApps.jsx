import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Search, Eye, Trash2, Pause } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../utils/api';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}

export default function AdminAllApps() {
  const [filters, setFilters] = useState({ page: 1, status: '', search: '', limit: 15 });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-all-apps', filters],
    queryFn: () => adminApi.apps(filters),
    keepPreviousData: true,
  });

  const suspendMutation = useMutation({
    mutationFn: (id) => adminApi.suspendApp(id, { notes: 'Suspended by administration' }),
    onSuccess: () => {
      toast.success('App suspended');
      queryClient.invalidateQueries(['admin-all-apps']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteApp(id),
    onSuccess: () => {
      toast.success('App deleted permanently');
      queryClient.invalidateQueries(['admin-all-apps']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const apps = data?.data?.apps || [];
  const pagination = data?.data?.pagination;
  const statusVariant = { approved: 'approved', rejected: 'rejected', pending: 'pending', suspended: 'suspended' };

  return (
    <>
      <Helmet>
        <title>All Apps Directory — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              App Directory
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              {pagination?.total || 0} total applications registered
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search apps..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
                }
                className="input pl-9 text-xs w-48 sm:w-60"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              className="input text-xs w-32"
            >
              <option value="">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase text-[11px] font-medium tracking-[0.05em]">
                  <tr>
                    <th className="text-left px-5 py-3">App</th>
                    <th className="text-left px-4 py-3">Developer</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Downloads</th>
                    <th className="text-right px-4 py-3">Rating</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-normal">
                  {apps.map((app) => (
                    <tr key={app.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={app.icon_url}
                            alt={app.name}
                            className="w-9 h-9 rounded-xl object-cover border border-neutral-200 flex-shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-neutral-900 truncate max-w-[180px]">
                              {app.name}
                            </p>
                            <p className="text-[11px] text-neutral-400">
                              {app.category} • v{app.current_version}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-neutral-700 truncate max-w-[130px]">
                          {app.developer_name}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[app.status] || 'suspended'}>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900">
                        {formatCount(app.total_downloads)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-neutral-900">
                        {app.average_rating ? `${Number(app.average_rating).toFixed(1)}★` : '–'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/apps/${app.id}/review`}
                            className="text-xs font-medium text-black hover:underline"
                          >
                            Review
                          </Link>

                          {app.status === 'approved' && (
                            <>
                              <span className="text-neutral-200">|</span>
                              <button
                                onClick={() => {
                                  if (confirm(`Suspend ${app.name}?`)) suspendMutation.mutate(app.id);
                                }}
                                className="text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:underline"
                              >
                                Suspend
                              </button>
                            </>
                          )}

                          <span className="text-neutral-200">|</span>
                          <button
                            onClick={() => {
                              if (confirm(`Permanently delete ${app.name}? This cannot be undone.`)) {
                                deleteMutation.mutate(app.id);
                              }
                            }}
                            className="text-xs font-medium text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          page={filters.page}
          totalPages={pagination?.totalPages || 1}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </div>
    </>
  );
}
