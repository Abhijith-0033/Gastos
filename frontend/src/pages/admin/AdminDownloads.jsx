import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { adminApi } from '../../utils/api';
import Spinner from '../../components/ui/Spinner';

export default function AdminDownloads() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-downloads-analytics'],
    queryFn: adminApi.downloads,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const { topApps = [], dailyTrend = [] } = data?.data || {};

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const dd = new Date();
    dd.setDate(dd.getDate() - (29 - i));
    const ds = dd.toISOString().split('T')[0];
    const found = dailyTrend.find((r) => r.date === ds);
    return { date: ds.slice(5), count: found?.count || 0 };
  });

  return (
    <>
      <Helmet>
        <title>Download Analytics — Admin</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Download & Installation Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Store-wide traffic and APK distribution trends
          </p>
        </div>

        {/* 30-Day Installs Trend */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-[0.05em] mb-4">
            Daily APK Downloads (Last 30 Days)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last30}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} width={35} />
                <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '12px', borderColor: '#E2E8F0' }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="#EFF6FF"
                  name="Downloads"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Apps Leaderboard */}
        <div className="card p-5">
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-[0.05em] mb-4">
            Top 10 Most Installed Apps
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topApps} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} width={120} />
                <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px', borderColor: '#E2E8F0' }} />
                <Bar dataKey="total_downloads" fill="#2563EB" radius={[0, 2, 2, 0]} name="Total Downloads" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
