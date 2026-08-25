import { PackageSearch } from 'lucide-react';

export default function EmptyState({
  icon: Icon = PackageSearch,
  title = 'No results found',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon className="w-8 h-8 text-neutral-300 mb-3" />
      <h3 className="text-sm font-medium text-neutral-700">{title}</h3>
      {description && (
        <p className="text-neutral-400 text-xs mt-1 max-w-[280px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
