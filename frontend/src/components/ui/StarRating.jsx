import { useState } from 'react';

export default function StarRating({
  rating = 0,
  size = 'md',
  interactive = false,
  onRate,
  count,
  className = '',
}) {
  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-7 h-7',
  };
  const starSize = starSizes[size] || starSizes.md;
  const [hovered, setHovered] = useState(null);
  const displayRating = hovered !== null ? hovered : rating;

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayRating >= star;
        const halfFilled = !filled && displayRating >= star - 0.5;

        return (
          <button
            key={star}
            type="button"
            onClick={() => interactive && onRate?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(null)}
            className={`relative p-0.5 ${
              interactive
                ? 'cursor-pointer hover:scale-110 active:scale-95 transition-transform'
                : 'cursor-default'
            }`}
            disabled={!interactive}
          >
            {/* Background empty star */}
            <svg
              className={`${starSize} text-neutral-300 transition-colors`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>

            {/* Filled overlay */}
            {(filled || halfFilled) && (
              <svg
                className={`${starSize} text-amber-400 absolute inset-0.5 drop-shadow-sm`}
                fill="currentColor"
                viewBox="0 0 20 20"
                style={{
                  clipPath: halfFilled ? 'inset(0 50% 0 0)' : 'none',
                }}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </button>
        );
      })}
      {count !== undefined && (
        <span className="text-muted text-xs ml-1.5 font-medium">({count.toLocaleString()})</span>
      )}
    </div>
  );
}
