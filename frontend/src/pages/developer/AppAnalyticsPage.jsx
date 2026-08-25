import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Download, Star, Eye } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { developerApi } from '../../utils/api';
import Spinner from '../../components/ui/Spinner';

const COLORS = ['#000000', '#525252', '#A3A3A3', '#E5E5E5', '#171717'];

export default function AppAnalyticsPage() {
  const { appId } = useParams();

  const { data, isLoading } = useQuery({
    queryKey: ['developer-app-analytics', appId],
    queryFn: () => developerApi.analytics(appId),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const { app, dailyDownloads = [], ratingDist = [], versionAdoption = [] } =
    data?.data || {};

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const ds = d.toISOString().split('T')[0];
    const found = dailyDownloads.find((r) => r.date === ds);
    return { date: ds.slice(5), count: found?.count || 0 };
  });

  const ratingChartData = [5, 4, 3, 2, 1].map((r) => ({
    rating: `${r}★`,
    count: ratingDist.find((d) => d.rating === r)?.count || 0,
  }));

  return (
    <>
      <Helmet>
        <title>Analytics: {app?.name || 'App'} — Developer Portal</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <Link
            to="/developer/dashboard"
            className="text-xs font-medium text-neutral-500 hover:text-black transition-colors flex items-center gap-1.5 mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Apps</span>
          </Link>

          <div className="flex items-center gap-3">
            {app?.icon_url && (
              <img
                src={app.icon_url}
                alt={app.name}
                className="w-10 h-10 rounded-xl object-cover border border-neutral-200 bg-white"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-neutral-900">
                {app?.name}
              </h1>
              <p className="text-xs text-neutral-400">v{app?.current_version} • 30 Day Analytics Overview</p>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded p-5 text-center">
            <Download className="w-5 h-5 text-neutral-300 mx-auto mb-1" />
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">
              {(app?.total_downloads || 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em] mt-0.5">Total Downloads</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded p-5 text-center">
            <Star className="w-5 h-5 text-amber-400 fill-current mx-auto mb-1" />
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">
              {app?.average_rating ? `${Number(app.average_rating).toFixed(1)}★` : '–'}
            </p>
            <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em] mt-0.5">Average Rating</p>
          </div>

          <div className="bg-white border border-neutral-200 rounded p-5 text-center">
            <Eye className="w-5 h-5 text-neutral-300 mx-auto mb-1" />
            <p className="text-2xl font-bold text-neutral-900 tabular-nums">
              {(app?.total_views || 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em] mt-0.5">Store Page Views</p>
          </div>
        </div>

        {/* Downloads Over Time Chart */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-4">
            Daily Installs (Last 30 Days)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A3A3A3' }} />
                <YAxis tick={{ fontSize: 10, fill: '#A3A3A3' }} allowDecimals={false} width={30} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '4px',
                    border: '1px solid #E5E5E5',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#000000"
                  strokeWidth={2}
                  fill="#FAFAFA"
                  name="Installs"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating Breakdown & Version Share */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-4">
              Rating Distribution
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ratingChartData} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#A3A3A3' }} allowDecimals={false} />
                  <YAxis dataKey="rating" type="category" tick={{ fontSize: 11, fill: '#525252' }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px', borderColor: '#E5E5E5' }} />
                  <Bar dataKey="count" fill="#000000" radius={[0, 2, 2, 0]} name="Reviews" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em] mb-4">
              Version Distribution
            </h3>
            {versionAdoption.length > 0 ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={versionAdoption}
                      dataKey="downloads"
                      nameKey="version_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      label={({ name, percent }) => `v${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {versionAdoption.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px', borderColor: '#E5E5E5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center py-12">No version logs recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
