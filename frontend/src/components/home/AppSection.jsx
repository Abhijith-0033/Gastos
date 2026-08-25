import { Link } from 'react-router-dom';
import { Star, Download } from 'lucide-react';
import SkeletonCard from '../ui/SkeletonCard';

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

export default function AppSection({
  title,
  subtitle,
  apps = [],
  isLoading = false,
  showRank = false,
  badgeText = null,
}) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            {title}
          </h2>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      <div className="flex gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-44">
                <SkeletonCard />
              </div>
            ))
          : apps.map((app, i) => (
              <div
                key={app.id}
                className="flex-shrink-0 w-40 sm:w-44"
              >
                <Link to={`/app/${app.slug}`} className="block group">
                  <div className="relative">
                    {showRank && (
                      <div className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-black text-white text-[10px] font-semibold rounded-full flex items-center justify-center z-10">
                        {i + 1}
                      </div>
                    )}
                    {badgeText && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="bg-neutral-100 text-neutral-700 text-[10px] font-medium px-1.5 py-0.5 rounded">
                          {badgeText}
                        </span>
                      </div>
                    )}
                    <img
                      src={app.icon_url}
                      alt={app.name}
                      className="w-full aspect-square rounded-xl object-cover border border-neutral-200 bg-white"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23000000" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="m10 15 5-3-5-3v6Z"/></svg>';
                      }}
                    />
                  </div>
                  <div className="mt-2 px-0.5">
                    <p className="font-medium text-xs text-neutral-900 truncate group-hover:text-black transition-colors">
                      {app.name}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate mt-0.5">{app.developer_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                      <div className="flex items-center gap-1 font-medium text-neutral-700">
                        <Star className="w-3 h-3 text-amber-400 fill-current" />
                        <span>{app.average_rating ? Number(app.average_rating).toFixed(1) : 'New'}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1 text-[11px]">
                        <Download className="w-3 h-3" />
                        <span>{formatCount(app.total_downloads)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
      </div>
    </div>
  );
}
