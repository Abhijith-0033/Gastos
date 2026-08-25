import { Outlet, NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../utils/api';
import {
  LayoutDashboard,
  AppWindow,
  Clock,
  GitBranch,
  Users,
  Star,
  Download,
  Settings,
  Activity,
  Shield,
} from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

export default function AdminLayout() {
  const { data: pendingData } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => adminApi.pendingApps(),
    refetchInterval: 30000,
  });
  const pendingCount = pendingData?.data?.apps?.length || 0;

  const navLinkClass = ({ isActive }) =>
    `flex items-center justify-between h-9 px-4 text-xs font-medium transition-colors border-l-2 ${
      isActive
        ? 'bg-neutral-100 text-black border-black'
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-transparent'
    }`;

  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/apps/pending', label: 'Pending Apps', icon: Clock, badge: pendingCount },
    { to: '/admin/apps', label: 'All Apps', icon: AppWindow },
    { to: '/admin/versions/pending', label: 'Pending Versions', icon: GitBranch },
    { to: '/admin/users', label: 'User Directory', icon: Users },
    { to: '/admin/reviews', label: 'Reviews Moderation', icon: Star },
    { to: '/admin/downloads', label: 'Download Analytics', icon: Download },
    { to: '/admin/settings', label: 'Store Settings', icon: Settings },
    { to: '/admin/actions', label: 'Audit Action Log', icon: Activity },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-surface pb-16 sm:pb-0 transition-colors">
      {/* Top Security Banner */}
      <div className="bg-slate-900 text-white text-center text-[11px] py-1 font-medium tracking-[0.06em] uppercase flex items-center justify-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-neutral-400" />
        ADMINISTRATION PORTAL — RESTRICTED ACCESS
      </div>

      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Admin Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <div className="bg-white border border-neutral-200 rounded py-2 sticky top-20">
              <div className="px-4 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-neutral-400 border-b border-neutral-100 mb-1">
                Store Management
              </div>
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                  <span className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-neutral-400" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge > 0 && (
                    <span className="bg-black text-white text-[10px] font-medium rounded-full px-1.5 min-w-[18px] h-[18px] flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
