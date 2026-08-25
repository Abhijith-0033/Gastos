import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function HeroSection() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="bg-white border-b border-neutral-200 py-12 sm:py-16 mb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[580px]">
          {/* Pre-heading */}
          <p className="text-[12px] font-medium text-black uppercase tracking-[0.08em] mb-2.5">
            ANDROID APP STORE
          </p>

          {/* Main heading */}
          <h1 className="text-3xl sm:text-[36px] font-bold text-neutral-900 leading-tight mb-3">
            Quality Android Apps,<br />
            Carefully Reviewed.
          </h1>

          {/* Sub-heading */}
          <p className="text-neutral-500 text-sm sm:text-base leading-relaxed mb-6 max-w-[440px]">
            Explore carefully tested, offline-first personal finance, productivity, and utility applications.
            No bloatware. No hidden trackers.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-[480px]">
            <div className="flex items-center h-11 bg-neutral-50 border border-neutral-200 rounded focus-within:border-black focus-within:ring-1 focus-within:ring-black transition-all">
              <Search className="w-4 h-4 text-neutral-400 ml-3 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search apps..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-neutral-900 placeholder-neutral-400 text-sm focus:outline-none px-3"
              />
              <button
                type="submit"
                className="bg-black hover:bg-neutral-800 text-white text-xs font-medium h-[33px] px-4 rounded mr-1 transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Stats row */}
          <p className="text-xs text-neutral-400 mt-4">
            Verified apps · Direct APK downloads · Editorial review
          </p>
        </div>
      </div>
    </section>
  );
}
