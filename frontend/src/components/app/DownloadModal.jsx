import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronDown, ChevronUp, CheckCircle, Smartphone, ShieldCheck, HardDrive } from 'lucide-react';
import { appsApi } from '../../utils/api';

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

export default function DownloadModal({ isOpen, onClose, app }) {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setDownloadStarted(false);
      setShowAndroidGuide(false);
    }
  }, [isOpen]);

  const handleStartDownload = () => {
    // Trigger real browser file download
    const downloadUrl = appsApi.downloadUrl(app.slug);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${app.name.replace(/\s+/g, '_')}_v${app.current_version}.apk`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadStarted(true);
  };

  if (!isOpen || !app) return null;

  const directDownloadUrl = appsApi.downloadUrl(app.slug);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          className="relative bg-white w-full max-w-md rounded-lg shadow-modal z-10 overflow-hidden border border-neutral-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 flex items-center gap-3 bg-neutral-50">
            <img
              src={app.icon_url}
              alt={app.name}
              className="w-12 h-12 rounded-xl object-cover border border-neutral-200 flex-shrink-0 bg-white"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-neutral-900 truncate">
                {app.name}
              </h3>
              <p className="text-xs text-neutral-400 flex items-center gap-2 mt-0.5">
                <span>v{app.current_version}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  {formatBytes(app.apk_size_bytes)}
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Download Button Action */}
            {!downloadStarted ? (
              <button
                onClick={handleStartDownload}
                className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Start APK Download ({formatBytes(app.apk_size_bytes)})</span>
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded p-3.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <p className="font-medium text-xs text-green-900">
                    Download has started in your browser!
                  </p>
                </div>
                <p className="text-xs text-green-700">
                  Check your browser downloads bar or device notification panel.
                </p>
                <div className="pt-1 text-[11px]">
                  <span className="text-neutral-500">Didn't start automatically? </span>
                  <a
                    href={directDownloadUrl}
                    download
                    className="text-black font-medium hover:underline"
                  >
                    Click here to download directly
                  </a>
                </div>
              </div>
            )}

            {/* Step-by-step Installation Instructions */}
            <div className="border-t border-neutral-100 pt-4">
              <h4 className="text-[11px] font-medium uppercase tracking-[0.05em] text-neutral-400 mb-3 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                How to install on Android
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 font-medium flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">
                      Allow installation from browser
                    </p>
                    <p className="text-neutral-500 mt-0.5 leading-relaxed">
                      Android requires permission to install apps outside Google Play.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAndroidGuide((g) => !g)}
                      className="text-black font-medium text-[11px] mt-1 flex items-center gap-0.5 hover:underline"
                    >
                      {showAndroidGuide ? 'Hide instructions' : 'See step-by-step instructions'}
                      {showAndroidGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showAndroidGuide && (
                      <div className="mt-2 p-2.5 rounded bg-neutral-50 space-y-1 text-[11px] text-neutral-600">
                        <p><strong>Android 8.0 & newer:</strong> When prompted, tap "Settings" → enable "Allow from this source".</p>
                        <p><strong>Android 7.0 & older:</strong> Go to Settings → Security → enable "Unknown sources".</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-neutral-100 text-neutral-600 font-medium flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">
                      Open and Tap Install
                    </p>
                    <p className="text-neutral-500 mt-0.5 leading-relaxed">
                      Tap the downloaded APK from your notification bar and confirm "Install".
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Guarantee Pill */}
            <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-neutral-600 bg-neutral-50 py-2 rounded border border-neutral-200">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span>Verified & Scanned by Gastos App Store</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
