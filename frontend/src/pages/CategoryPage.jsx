import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Wallet, Zap, Wrench, BookOpen, Heart,
  Film, Gamepad2, Users, ShoppingBag, Plane, Grid
} from 'lucide-react';
import { appsApi } from '../utils/api';
import AppCard from '../components/ui/AppCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';

const CATEGORY_ICONS = {
  finance:       Wallet,
  productivity:  Zap,
  tools:         Wrench,
  education:     BookOpen,
  health:        Heart,
  entertainment: Film,
  games:         Gamepad2,
  social:        Users,
  shopping:      ShoppingBag,
  travel:        Plane,
};

export default function CategoryPage() {
  const { slug } = useParams();
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('downloads');

  const { data, isLoading } = useQuery({
    queryKey: ['category-apps', slug, page, sort],
    queryFn: () => appsApi.list({ category: slug, page, limit: 16, sort }),
    keepPreviousData: true,
  });

  const apps = data?.data?.apps || [];
  const pagination = data?.data?.pagination;
  const Icon = CATEGORY_ICONS[slug?.toLowerCase()] || Grid;
  const categoryTitle = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Category';

  return (
    <>
      <Helmet>
        <title>{categoryTitle} Apps — Gastos App Store</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-neutral-50 border border-neutral-200 flex items-center justify-center">
              <Icon className="w-5 h-5 text-neutral-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                {categoryTitle} Applications
              </h1>
              <p className="text-xs text-neutral-400 mt-0.5">
                {pagination?.total || 0} verified apps in this category
              </p>
            </div>
          </div>

          {/* Sort Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-400">Sort:</span>
            {['downloads', 'rating', 'newest'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSort(s);
                  setPage(1);
                }}
                className={`px-3 h-7 rounded text-xs font-medium transition-colors ${
                  sort === s
                    ? 'bg-black text-white'
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-black'
                }`}
              >
                {s === 'downloads' ? 'Popular' : s === 'rating' ? 'Top Rated' : 'Newest'}
              </button>
            ))}
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
            title={`No ${categoryTitle} apps yet`}
            description="Check back soon as developers submit apps to this category."
          />
        )}

        {pagination && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </>
  );
}
