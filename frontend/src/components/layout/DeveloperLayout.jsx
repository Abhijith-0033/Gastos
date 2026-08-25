import { Outlet, NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, ChevronRight, Store } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';

export default function DeveloperLayout() {
  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 h-9 px-4 text-xs font-medium transition-colors border-l-2 ${
      isActive
        ? 'bg-neutral-100 text-black border-black'
        : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-transparent'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-surface pb-16 sm:pb-0 transition-colors">
      <Navbar />

      {/* Developer Sub-Header Breadcrumb */}
      <div className="bg-white border-b border-neutral-200 px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-400">
            <Link to="/" className="hover:text-black transition-colors">Store</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-neutral-900 font-medium">Developer Center</span>
          </div>

          <Link
            to="/"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-black hover:underline"
          >
            <Store className="w-3.5 h-3.5" />
            Browse Store
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-56 flex-shrink-0">
            <div className="bg-white border border-neutral-200 rounded py-2 sticky top-20">
              <NavLink to="/developer/dashboard" className={navLinkClass}>
                <LayoutDashboard className="w-4 h-4 text-neutral-400" />
                <span>Dashboard</span>
              </NavLink>
              <NavLink to="/developer/submit" className={navLinkClass}>
                <PlusCircle className="w-4 h-4 text-neutral-400" />
                <span>Submit New App</span>
              </NavLink>
            </div>
          </aside>

          {/* Main Workspace Area */}
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
