import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Grid, LayoutDashboard, Shield, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const { isAuthenticated, isDeveloper, isAdmin } = useAuth();
  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 sm:hidden z-40 flex items-center justify-around py-2 px-3">
      <Link
        to="/"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive('/') ? 'text-black' : 'text-neutral-400'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px] font-medium">Store</span>
      </Link>

      <Link
        to="/search"
        className={`flex flex-col items-center gap-1 transition-colors ${
          isActive('/search') ? 'text-black' : 'text-neutral-400'
        }`}
      >
        <Search className="w-5 h-5" />
        <span className="text-[10px] font-medium">Search</span>
      </Link>

      <Link
        to="/category/finance"
        className={`flex flex-col items-center gap-1 transition-colors ${
          location.pathname.startsWith('/category') ? 'text-black' : 'text-neutral-400'
        }`}
      >
        <Grid className="w-5 h-5" />
        <span className="text-[10px] font-medium">Categories</span>
      </Link>

      {isAdmin ? (
        <Link
          to="/admin"
          className={`flex flex-col items-center gap-1 transition-colors ${
            location.pathname.startsWith('/admin') ? 'text-black' : 'text-neutral-400'
          }`}
        >
          <Shield className="w-5 h-5" />
          <span className="text-[10px] font-medium">Admin</span>
        </Link>
      ) : isDeveloper ? (
        <Link
          to="/developer/dashboard"
          className={`flex flex-col items-center gap-1 transition-colors ${
            location.pathname.startsWith('/developer') ? 'text-black' : 'text-neutral-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Developer</span>
        </Link>
      ) : (
        <Link
          to="/login"
          className={`flex flex-col items-center gap-1 transition-colors ${
            isActive('/login') ? 'text-black' : 'text-neutral-400'
          }`}
        >
          <LogIn className="w-5 h-5" />
          <span className="text-[10px] font-medium">Sign In</span>
        </Link>
      )}
    </nav>
  );
}
