import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { adminApi } from '../../utils/api';
import Pagination from '../../components/ui/Pagination';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { format } from 'date-fns';

export default function AdminActionLog() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-action-logs', page],
    queryFn: () => adminApi.actions({ page, limit: 25 }),
    keepPreviousData: true,
  });

  const actions = data?.data?.actions || [];
  const pagination = data?.data?.pagination;

  return (
    <>
      <Helmet>
        <title>Audit Action Logs — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Administrative Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all moderation, approvals, suspensions, and configuration edits
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 uppercase text-[11px] font-medium tracking-[0.05em]">
                  <tr>
                    <th className="text-left px-5 py-3">Timestamp</th>
                    <th className="text-left px-4 py-3">Administrator</th>
                    <th className="text-left px-4 py-3">Action</th>
                    <th className="text-left px-4 py-3">Target</th>
                    <th className="text-left px-5 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-normal">
                  {actions.map((act) => (
                    <tr key={act.id} className="hover:bg-surface dark:hover:bg-slate-700/30">
                      <td className="px-5 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {format(new Date(act.created_at), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {act.admin_name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="info">{act.action_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {act.target_type} #{act.target_id || '–'}
                      </td>
                      <td className="px-5 py-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">
                        {act.details || '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={pagination?.totalPages || 1}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
