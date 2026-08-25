export default function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start gap-3.5">
        <div className="skeleton w-16 h-16 rounded-2xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="skeleton h-4 w-3/4" />
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton h-3 w-16 rounded-full" />
          <div className="flex items-center gap-2 pt-1">
            <div className="skeleton h-3 w-12" />
            <div className="skeleton h-3 w-14" />
          </div>
        </div>
      </div>
    </div>
  );
}
