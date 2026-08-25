const variants = {
  // Status badges — 4 states + info
  approved:  'bg-green-50 text-green-700 border border-green-200',
  pending:   'bg-amber-50 text-amber-700 border border-amber-200',
  rejected:  'bg-red-50 text-red-700 border border-red-200',
  suspended: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  info:      'bg-neutral-100 text-neutral-700 border border-neutral-200',
  // Legacy aliases (mapped to semantic)
  blue:      'bg-neutral-100 text-neutral-700 border border-neutral-200',
  green:     'bg-green-50 text-green-700 border border-green-200',
  red:       'bg-red-50 text-red-700 border border-red-200',
  yellow:    'bg-amber-50 text-amber-700 border border-amber-200',
  purple:    'bg-neutral-100 text-neutral-600 border border-neutral-200',
  gray:      'bg-neutral-100 text-neutral-600 border border-neutral-200',
};

export default function Badge({ children, variant = 'gray', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium tracking-[0.02em] ${
        variants[variant] || variants.gray
      } ${className}`}
    >
      {children}
    </span>
  );
}
