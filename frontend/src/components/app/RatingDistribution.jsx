import { Star } from 'lucide-react';

export default function RatingDistribution({ distribution = {}, total = 0 }) {
  if (!total || total === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-4 px-6 text-center bg-neutral-50 rounded border border-neutral-200">
        <p className="text-xs font-medium text-neutral-700">
          No ratings submitted yet
        </p>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          Be the first user to download and rate this application below!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-1.5 min-w-[180px]">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = distribution[star] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right font-medium text-neutral-700">{star}</span>
            <Star className="w-3 h-3 text-amber-400 fill-current flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right text-[11px] text-neutral-400 font-medium">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
