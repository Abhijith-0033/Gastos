import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../utils/api';
import Badge from '../../components/ui/Badge';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const [filters, setFilters] = useState({ page: 1, role: '', search: '', limit: 15 });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-list', filters],
    queryFn: () => adminApi.users(filters),
    keepPreviousData: true,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id) => adminApi.toggleUserActive(id),
    onSuccess: (res) => {
      toast.success(res.data.is_active ? 'User activated' : 'User suspended');
      queryClient.invalidateQueries(['admin-users-list']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }) => adminApi.changeUserRole(id, role),
    onSuccess: () => {
      toast.success('User role updated');
      queryClient.invalidateQueries(['admin-users-list']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const users = data?.data?.users || [];
  const pagination = data?.data?.pagination;

  return (
    <>
      <Helmet>
        <title>User Directory — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              User Directory
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {pagination?.total || 0} total registered accounts
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search user or email..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
                }
                className="input pl-9 text-xs w-48 sm:w-60"
              />
            </div>

            <select
              value={filters.role}
              onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))}
              className="input text-xs w-32"
            >
              <option value="">All Roles</option>
              <option value="admin">Admin</option>
              <option value="developer">Developer</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-surface dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-[11px] font-medium tracking-[0.05em]">
                  <tr>
                    <th className="text-left px-5 py-3">User</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-right px-4 py-3">Apps</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-normal">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-surface dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary text-white font-medium text-xs flex items-center justify-center flex-shrink-0">
                            {user.display_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">
                              {user.display_name}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            changeRoleMutation.mutate({ id: user.id, role: e.target.value })
                          }
                          className="input py-0.5 px-2 text-xs w-auto"
                        >
                          <option value="user">User</option>
                          <option value="developer">Developer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">{user.total_apps}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.is_active ? 'approved' : 'rejected'}>
                          {user.is_active ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => {
                            if (confirm(`${user.is_active ? 'Suspend' : 'Activate'} ${user.display_name}?`)) {
                              toggleActiveMutation.mutate(user.id);
                            }
                          }}
                          className={`text-xs font-medium hover:underline ${
                            user.is_active ? 'text-danger' : 'text-primary'
                          }`}
                        >
                          {user.is_active ? 'Suspend' : 'Activate'}
                        </button>
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
