import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Download, AppWindow, Users, Clock, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from '../../utils/api';
import Spinner from '../../components/ui/Spinner';
import { formatDistanceToNow } from 'date-fns';

const COLORS = ['#000000', '#525252', '#A3A3A3', '#E5E5E5', '#171717', '#404040'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: adminApi.dashboard,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const d = data?.data;
  const appsByStatus = d?.totalApps?.reduce((acc, r) => {
    acc[r.status] = r.c;
    return acc;
  }, {}) || {};

  const usersByRole = d?.totalUsers?.reduce((acc, r) => {
    acc[r.role] = r.c;
    return acc;
  }, {}) || {};

  const last30 = Array.from({ length: 30 }, (_, i) => {
    const dd = new Date();
    dd.setDate(dd.getDate() - (29 - i));
    const ds = dd.toISOString().split('T')[0];
    const found = d?.downloadChart?.find((r) => r.date === ds);
    return { date: ds.slice(5), count: found?.count || 0 };
  });

  const categoryData =
    d?.categoryDist?.map((c) => ({ name: c.category, value: c.count })) || [];

  return (
    <>
      <Helmet>
        <title>Admin Dashboard — Gastos App Store</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Dashboard
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Store performance metrics, pending review queues, and system activity
          </p>
        </div>

        {/* Stats Grid — Uniform enterprise stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-neutral-200 rounded p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em]">Downloads Today</p>
                <p className="text-[28px] font-bold text-neutral-900 mt-1 tabular-nums">
                  {(d?.totalDownloadsToday || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {(d?.totalDownloadsAllTime || 0).toLocaleString()} all-time
                </p>
              </div>
              <Download className="w-5 h-5 text-neutral-300" />
            </div>
          </div>

          <Link to="/admin/apps/pending" className="bg-white border border-neutral-200 rounded p-5 hover:border-neutral-300 transition-colors block">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em]">Pending Reviews</p>
                <p className="text-[28px] font-bold text-neutral-900 mt-1 tabular-nums">
                  {d?.pendingApps || 0}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Apps awaiting review</p>
              </div>
              <Clock className="w-5 h-5 text-neutral-300" />
            </div>
          </Link>

          <div className="bg-white border border-neutral-200 rounded p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em]">Live Applications</p>
                <p className="text-[28px] font-bold text-neutral-900 mt-1 tabular-nums">
                  {appsByStatus.approved || 0}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {(appsByStatus.suspended || 0) + (appsByStatus.rejected || 0)} inactive
                </p>
              </div>
              <AppWindow className="w-5 h-5 text-neutral-300" />
            </div>
          </div>

          <div className="bg-white border border-neutral-200 rounded p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em]">Registered Users</p>
                <p className="text-[28px] font-bold text-neutral-900 mt-1 tabular-nums">
                  {Object.values(usersByRole).reduce((a, b) => a + b, 0)}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {usersByRole.developer || 0} developers
                </p>
              </div>
              <Users className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-5 lg:col-span-2">
            <h3 className="text-xs font-semibold text-neutral-900 mb-4 uppercase tracking-[0.05em]">
              Store Installs (30 Days)
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={last30}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#A3A3A3' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#A3A3A3' }} allowDecimals={false} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '12px', borderColor: '#E5E5E5' }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#000000"
                    strokeWidth={2}
                    fill="#FAFAFA"
                    name="Downloads"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-semibold text-neutral-900 mb-4 uppercase tracking-[0.05em]">
              Apps Distribution
            </h3>
            {categoryData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={65}
                      innerRadius={35}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '4px', fontSize: '11px', borderColor: '#E5E5E5' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-neutral-400 text-center py-16">No apps data</p>
            )}
          </div>
        </div>

        {/* Audit Log Snippet */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-[0.05em]">
              Recent Action Audit Trail
            </h3>
            <Link
              to="/admin/actions"
              className="text-xs font-medium text-black hover:underline flex items-center gap-1"
            >
              <span>Full Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-neutral-100">
            {(d?.recentActions || []).map((action) => (
              <div key={action.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-900">
                    {action.admin_name}
                  </span>
                  <span className="badge-category text-[10px]">
                    {action.action_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-neutral-400">
                    {action.target_type} #{action.target_id}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {formatDistanceToNow(new Date(action.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
