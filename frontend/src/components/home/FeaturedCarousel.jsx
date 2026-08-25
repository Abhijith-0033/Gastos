import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Download, Star } from 'lucide-react';

export default function FeaturedCarousel({ apps = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    if (apps.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % apps.length);
    }
  }, [apps.length]);

  const prev = () => {
    if (apps.length > 0) {
      setCurrentIndex((prev) => (prev - 1 + apps.length) % apps.length);
    }
  };

  useEffect(() => {
    if (isPaused || apps.length <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next, apps.length]);

  if (!apps || apps.length === 0) return null;
  const app = apps[currentIndex];

  const bannerSrc = app.banner_url || app.icon_url;

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-neutral-900">
          Featured
        </h2>
      </div>

      <div
        className="relative rounded overflow-hidden bg-black h-56 sm:h-72 md:h-80"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <img
              src={bannerSrc}
              alt={app.name}
              className="w-full h-full object-cover opacity-70"
            />
            {/* Flat dark overlay */}
            <div className="absolute inset-0 bg-black/75" />
          </motion.div>
        </AnimatePresence>

        {/* Content details */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 z-10">
          <div className="flex items-center gap-4">
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl object-cover border border-white/20 flex-shrink-0 bg-white"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-[0.06em] block mb-0.5">
                {app.category}
              </span>
              <h3 className="text-white text-lg sm:text-2xl font-bold truncate">
                {app.name}
              </h3>
              <p className="text-neutral-300 text-xs sm:text-sm mt-1 max-w-xl line-clamp-2">
                {app.tagline}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-neutral-300">
                <div className="flex items-center gap-1 font-medium text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>{app.average_rating ? Number(app.average_rating).toFixed(1) : 'New'}</span>
                </div>
                <span>•</span>
                <span>v{app.current_version}</span>
                <span>•</span>
                <span>{(app.total_downloads || 0).toLocaleString()} downloads</span>
              </div>
            </div>
          </div>

          <Link
            to={`/app/${app.slug}`}
            className="bg-white hover:bg-neutral-100 text-black font-medium text-xs sm:text-sm px-4 h-9 rounded flex items-center gap-2 flex-shrink-0 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Install App</span>
          </Link>
        </div>

        {/* Navigation Arrows */}
        {apps.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded bg-black/60 hover:bg-black text-white transition-colors z-20"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded bg-black/60 hover:bg-black text-white transition-colors z-20"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Dots */}
        <div className="absolute top-4 right-4 flex gap-1.5 z-20">
          {apps.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
