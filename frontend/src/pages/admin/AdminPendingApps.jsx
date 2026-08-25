import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { adminApi } from '../../utils/api';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';

export default function AdminPendingApps() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-apps'],
    queryFn: adminApi.pendingApps,
    refetchInterval: 30000,
  });

  const apps = data?.data?.apps || [];

  return (
    <>
      <Helmet>
        <title>Pending Review Queue — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            App Submissions Pending Review
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            {apps.length} application{apps.length !== 1 ? 's' : ''} awaiting editorial review
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : apps.length === 0 ? (
          <div className="card p-12">
            <EmptyState
              icon={ShieldCheck}
              title="No pending reviews"
              description="No applications are currently awaiting review in the queue."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-white border border-neutral-200 rounded p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={app.icon_url}
                    alt={app.name}
                    className="w-12 h-12 rounded-xl object-cover border border-neutral-200 bg-white flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-neutral-900 truncate">
                        {app.name}
                      </h3>
                      <span className="badge-pending text-[10px]">v{app.current_version}</span>
                    </div>
                    <p className="text-xs text-neutral-400 font-mono truncate">{app.package_name}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      By <span className="font-medium text-neutral-700">{app.developer_name}</span> ({app.developer_email}) • {formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>

                <Link
                  to={`/admin/apps/${app.id}/review`}
                  className="btn-primary text-xs h-8 px-4 flex items-center justify-center gap-1.5 self-end sm:self-center flex-shrink-0 font-medium"
                >
                  <span>Review Submission</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
