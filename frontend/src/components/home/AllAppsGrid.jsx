import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PackageSearch } from 'lucide-react';
import { appsApi } from '../../utils/api';
import AppCard from '../ui/AppCard';
import SkeletonCard from '../ui/SkeletonCard';
import Pagination from '../ui/Pagination';
import EmptyState from '../ui/EmptyState';

const SORT_OPTIONS = [
  { value: 'downloads', label: 'Most Downloads' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'name', label: 'Name A-Z' },
];

export default function AllAppsGrid() {
  const [filters, setFilters] = useState({ page: 1, sort: 'downloads', limit: 12 });

  const { data, isLoading } = useQuery({
    queryKey: ['apps', filters],
    queryFn: () => appsApi.list(filters),
    keepPreviousData: true,
  });

  const apps = data?.data?.apps || [];
  const pagination = data?.data?.pagination;

  return (
    <div className="pt-4">
      {/* Header and Sorting */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            All Applications
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            {pagination?.total || 0} total apps available
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-400">Sort by:</label>
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value, page: 1 }))}
            className="input text-xs w-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          : apps.map((app, i) => <AppCard key={app.id} app={app} index={i} />)}
      </div>

      {!isLoading && apps.length === 0 && (
        <EmptyState
          icon={PackageSearch}
          title="No apps found"
          description="Check back soon as developers publish new apps."
        />
      )}

      {pagination && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}
    </div>
  );
}
