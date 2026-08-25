import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, XCircle, GitBranch } from 'lucide-react';
import { adminApi, getErrorMessage } from '../../utils/api';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import toast from 'react-hot-toast';

function formatBytes(bytes) {
  if (!bytes) return '–';
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export default function AdminPendingVersions() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-versions'],
    queryFn: adminApi.pendingVersions,
  });

  const approveMutation = useMutation({
    mutationFn: (id) => adminApi.approveVersion(id),
    onSuccess: () => {
      toast.success('Version update approved & activated!');
      queryClient.invalidateQueries(['admin-pending-versions']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const rejectMutation = useMutation({
    mutationFn: (id) => adminApi.rejectVersion(id, { notes: 'Version rejected by admin' }),
    onSuccess: () => {
      toast.success('Version update rejected');
      queryClient.invalidateQueries(['admin-pending-versions']);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const versions = data?.data?.versions || [];

  return (
    <>
      <Helmet>
        <title>Pending Version Updates — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Version Updates Pending Review
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            {versions.length} new APK update{versions.length !== 1 ? 's' : ''} submitted
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : versions.length === 0 ? (
          <div className="card p-12">
            <EmptyState
              icon={GitBranch}
              title="No Pending Versions"
              description="All submitted application version updates have been processed."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {versions.map((v) => (
              <div
                key={v.id}
                className="bg-white border border-neutral-200 rounded p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm sm:text-base text-neutral-900">
                      {v.app_name}
                    </h3>
                    <span className="badge-pending">v{v.version_name} ({v.version_code})</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    By {v.developer_name} ({v.developer_email}) • Size: {formatBytes(v.apk_size_bytes)}
                  </p>
                  {v.whats_new && (
                    <p className="text-xs text-neutral-700 mt-2 bg-neutral-50 p-2.5 rounded border border-neutral-200">
                      <strong>What's New:</strong> {v.whats_new}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => approveMutation.mutate(v.id)}
                    className="btn-primary h-8 text-xs font-medium px-3 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Update</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Reject version v${v.version_name}?`)) rejectMutation.mutate(v.id);
                    }}
                    className="btn-danger h-8 text-xs font-medium px-3 flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
