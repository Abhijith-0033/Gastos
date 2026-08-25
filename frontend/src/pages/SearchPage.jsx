import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Search } from 'lucide-react';
import { appsApi } from '../utils/api';
import AppCard from '../components/ui/AppCard';
import EmptyState from '../components/ui/EmptyState';
import SkeletonCard from '../components/ui/SkeletonCard';

export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => appsApi.list({ search: query, limit: 24 }),
    enabled: Boolean(query),
  });

  const apps = data?.data?.apps || [];
  const total = data?.data?.pagination?.total || 0;

  return (
    <>
      <Helmet>
        <title>Search results for "{query}" — Gastos App Store</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-neutral-900">
            Search results for "<span className="text-black">{query}</span>"
          </h1>
          {!isLoading && (
            <p className="text-xs text-muted mt-1">
              Found {total} application{total !== 1 ? 's' : ''} matching your search
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : apps.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apps.map((app, i) => (
              <AppCard key={app.id} app={app} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title={`No apps found for "${query}"`}
            description="Try checking for typos or searching by broad keywords like finance, budget, or tool."
          />
        )}
      </div>
    </>
  );
}
