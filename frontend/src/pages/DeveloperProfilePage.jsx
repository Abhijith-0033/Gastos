import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Globe, Download, AppWindow, Calendar, User } from 'lucide-react';
import { developersApi } from '../utils/api';
import AppCard from '../components/ui/AppCard';
import EmptyState from '../components/ui/EmptyState';
import Spinner from '../components/ui/Spinner';

export default function DeveloperProfilePage() {
  const { username } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['developer-profile', username],
    queryFn: () => developersApi.profile(username),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data?.data?.developer) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <User className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1 text-neutral-900">Developer Not Found</h2>
        <p className="text-neutral-400 text-xs mb-6">
          The requested developer profile does not exist.
        </p>
        <Link to="/" className="btn-primary inline-flex">
          Back to Store
        </Link>
      </div>
    );
  }

  const { developer, apps = [] } = data.data;

  return (
    <>
      <Helmet>
        <title>{developer.display_name} — Developer Profile</title>
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Card */}
        <div className="card p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-black text-white font-bold text-2xl flex items-center justify-center flex-shrink-0">
            {developer.display_name?.[0]?.toUpperCase() || 'D'}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {developer.display_name}
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">@{developer.username}</p>

            {developer.bio && (
              <p className="text-xs sm:text-sm text-neutral-700 mt-3 leading-relaxed">
                {developer.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-4 pt-4 border-t border-neutral-100 text-xs text-neutral-400 font-medium">
              <div className="flex items-center gap-1.5">
                <AppWindow className="w-4 h-4 text-black" />
                <span>{developer.total_published_apps || 0} published apps</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Download className="w-4 h-4 text-neutral-400" />
                <span>{(developer.total_downloads || 0).toLocaleString()} downloads</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span>Publishing since {developer.developer_since}</span>
              </div>

              {developer.website && (
                <a
                  href={developer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-black hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Apps Grid */}
        <div>
          <h2 className="text-base font-semibold text-neutral-900 mb-4">
            Published Applications by {developer.display_name}
          </h2>

          {apps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {apps.map((app, i) => (
                <AppCard key={app.id} app={app} index={i} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No apps published yet"
              description="This developer has not released any public apps yet."
            />
          )}
        </div>
      </div>
    </>
  );
}
