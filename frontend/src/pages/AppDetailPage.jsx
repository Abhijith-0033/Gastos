import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Star,
  HardDrive,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Globe,
  Camera,
  MapPin,
  Mic,
  Users,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
  Play,
  Search,
} from 'lucide-react';
import { appsApi } from '../utils/api';
import StarRating from '../components/ui/StarRating';
import RatingDistribution from '../components/app/RatingDistribution';
import ReviewCard from '../components/app/ReviewCard';
import ReviewForm from '../components/app/ReviewForm';
import DownloadModal from '../components/app/DownloadModal';
import AppCard from '../components/ui/AppCard';

function formatBytes(bytes) {
  if (!bytes) return '–';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}

const PERMISSION_ICONS = {
  INTERNET: Globe,
  CAMERA: Camera,
  STORAGE: HardDrive,
  READ_EXTERNAL_STORAGE: HardDrive,
  WRITE_EXTERNAL_STORAGE: HardDrive,
  LOCATION: MapPin,
  ACCESS_FINE_LOCATION: MapPin,
  MICROPHONE: Mic,
  RECORD_AUDIO: Mic,
  CONTACTS: Users,
  READ_CONTACTS: Users,
  VIBRATE: Zap,
};

function renderMarkdown(text = '') {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc pl-5 space-y-1">$1</ul>')
    .replace(/\n/g, '<br />');
}

export default function AppDetailPage() {
  const { slug } = useParams();
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['app', slug],
    queryFn: () => appsApi.detail(slug),
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ['app-reviews', slug],
    queryFn: () => appsApi.reviews(slug, { page: 1, limit: 10 }),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-6">
        <div className="skeleton h-32 w-full rounded" />
        <div className="skeleton h-64 w-full rounded" />
      </div>
    );
  }

  if (error || !data?.data?.app) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Search className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold mb-1 text-neutral-900">App Not Found</h2>
        <p className="text-neutral-400 text-xs mb-6">
          This app may have been removed, unapproved, or the link is incorrect.
        </p>
        <Link to="/" className="btn-primary inline-flex">
          Back to Store
        </Link>
      </div>
    );
  }

  const {
    app,
    screenshots = [],
    videos = [],
    permissions = [],
    currentVersion,
    ratingDistribution = {},
    moreFromDeveloper = [],
  } = data.data;

  const reviews = reviewsData?.data?.reviews || [];

  return (
    <>
      <Helmet>
        <title>{app.name} — Gastos App Store</title>
        <meta name="description" content={app.tagline || app.name} />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── APP HEADER CARD ── */}
        <div className="card p-6 sm:p-8 flex flex-col sm:flex-row items-start gap-6 sm:gap-8">
          <img
            src={app.icon_url}
            alt={app.name}
            className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl object-cover border border-neutral-200 flex-shrink-0 bg-white"
          />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="badge-category">{app.category}</span>
              <span className="badge-category">{app.content_rating}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-tight">
              {app.name}
            </h1>

            <Link
              to={`/developer/${app.developer_username}`}
              className="text-xs sm:text-sm font-medium text-primary hover:underline block mt-1"
            >
              {app.developer_name}
            </Link>

            <p className="text-xs sm:text-sm text-neutral-600 mt-2 line-clamp-2">
              {app.tagline}
            </p>

            {/* Metrics Chips */}
            <div className="flex flex-wrap items-center gap-6 mt-4 pt-4 border-t border-neutral-100 text-xs">
              <div>
                <div className="flex items-center gap-1 font-bold text-base text-neutral-900">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  <span>
                    {app.total_reviews > 0 && app.average_rating > 0
                      ? Number(app.average_rating).toFixed(1)
                      : '–'}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  {app.total_reviews > 0 ? `${formatCount(app.total_reviews)} reviews` : 'No ratings yet'}
                </span>
              </div>

              <div className="border-l border-neutral-200 pl-6">
                <div className="flex items-center gap-1 font-bold text-base text-neutral-900">
                  <Download className="w-4 h-4 text-black" />
                  <span>{formatCount(app.total_downloads)}</span>
                </div>
                <span className="text-[11px] text-neutral-400">Downloads</span>
              </div>

              <div className="border-l border-neutral-200 pl-6">
                <div className="flex items-center gap-1 font-bold text-base text-neutral-900">
                  <HardDrive className="w-4 h-4 text-neutral-400" />
                  <span>{formatBytes(app.apk_size_bytes)}</span>
                </div>
                <span className="text-[11px] text-neutral-400">v{app.current_version}</span>
              </div>
            </div>

            {/* Install Button Action */}
            <div className="mt-6">
              <button
                onClick={() => setShowDownloadModal(true)}
                className="w-full sm:w-auto btn-primary py-2.5 px-6 font-medium text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Install APK ({formatBytes(app.apk_size_bytes)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── MEDIA CAROUSEL (Screenshots + Videos) ── */}
        {(screenshots.length > 0 || videos.length > 0) && (
          <div>
            <h3 className="text-base font-semibold text-neutral-900 mb-3">
              App Preview & Screenshots
            </h3>

            <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
              {/* Promo Videos */}
              {videos.map((vid, idx) => (
                <div
                  key={`vid-${idx}`}
                  onClick={() => setActiveVideo(vid.url)}
                  className="flex-shrink-0 relative w-48 h-80 rounded overflow-hidden cursor-pointer group bg-black"
                >
                  <video
                    src={vid.url}
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow group-hover:scale-105 transition-transform">
                      <Play className="w-4 h-4 text-black ml-0.5" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Screenshots */}
              {screenshots.map((ss, idx) => (
                <div
                  key={`ss-${idx}`}
                  onClick={() => setLightboxIndex(idx)}
                  className="flex-shrink-0 h-80 w-auto rounded overflow-hidden cursor-pointer border border-neutral-200 bg-white"
                >
                  <img
                    src={ss.url}
                    alt={ss.caption || `Screenshot ${idx + 1}`}
                    className="h-full w-auto object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABOUT APP DESCRIPTION ── */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-neutral-900 mb-3">
            About this app
          </h3>
          <div
            className={`text-xs sm:text-sm leading-relaxed text-neutral-700 ${
              !isDescExpanded ? 'line-clamp-6' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(app.description) }}
          />

          {app.description?.length > 300 && (
            <button
              onClick={() => setIsDescExpanded((e) => !e)}
              className="text-xs font-medium text-primary mt-3 flex items-center gap-1 hover:underline"
            >
              {isDescExpanded ? 'Show less' : 'Read more'}
              {isDescExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* ── WHAT'S NEW ── */}
        {currentVersion?.whats_new && (
          <div className="bg-neutral-50 border border-neutral-200 rounded p-6">
            <h3 className="text-sm font-semibold text-neutral-900 mb-1.5">
              What's New in v{currentVersion.version_name}
            </h3>
            <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
              {currentVersion.whats_new}
            </p>
          </div>
        )}

        {/* ── PERMISSIONS ── */}
        {permissions.length > 0 && (
          <div className="card p-6">
            <h3 className="text-base font-semibold text-neutral-900 mb-4">
              Permissions Declared ({permissions.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {permissions.map((perm, idx) => {
                const Icon = PERMISSION_ICONS[perm.permission] || ShieldCheck;
                return (
                  <div
                    key={idx}
                    className={`p-3 rounded border flex items-start gap-3 ${
                      perm.is_dangerous
                        ? 'border-amber-200 bg-amber-50'
                        : 'border-neutral-200'
                    }`}
                  >
                    <div className="p-2 rounded bg-neutral-100 flex-shrink-0">
                      <Icon className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <p className="font-medium text-xs text-neutral-900 flex items-center gap-1.5">
                        <span>{perm.permission}</span>
                        {Boolean(perm.is_dangerous) && (
                          <span className="badge badge-yellow text-[10px] py-0">Sensitive</span>
                        )}
                      </p>
                      {perm.reason && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">{perm.reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RATINGS & REVIEWS SECTION ── */}
        <div className="card p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-semibold text-neutral-900">
            Ratings & Verified User Reviews
          </h3>

          {/* Breakdown Header */}
          <div className="flex flex-col sm:flex-row items-center gap-8 pb-6 border-b border-neutral-100">
            <div className="text-center">
              <span className="text-4xl sm:text-5xl font-bold text-neutral-900">
                {app.average_rating ? Number(app.average_rating).toFixed(1) : '–'}
              </span>
              <div className="mt-1 flex justify-center">
                <StarRating rating={app.average_rating} size="md" />
              </div>
              <span className="text-xs text-neutral-400 mt-1 block">
                {formatCount(app.total_reviews)} total ratings
              </span>
            </div>

            <RatingDistribution distribution={ratingDistribution} total={app.total_reviews} />
          </div>

          {/* Write a review form */}
          <ReviewForm appSlug={slug} onSuccess={refetchReviews} />

          {/* Reviews list */}
          <div className="space-y-3 pt-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </div>

        {/* ── MORE FROM DEVELOPER ── */}
        {moreFromDeveloper.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-neutral-900 mb-4">
              More from {app.developer_name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {moreFromDeveloper.map((a) => (
                <AppCard key={a.id} app={a} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── FULLSCREEN SCREENSHOT LIGHTBOX ── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxIndex(null)}
          >
            <button
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => Math.max(0, i - 1));
              }}
              disabled={lightboxIndex === 0}
              className="absolute left-4 text-white/80 hover:text-white p-2 disabled:opacity-30"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>

            <motion.img
              key={lightboxIndex}
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              src={screenshots[lightboxIndex]?.url}
              alt="Screenshot"
              className="max-h-[85vh] max-w-full rounded object-contain"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => Math.min(screenshots.length - 1, i + 1));
              }}
              disabled={lightboxIndex === screenshots.length - 1}
              className="absolute right-4 text-white/80 hover:text-white p-2 disabled:opacity-30"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DOWNLOAD APK MODAL ── */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        app={app}
      />
    </>
  );
}
