import { Link } from 'react-router-dom';
import { Download, Star } from 'lucide-react';

function formatCount(n) {
  if (!n || n === 0) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

export default function AppCard({ app }) {
  const iconSrc = app.icon_url?.startsWith('http')
    ? app.icon_url
    : `${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || ''}${app.icon_url || ''}`;

  return (
    <Link
      to={`/app/${app.slug}`}
      className="block bg-white border border-neutral-200 rounded overflow-hidden
                 hover:border-black hover:shadow-card transition-all duration-150 group h-full flex flex-col justify-between"
    >
      {/* Top section: icon + name */}
      <div className="flex items-start gap-3 p-4">
        <img
          src={iconSrc || '/placeholder-icon.png'}
          alt={`${app.name} icon`}
          className="w-[52px] h-[52px] rounded-xl object-cover flex-shrink-0 border border-neutral-200 bg-neutral-50"
          onError={(e) => {
            e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="%23000000" stroke-width="2"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="m10 15 5-3-5-3v6Z"/></svg>';
          }}
        />
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-semibold text-sm text-neutral-900 truncate group-hover:text-black transition-colors">
            {app.name}
          </h3>
          <p className="text-xs text-neutral-500 truncate mt-0.5">{app.developer_name}</p>
          <p className="text-[11px] text-neutral-400 uppercase tracking-[0.04em] mt-1 font-medium">
            {app.category}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-neutral-100" />

      {/* Bottom section: rating + downloads */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span className="text-xs font-medium text-neutral-900">
            {app.total_reviews > 0 && app.average_rating > 0
              ? Number(app.average_rating).toFixed(1)
              : <span className="text-[11px] text-neutral-600 uppercase font-medium tracking-[0.04em]">New</span>}
          </span>
          {app.total_reviews > 0 && (
            <span className="text-[11px] text-neutral-400">({formatCount(app.total_reviews)})</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <Download className="w-3.5 h-3.5" />
          <span className="text-xs">{formatCount(app.total_downloads)}</span>
        </div>
      </div>
    </Link>
  );
}
