import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, LogOut, LayoutDashboard, Shield, PlusCircle, X, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { appsApi } from '../../utils/api';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isDeveloper, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Debounced live search
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await appsApi.search(searchQuery.trim());
        setSearchResults(res.data.apps || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-5 h-5 bg-black rounded flex-shrink-0" />
            <span className="font-semibold text-base text-neutral-900 tracking-tight">
              Gastos Store
            </span>
          </Link>

          {/* Search Bar with Instant Dropdown */}
          <div ref={searchRef} className="relative flex-1 max-w-lg mx-2 hidden sm:block">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search apps, tools..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  className="input pl-9 pr-8 text-sm bg-neutral-50 border-neutral-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults(null);
                    }}
                    className="absolute right-3 text-neutral-400 hover:text-neutral-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>

            {/* Live Dropdown Results */}
            {showSearch && searchQuery.trim().length >= 2 && (
              <div className="absolute top-full mt-1.5 w-full bg-white rounded shadow-modal border border-neutral-200 z-50 overflow-hidden">
                {isSearching ? (
                  <div className="p-4 text-center text-xs text-neutral-400">Searching store...</div>
                ) : searchResults && searchResults.length > 0 ? (
                  <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
                    {searchResults.map((app) => (
                      <Link
                        key={app.id}
                        to={`/app/${app.slug}`}
                        onClick={() => setShowSearch(false)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors"
                      >
                        <img
                          src={app.icon_url}
                          alt={app.name}
                          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-neutral-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {app.name}
                          </p>
                          <p className="text-xs text-neutral-400 truncate">
                            {app.category} • {app.developer_name}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-neutral-400" />
                      </Link>
                    ))}
                    <Link
                      to={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={() => setShowSearch(false)}
                      className="block px-4 py-2.5 text-xs font-medium text-center text-black hover:bg-neutral-50 transition-colors"
                    >
                      View all results for "{searchQuery}" →
                    </Link>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-neutral-400">
                    No apps found matching "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User Account / Navigation */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu((prev) => !prev)}
                  className="flex items-center gap-2 p-1"
                >
                  <div className="w-7 h-7 rounded-full bg-black text-white font-medium text-xs flex items-center justify-center">
                    {user?.display_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded shadow-modal border border-neutral-200 z-50 overflow-hidden py-1">
                    <div className="px-4 py-2.5 border-b border-neutral-100">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {user.display_name}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">@{user.username}</p>
                    </div>

                    {isDeveloper && (
                      <Link
                        to="/developer/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <LayoutDashboard className="w-4 h-4 text-black" />
                        Developer Portal
                      </Link>
                    )}

                    {isDeveloper && (
                      <Link
                        to="/developer/submit"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                      >
                        <PlusCircle className="w-4 h-4 text-black" />
                        Submit App
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Panel
                      </Link>
                    )}

                    <div className="border-t border-neutral-100 mt-1">
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-danger hover:bg-danger-bg transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-xs h-8 px-3">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-xs h-8 px-3.5">
                  Publish App
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
