import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import {
  Download,
  Star,
  AppWindow,
  PlusCircle,
  Bell,
  BellDot,
  CheckCheck,
  ExternalLink,
  BarChart2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Ban,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { developerApi } from '../../utils/api';
import StarRating from '../../components/ui/StarRating';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ icon: Icon, label, value, isLoading }) {
  return (
    <div className="bg-white border border-neutral-200 rounded p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-[0.05em]">{label}</p>
          {isLoading ? (
            <div className="skeleton h-7 w-20 rounded mt-1.5" />
          ) : (
            <p className="text-[28px] font-bold mt-1 text-neutral-900 tabular-nums">
              {value}
            </p>
          )}
        </div>
        <Icon className="w-5 h-5 text-neutral-300" />
      </div>
    </div>
  );
}

function AppStatusBadge({ status, notes }) {
  const configs = {
    pending: { variant: 'pending', icon: AlertCircle, label: 'Pending Review' },
    approved: { variant: 'approved', icon: CheckCircle, label: 'Live' },
    rejected: { variant: 'rejected', icon: XCircle, label: 'Rejected' },
    suspended: { variant: 'suspended', icon: Ban, label: 'Suspended' },
  };
  const cfg = configs[status] || configs.pending;

  return (
    <div className="flex items-center gap-1.5">
      <Badge variant={cfg.variant}>
        <cfg.icon className="w-3 h-3 mr-0.5" />
        <span>{cfg.label}</span>
      </Badge>
      {status === 'rejected' && notes && (
        <span title={notes} className="cursor-help text-danger">
          <AlertCircle className="w-3.5 h-3.5" />
        </span>
      )}
    </div>
  );
}

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['developer-dashboard'],
    queryFn: developerApi.dashboard,
    refetchInterval: 30000,
  });

  const markAllRead = useMutation({
    mutationFn: developerApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries(['developer-dashboard']),
  });

  const dashboard = data?.data;
  const stats = dashboard?.stats;
  const downloadChart = dashboard?.downloadChart || [];
  const recentReviews = dashboard?.recentReviews || [];
  const notifications = dashboard?.notifications || [];
  const apps = dashboard?.apps || [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];
    const found = downloadChart.find((r) => r.date === dateStr);
    return { date: dateStr.slice(5), count: found?.count || 0 };
  });

  return (
    <>
      <Helmet>
        <title>Developer Dashboard — Gastos App Store</title>
      </Helmet>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">
            Developer Workspace
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Logged in as <span className="font-medium text-neutral-700">{user?.display_name}</span> ({user?.email})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications((s) => !s)}
              className="relative p-2 rounded bg-white border border-neutral-200 hover:border-neutral-300 transition-colors"
            >
              {unreadCount > 0 ? (
                <BellDot className="w-4 h-4 text-black" />
              ) : (
                <Bell className="w-4 h-4 text-neutral-400" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] font-medium w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded shadow-modal border border-neutral-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-100">
                  <h3 className="font-medium text-xs text-neutral-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllRead.mutate()}
                      className="text-[11px] font-medium text-black hover:underline flex items-center gap-1"
                    >
                      <CheckCheck className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 text-xs ${!n.is_read ? 'bg-neutral-50' : ''}`}
                      >
                        <p className="font-medium text-neutral-900">{n.title}</p>
                        <p className="text-neutral-400 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-neutral-400 mt-1 font-mono">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Link
            to="/developer/submit"
            className="btn-primary text-xs h-9 px-4 font-medium flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit App</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Download}
          label="Total Downloads"
          value={(stats?.total_downloads || 0).toLocaleString()}
          isLoading={isLoading}
        />
        <StatCard
          icon={Star}
          label="Average Rating"
          value={stats?.avg_rating ? `${stats.avg_rating}★` : '–'}
          isLoading={isLoading}
        />
        <StatCard
          icon={Star}
          label="Total Reviews"
          value={(stats?.total_reviews || 0).toLocaleString()}
          isLoading={isLoading}
        />
        <StatCard
          icon={AppWindow}
          label="Active Apps"
          value={`${stats?.active_apps || 0} / ${stats?.total_apps || 0}`}
          isLoading={isLoading}
        />
      </div>

      {/* 30-Day Downloads Chart */}
      <div className="card p-5 mb-6">
        <h2 className="text-xs font-semibold text-neutral-900 mb-4 uppercase tracking-[0.05em]">
          Downloads Trend (Last 30 Days)
        </h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30Days}>
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
                name="Downloads"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Apps Table */}
      <div className="card overflow-hidden p-0 mb-6">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-neutral-900">
            My Applications ({apps.length})
          </h2>
          <Link
            to="/developer/submit"
            className="text-xs font-medium text-black hover:underline flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add New</span>
          </Link>
        </div>

        {apps.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={AppWindow}
              title="No apps submitted yet"
              description="Ready to distribute your Android application? Submit your first release today."
              action={
                <Link to="/developer/submit" className="btn-primary inline-flex">
                  Submit App
                </Link>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase text-[11px] font-medium tracking-[0.05em]">
                <tr>
                  <th className="text-left px-5 py-3">App</th>
                  <th className="text-left px-4 py-3">Version</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Downloads</th>
                  <th className="text-right px-4 py-3">Rating</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-normal">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={app.icon_url}
                          alt={app.name}
                          className="w-9 h-9 rounded-xl object-cover border border-neutral-200 bg-white flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900 truncate max-w-[180px]">
                            {app.name}
                          </p>
                          <p className="text-[11px] text-neutral-400">{app.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">v{app.current_version}</td>
                    <td className="px-4 py-3">
                      <AppStatusBadge status={app.status} notes={app.admin_notes} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">
                      {(app.total_downloads || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-900">
                      {app.average_rating ? `${Number(app.average_rating).toFixed(1)}★` : '–'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs font-medium">
                        {app.status === 'approved' && (
                          <Link
                            to={`/app/${app.slug}`}
                            className="text-black hover:underline"
                          >
                            Store Page
                          </Link>
                        )}
                        {app.status === 'approved' && <span className="text-neutral-200">|</span>}
                        <Link
                          to={`/developer/analytics/${app.id}`}
                          className="text-neutral-600 hover:text-neutral-900 hover:underline"
                        >
                          Analytics
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Reviews Received */}
      {recentReviews.length > 0 && (
        <div className="card p-5">
          <h2 className="text-xs font-semibold text-neutral-900 mb-3 uppercase tracking-[0.05em]">
            Recent User Feedback
          </h2>
          <div className="divide-y divide-neutral-100">
            {recentReviews.map((r) => (
              <div key={r.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">
                      {r.reviewer_name}
                    </span>
                    <StarRating rating={r.rating} size="sm" />
                    <span className="text-neutral-400">on</span>
                    <span className="font-medium text-black">{r.app_name}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                {r.body && <p className="text-neutral-500 mt-1">{r.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
